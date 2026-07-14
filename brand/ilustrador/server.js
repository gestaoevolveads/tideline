#!/usr/bin/env node
// Estúdio de Ilustração do Tideline — servidor local.
// A chave da fal fica AQUI, no processo. O navegador nunca vê a chave.
//   node brand/ilustrador/server.js   ->   http://localhost:4270
//
// Chaves (nesta ordem): variável de ambiente, depois arquivo no home.
//   FAL_KEY        ou  ~/.fal_key         (obrigatória)
//   ANTHROPIC_API_KEY ou ~/.anthropic_key (opcional, liga o Diretor de Arte)

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { montarPrompt, VARIANTES, FORMATOS } = require('./estilo');
const { TEMPLATES, paginaCompleta } = require('./revista');
const POSTS = require('./posts');

const DIR = __dirname;
const REFS = path.join(DIR, 'refs');
const SAIDAS = path.join(DIR, 'saidas');
const PORTA = 4270;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Cada motor fala um dialeto diferente: o Gemini pede proporção e gera lote;
// o FLUX.2 pede pixels e gera uma imagem por chamada (mandamos em paralelo).
const MOTORES = {
  gemini: {
    url: 'https://fal.run/fal-ai/nano-banana/edit',
    nome: 'Gemini (Nano Banana)',
    desc: 'Desenhou o e-book. É o que mais respeita o traço da referência. Carimba marca d\'água, que a gente apaga.',
    lote: true,
    marca: true,
    corpo: (prompt, imagens, f, n) => ({ prompt, image_urls: imagens, num_images: n, output_format: 'png', aspect_ratio: f.ar }),
  },
  flux: {
    url: 'https://fal.run/fal-ai/flux-2-pro/edit',
    nome: 'FLUX.2 Pro',
    desc: 'O FLUX mais moderno com referência. Sai no tamanho exato e sem marca d\'água. Traço um pouco mais limpo.',
    lote: false,
    marca: false,
    corpo: (prompt, imagens, f) => ({ prompt, image_urls: imagens, output_format: 'png', image_size: { width: f.w, height: f.h } }),
  },
};

function lerChave(env, arquivo) {
  // Não basta dar trim: colar a chave no Terminal costuma grudar caracteres invisíveis
  // (o ESC do bracketed paste, por exemplo). O header HTTP não aceita isso e a API
  // devolve "invalid x-api-key header", que não diz nada sobre a causa real.
  const limpar = (s) => s.replace(/[^\x21-\x7e]/g, '');
  if (process.env[env]) return limpar(process.env[env]) || null;
  const p = path.join(os.homedir(), arquivo);
  try { return limpar(fs.readFileSync(p, 'utf8')) || null; } catch { return null; }
}
const FAL_KEY = lerChave('FAL_KEY', '.fal_key');
const CLAUDE_KEY = lerChave('ANTHROPIC_API_KEY', '.anthropic_key');

if (!FAL_KEY) {
  console.error('\n  Falta a chave da fal.ai.\n  Rode:  echo "SUA_CHAVE" > ~/.fal_key && chmod 600 ~/.fal_key\n');
  process.exit(1);
}

// ---------- referências: reduzidas uma vez, guardadas em memória ----------
const cacheRef = new Map();
// Uma referência pode vir da pasta refs/ (as canônicas) ou de saidas/ (um desenho que
// você acabou de gerar e gostou). Procura nas duas.
function acharRef(arquivo) {
  const a = path.join(REFS, path.basename(arquivo));
  if (fs.existsSync(a)) return a;
  const b = path.join(SAIDAS, path.basename(arquivo));
  if (fs.existsSync(b)) return b;
  return null;
}
function refDataUri(origem) {
  const arquivo = path.basename(origem);
  if (cacheRef.has(origem)) return cacheRef.get(origem);
  const tmp = path.join(os.tmpdir(), 'tl-ref-' + arquivo.replace(/\W/g, '') + '.png');
  try { execFileSync('sips', ['-Z', '1024', origem, '--out', tmp], { stdio: 'ignore' }); } catch { fs.copyFileSync(origem, tmp); }
  const uri = 'data:image/png;base64,' + fs.readFileSync(tmp).toString('base64');
  cacheRef.set(origem, uri);
  return uri;
}

// ---------- corte exato no tamanho pedido (escala e depois recorta pelo centro) ----------
// Sem margem: o carimbo do Gemini fica uns 8% PARA DENTRO da imagem, então cortar não
// resolveria sem estragar o enquadramento. Quem apaga o carimbo é o limpar-marca.py,
// que reconstrói o fundo por baixo dele antes deste enquadramento acontecer.
const MARGEM = 1.0;
function enquadrar(arquivo, largura, altura) {
  try {
    const dims = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', arquivo], { encoding: 'utf8' });
    const w = +dims.match(/pixelWidth:\s*(\d+)/)[1];
    const h = +dims.match(/pixelHeight:\s*(\d+)/)[1];
    const escala = Math.max(largura / w, altura / h) * MARGEM;
    execFileSync('sips', ['-z', String(Math.ceil(h * escala)), String(Math.ceil(w * escala)), arquivo], { stdio: 'ignore' });
    execFileSync('sips', ['-c', String(altura), String(largura), arquivo], { stdio: 'ignore' });
  } catch (e) { console.warn('  (não consegui enquadrar, saiu no tamanho do modelo)'); }
}

// ---------- marca d'água ----------
// O Nano Banana (Gemini) carimba uma estrelinha em tudo que gera. Se não apagarmos aqui,
// ela vai parar nos posts. Já aconteceu: duas ilustrações do e-book saíram carimbadas.
function limparMarca(arquivo) {
  try { execFileSync('python3', [path.join(DIR, 'limpar-marca.py'), arquivo], { stdio: 'ignore' }); }
  catch (e) { console.warn("  (não consegui apagar a marca d'água, confira o canto de baixo à direita)"); }
}

// ---------- fal ----------
async function chamarFal(motor, corpo) {
  const r = await fetch(MOTORES[motor].url, {
    method: 'POST',
    headers: { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`fal ${r.status}: ${txt.slice(0, 400)}`);
  return JSON.parse(txt);
}

// ---------- Diretor de Arte (Claude transforma uma ideia crua em cena desenhável) ----------
async function dirigir(ideia) {
  if (!CLAUDE_KEY) throw new Error('sem chave da Anthropic');
  const sistema = `Você é diretor de arte do Tideline, app brasileiro de previsão de ondas. Recebe uma ideia crua e devolve UMA cena desenhável, em inglês, para um cartum de surf anos 70 (estilo Rick Griffin).
Regras: uma única ação; um único personagem quando possível; postura e enquadramento descritos com precisão; nada de texto, letra ou placa na cena; nada de cenário lotado; o laranja aparece em no máximo dois elementos.
Responda SÓ com a descrição da cena, sem aspas, sem introdução, no máximo 60 palavras.`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': CLAUDE_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-opus-4-8', max_tokens: 300, system: sistema, messages: [{ role: 'user', content: ideia }] }),
  });
  if (!r.ok) throw new Error('anthropic ' + r.status + ': ' + (await r.text()).slice(0, 200));
  const j = await r.json();
  return j.content[0].text.trim();
}

// ---------- rotas ----------
function json(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
}
function corpo(req) {
  return new Promise((ok, err) => {
    let b = ''; req.on('data', c => { b += c; if (b.length > 30e6) req.destroy(); });
    req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { err(e); } });
  });
}

const servidor = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const rota = u.pathname;

  try {
    // ---------- Filme analógico ----------
    // Recebe uma foto e devolve a MESMA foto com a cara de filme. Nada de IA: a imagem
    // continua sendo a sua, com as pessoas e o lugar reais. Quem trabalha aqui é o
    // filme.py, que faz o que um colorista faz na mesa (curva, grão, halação, vinheta).
    if (rota === '/api/filme' && req.method === 'POST') {
      const b = await corpo(req);
      if (!b.foto) return json(res, 400, { erro: 'sem foto' });
      const bin = Buffer.from(String(b.foto).split(',')[1] || '', 'base64');
      if (!bin.length) return json(res, 400, { erro: 'foto ilegível' });

      const entrada = path.join(os.tmpdir(), 'tl-film-in-' + Date.now() + '.jpg');
      const nome = `filme_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}_${b.preset || 'somos'}.jpg`;
      const saida = path.join(SAIDAS, nome);
      fs.writeFileSync(entrada, bin);
      try {
        execFileSync('python3', [path.join(DIR, 'filme.py'), entrada, saida, b.preset || 'somos'], { stdio: 'pipe' });
      } catch (e) {
        return json(res, 500, { erro: 'o filtro falhou: ' + String(e.stderr || e.message).slice(0, 160) });
      } finally { try { fs.unlinkSync(entrada); } catch (_) {} }

      return json(res, 200, {
        arquivo: nome,
        foto: 'data:image/jpeg;base64,' + fs.readFileSync(saida).toString('base64'),
      });
    }

    if (rota === '/api/filme/presets') {
      // Pergunta ao proprio Python. Ler o arquivo com regex era fragil e voltou lista
      // vazia: quem sabe quais receitas existem e o filme.py, nao um padrao de texto.
      try {
        const saida = execFileSync('python3', ['-c',
          'import sys,json; sys.path.insert(0,"' + DIR + '"); import filme; ' +
          'print(json.dumps([{"id":k,"nome":v["nome"]} for k,v in filme.PRESETS.items()]))',
        ], { encoding: 'utf8' });
        return json(res, 200, { presets: JSON.parse(saida) });
      } catch (e) {
        return json(res, 500, { erro: 'nao consegui ler as receitas: ' + String(e.message).slice(0, 120) });
      }
    }

    // ---------- Posts e capas de carrossel ----------
    if (rota === '/posts' || rota === '/posts.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(DIR, 'ui-posts.html')));
    }

    if (rota === '/api/posts/templates') {
      return json(res, 200, {
        templates: Object.entries(POSTS.TEMPLATES).map(([id, t]) => ({
          id, nome: t.nome, desc: t.desc, ref: t.ref,
          campos: t.campos, chamadas: t.chamadas, padrao: t.padrao,
        })),
        fundos: fs.readdirSync(SAIDAS).filter(f => /\.(png|jpe?g)$/i.test(f)).slice(-24).reverse(),
      });
    }

    if (rota === '/api/posts/preview' && req.method === 'POST') {
      const b = await corpo(req);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(POSTS.paginaCompleta(b.template, b.dados || {}));
    }

    if (rota === '/api/posts/exportar' && req.method === 'POST') {
      const b = await corpo(req);
      const html = POSTS.paginaCompleta(b.template, b.dados || {});
      const tmpHtml = path.join(os.tmpdir(), 'tl-post-' + Date.now() + '.html');
      fs.writeFileSync(tmpHtml, html);
      const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const slug = (b.nome || 'post').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'post';
      const nome = `post_${stamp}_${slug}.png`;
      const destino = path.join(SAIDAS, nome);
      execFileSync(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars',
        '--window-size=1080,1350', `--screenshot=${destino}`,
        '--virtual-time-budget=9000', 'file://' + tmpHtml], { stdio: 'ignore' });
      fs.unlinkSync(tmpHtml);
      if (!fs.existsSync(destino)) return json(res, 500, { erro: 'não consegui renderizar o post' });
      return json(res, 200, { arquivo: nome });
    }

    // ---------- Capas de revista ----------
    if (rota === '/revista' || rota === '/revista.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(DIR, 'ui-revista.html')));
    }

    // a foto padrão: a mesma do banner da landing. A capa nunca nasce vazia.
    if (rota === '/fundo-padrao') {
      const ebook = fs.readFileSync(path.join(DIR, '..', '..', 'ebook', 'ler-o-mar.html'), 'utf8');
      const m = ebook.match(/\.capa \.bg\{[\s\S]*?url\(data:image\/jpeg;base64,([^)]+)\)/);
      if (!m) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': 'image/jpeg' });
      return res.end(Buffer.from(m[1], 'base64'));
    }

    if (rota === '/api/revista/templates') {
      return json(res, 200, {
        templates: Object.entries(TEMPLATES).map(([id, t]) => ({
          id, nome: t.nome, desc: t.desc, ref: t.ref,
          campos: t.campos, chamadas: t.chamadas, padrao: t.padrao,
        })),
        fundos: fs.readdirSync(SAIDAS).filter(f => /\.png$/i.test(f)).slice(-24).reverse(),
      });
    }

    // a mesma função desenha a prévia e o PNG final: o que você vê é o que sai
    if (rota === '/api/revista/preview' && req.method === 'POST') {
      const b = await corpo(req);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(paginaCompleta(b.template, b.dados || {}));
    }

    if (rota === '/api/revista/exportar' && req.method === 'POST') {
      const b = await corpo(req);
      const html = paginaCompleta(b.template, b.dados || {});
      const tmpHtml = path.join(os.tmpdir(), 'tl-capa-' + Date.now() + '.html');
      fs.writeFileSync(tmpHtml, html);

      const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const slug = (b.nome || 'capa').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'capa';
      const nome = `revista_${stamp}_${slug}.png`;
      const destino = path.join(SAIDAS, nome);

      execFileSync(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars',
        '--window-size=1080,1350', `--screenshot=${destino}`,
        '--virtual-time-budget=9000', 'file://' + tmpHtml], { stdio: 'ignore' });
      fs.unlinkSync(tmpHtml);

      if (!fs.existsSync(destino)) return json(res, 500, { erro: 'não consegui renderizar a capa' });
      return json(res, 200, { arquivo: nome });
    }

    if (rota === '/' || rota === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(DIR, 'ui.html')));
    }

    if (rota === '/api/config') {
      return json(res, 200, {
        variantes: Object.entries(VARIANTES).map(([id, v]) => ({ id, nome: v.nome, desc: v.desc, refs: v.refs })),
        formatos: Object.entries(FORMATOS).map(([id, f]) => ({ id, ...f })),
        motores: Object.entries(MOTORES).map(([id, m]) => ({ id, nome: m.nome, desc: m.desc })),
        refs: fs.readdirSync(REFS).filter(f => /\.(png|jpe?g)$/i.test(f)).sort(),
        diretor: !!CLAUDE_KEY,
      });
    }

    if (rota.startsWith('/refs/') || rota.startsWith('/saidas/')) {
      const base = rota.startsWith('/refs/') ? REFS : SAIDAS;
      const f = path.join(base, path.basename(decodeURIComponent(rota)));
      if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': f.endsWith('.jpg') ? 'image/jpeg' : 'image/png', 'cache-control': 'no-cache' });
      return res.end(fs.readFileSync(f));
    }

    if (rota === '/api/galeria') {
      // A galeria só LÊ arquivos que já existem no disco. Abrir, rolar e baixar não custa
      // nada: crédito só sai quando você manda desenhar.
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);

      const fotos = fs.readdirSync(SAIDAS).filter(f => /\.png$/i.test(f))
        .map(f => {
          const t = fs.statSync(path.join(SAIDAS, f)).mtimeMs;
          const d = new Date(t);
          const quando = d >= hoje ? 'Hoje' : d >= ontem ? 'Ontem'
            : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
          // o nome do arquivo já diz o que a imagem é: revista_data_titulo ou data_cena
          const tipo = f.startsWith('revista_') ? 'capa' : 'ilustracao';
          const partes = f.replace(/\.png$/, '').split('_');
          const rotulo = (partes.slice(2).join(' ') || partes.slice(-1)[0] || '')
            .replace(/-/g, ' ').replace(/\s+\d+$/, '').trim();
          return { f, t, tipo, quando, rotulo };
        })
        .sort((a, b) => b.t - a.t)
        .slice(0, 120);
      return json(res, 200, { fotos });
    }

    if (rota === '/api/diretor' && req.method === 'POST') {
      const b = await corpo(req);
      return json(res, 200, { cena: await dirigir(b.ideia || '') });
    }

    if (rota === '/api/gerar' && req.method === 'POST') {
      const b = await corpo(req);
      const variante = VARIANTES[b.variante] ? b.variante : 'clara';
      const formato = FORMATOS[b.formato] ? b.formato : 'quadrado';
      const motor = MOTORES[b.motor] ? b.motor : 'gemini';
      const n = Math.min(Math.max(+b.n || 4, 1), 6);
      const cena = (b.cena || '').trim();
      if (!cena) return json(res, 400, { erro: 'Descreva a cena.' });

      // referências: as escolhidas na tela, ou as canônicas da variante
      const escolhidas = (b.refs && b.refs.length ? b.refs : VARIANTES[variante].refs)
        .map(acharRef).filter(Boolean).slice(0, 4);
      const imagens = escolhidas.map(refDataUri);
      if (b.croqui) imagens.push(b.croqui); // croqui SEMPRE por último: o prompt diz "a última imagem é o diagrama"

      const prompt = montarPrompt(cena, { variante, comCena: !!b.croqui });
      const f = FORMATOS[formato];

      console.log(`\n  gerando ${n}x  [${motor}/${variante}/${f.w}x${f.h}]  refs: ${escolhidas.length}${b.croqui ? ' + croqui' : ''}`);
      const t0 = Date.now();
      const M = MOTORES[motor];

      let lista;
      if (M.lote) {
        const r = await chamarFal(motor, M.corpo(prompt, imagens, f, n));
        lista = r.images || (r.image ? [r.image] : []);
      } else {
        // um pedido por versão, todos ao mesmo tempo: leva o tempo de um só
        const rs = await Promise.all(Array.from({ length: n }, () => chamarFal(motor, M.corpo(prompt, imagens, f, n))));
        lista = rs.flatMap(r => r.images || (r.image ? [r.image] : []));
      }

      const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const slug = (b.nome || cena).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 34) || 'cena';
      const saidas = [];
      for (let i = 0; i < lista.length; i++) {
        const bin = Buffer.from(await (await fetch(lista[i].url)).arrayBuffer());
        const nome = `${stamp}_${slug}_${i + 1}.png`;
        const dest = path.join(SAIDAS, nome);
        fs.writeFileSync(dest, bin);
        if (M.marca) limparMarca(dest);
        enquadrar(dest, f.w, f.h);
        saidas.push(nome);
      }
      console.log(`  pronto em ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${saidas.join(', ')}`);
      return json(res, 200, { imagens: saidas, prompt, tamanho: `${f.w}x${f.h}` });
    }

    res.writeHead(404); res.end();
  } catch (e) {
    console.error('  erro:', e.message);
    json(res, 500, { erro: e.message });
  }
});

fs.mkdirSync(SAIDAS, { recursive: true });
servidor.listen(PORTA, () => {
  console.log(`\n  Estúdio Tideline no ar:  http://localhost:${PORTA}`);
  console.log(`  Referências: ${fs.readdirSync(REFS).length}   Diretor de Arte: ${CLAUDE_KEY ? 'ligado' : 'desligado (sem chave da Anthropic)'}`);
  console.log(`  As imagens caem em brand/ilustrador/saidas/\n`);
});
