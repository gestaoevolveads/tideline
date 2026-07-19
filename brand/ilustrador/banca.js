/* ── BANCA DE NOTÍCIAS ─────────────────────────────────────────────────────────
   Vigia o feed de notícias do app Tideline e transforma cada notícia nova em
   capas de revista (todos os templates, NUNCA em preto e branco), organizadas
   em saidas/banca/<data>-<slug>/, uma pasta por notícia.

   Regras do Hudson (jul/2026), INEGOCIÁVEIS:
   - A foto vem do SITE ORIGINAL da notícia (og:image, a imagem que o próprio
     veículo escolheu como oficial). Nada de foto aleatória.
   - Nenhuma notícia inventada: todo texto na capa vem do feed (título, resumo,
     fonte, data), na íntegra. Zero criação.
   - Nenhum texto padrão de marketing vaza pra capa ("grátis no app", "guia"):
     TODO campo de cada template é sobrescrito aqui.
   - Contraste garantido (o banca-foto.py escurece fundo claro) e crop focal
     (não decapita rosto).
   - Visual de revista de surf anos 2000, não capa de fofoca.
   - Quando gera capa nova, o Hudson é NOTIFICADO (notificação do macOS). */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile, execFileSync } = require('child_process');

const { TEMPLATES, paginaCompleta } = require('./revista');

const DIR = __dirname;
const REPO = path.resolve(DIR, '..', '..');
function lerChaveAnthropic() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY.trim();
  try { return fs.readFileSync(path.join(os.homedir(), '.anthropic_key'), 'utf8').trim(); }
  catch { return null; }
}
const CLAUDE_KEY = lerChaveAnthropic();
const SAIDAS_BANCA = path.join(DIR, 'saidas', 'banca');
const ESTADO = path.join(SAIDAS_BANCA, 'estado.json');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

fs.mkdirSync(SAIDAS_BANCA, { recursive: true });

/* ── estado: quais notícias já viraram capa (chave = URL) ── */
function lerEstado() {
  try { return JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch { return { feitas: {} }; }
}
function salvarEstado(e) { fs.writeFileSync(ESTADO, JSON.stringify(e, null, 2)); }

/* ── o feed: busca a versão mais recente do repositório (o robô do GitHub
      atualiza o feed na nuvem; aqui a gente puxa sem tocar na árvore local) ── */
function lerFeed(cb) {
  execFile('git', ['-C', REPO, 'fetch', 'origin', 'main', '--quiet'], { timeout: 30000 }, () => {
    // mesmo se o fetch falhar (sem internet), tenta o que houver
    execFile('git', ['-C', REPO, 'show', 'origin/main:demo/feed.json'], { timeout: 10000 },
      (err, stdout) => {
        if (!err) { try { return cb(null, JSON.parse(stdout)); } catch (e) { /* cai no local */ } }
        try { cb(null, JSON.parse(fs.readFileSync(path.join(REPO, 'demo/feed.json'), 'utf8'))); }
        catch (e2) { cb(e2); }
      });
  });
}

/* ── GET com redirect, timeout e UA de navegador ── */
function baixar(url, limite = 6) {
  return new Promise((resolve, reject) => {
    if (limite <= 0) return reject(new Error('redirects demais'));
    let mod;
    try { mod = url.startsWith('https') ? require('https') : require('http'); }
    catch (e) { return reject(e); }
    const req = mod.get(url, { headers: { 'user-agent': UA, accept: '*/*' }, timeout: 25000 }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        r.resume();
        return resolve(baixar(new URL(r.headers.location, url).href, limite - 1));
      }
      if (r.statusCode !== 200) { r.resume(); return reject(new Error('HTTP ' + r.statusCode)); }
      const pedacos = [];
      r.on('data', (d) => pedacos.push(d));
      r.on('end', () => resolve(Buffer.concat(pedacos)));
    });
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.on('error', reject);
  });
}

/* ── acha a foto oficial da notícia no HTML do veículo ── */
function acharFoto(html, baseUrl) {
  const candidatas = [];
  const meta = (re) => { const m = html.match(re); return m ? m[1] : null; };
  const og = meta(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i)
        || meta(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i);
  if (og) candidatas.push(og);
  const tw = meta(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (tw) candidatas.push(tw);
  // fallback: imagens grandes do corpo (evitando logo/ícone/avatar)
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    const src = m[1];
    if (/logo|icon|sprite|avatar|banner-?ad|\.svg|\.gif|pixel|badge/i.test(src)) continue;
    candidatas.push(src);
    if (candidatas.length > 8) break;
  }
  return candidatas.map((c) => { try { return new URL(c, baseUrl).href; } catch { return null; } })
    .filter(Boolean);
}

/* ── o crivo do Diretor de Arte: a foto respeita a notícia? ─────────────────
   Duas perguntas que a máquina sozinha não responde: (1) é FOTO jornalística
   de verdade, e não cartaz/flyer/logo/arte cheia de texto? (2) combina com
   esta manchete? Capa com foto errada é pior que capa nenhuma (regra do
   Hudson), então reprovou tudo = não gera e avisa. Usa Haiku (centavos). */
async function diretorAprova(fotoPath, noticia, log) {
  if (!CLAUDE_KEY) { log('  (Diretor sem chave: aceitando a foto oficial sem crivo)'); return { aprovada: true, motivo: 'sem diretor' }; }
  const mini = fotoPath + '.mini.jpg';
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', fotoPath,
    '-vf', 'scale=640:-2', '-q:v', '5', mini], { timeout: 30000 });
  const b64 = fs.readFileSync(mini).toString('base64');
  fs.unlinkSync(mini);
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': CLAUDE_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001', max_tokens: 200,
      system: 'Você avalia se uma imagem serve de FUNDO pra capa de revista de surf de uma notícia. Responda SÓ um JSON: {"aprovada": true|false, "motivo": "curto"}. REPROVE se: for cartaz/flyer/arte de divulgação com texto embutido; for logo, print de tela, gráfico ou montagem; não tiver relação com a manchete. APROVE apenas fotografia real (pessoas, mar, praia, evento) que combine com a manchete.',
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } },
        { type: 'text', text: `Manchete: "${noticia.title}"\nResumo: "${noticia.summary || ''}"` },
      ] }],
    }),
  });
  if (!r.ok) throw new Error('diretor: anthropic ' + r.status);
  const j = await r.json();
  const texto = (j.content && j.content[0] && j.content[0].text) || '';
  const m = texto.match(/\{[\s\S]*\}/);
  try { return JSON.parse(m ? m[0] : texto); } catch { return { aprovada: false, motivo: 'resposta ilegível' }; }
}

function dimensoes(arquivo) {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height', '-of', 'csv=p=0', arquivo],
    { timeout: 15000 }).toString().trim();
    const [w, h] = out.split(',').map(Number);
    return { w, h };
  } catch { return { w: 0, h: 0 }; }
}

/* ── texto: helpers fiéis (nada de reescrever notícia) ── */
function primeiraFrase(s, max = 120) {
  if (!s) return '';
  const fim = s.search(/[.!?](\s|$)/);
  let frase = fim >= 0 && fim < max ? s.slice(0, fim + 1) : s;
  if (frase.length > max) {
    frase = frase.slice(0, max);
    frase = frase.slice(0, frase.lastIndexOf(' ')) + '…';
  }
  return frase.trim();
}
function quebrar(t, maxLinhas = 3, sep = '<br>') {
  const palavras = String(t).split(/\s+/);
  const linhas = Math.min(maxLinhas, Math.max(1, Math.round(palavras.length / 3.2)));
  const alvo = Math.ceil(palavras.length / linhas);
  const out = [];
  for (let i = 0; i < palavras.length; i += alvo) out.push(palavras.slice(i, i + alvo).join(' '));
  return out.join(sep);
}
function dominio(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } }
function slugDe(n) {
  const data = String(n.date || '').split('/').reverse().join('');
  const t = String(n.title || 'noticia').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  return `${data || 'semdata'}-${t}`;
}

/* ── os dados de CADA template, todo campo sobrescrito, só fatos do feed ──
   pb SEMPRE false: nenhuma capa em preto e branco (regra do Hudson). */
function dadosPara(tpl, n, fotoDataUri) {
  const TITULO = String(n.title || '').trim();
  const FONTE = String(n.source || '').trim();
  const DATA = String(n.date || '').trim();
  const LINHA = primeiraFrase(n.summary);
  const DOM = dominio(n.url);
  const base = { foto: fotoDataUri, pb: false };

  if (tpl === 'banca') return { ...base,
    titulo: quebrar(TITULO.toUpperCase(), 3),
    linha: LINHA, selo: 'Notícia', edicao: DATA, rodape: 'tideline.com.br',
    topoEsq: 'NOTÍCIAS DO SURF', topoDirTitulo: 'Fonte', topoDir: FONTE.toUpperCase(),
    chamadas: [
      { k: 'Fonte', v: FONTE, p: '' },
      { k: 'Data', v: DATA, p: '' },
      { k: 'Na íntegra', v: DOM, p: '' },
    ] };

  if (tpl === 'editorial') return { ...base,
    titulo: TITULO, subnome: 'Notícias do surf', edicao: DATA,
    ficha: `${FONTE}\n${DOM}\n${DATA}`, rodape: 'tideline.com.br',
    chamadas: [{ p: '01', k: FONTE, v: primeiraFrase(n.summary, 70) }] };

  if (tpl === 'poster') return { ...base,
    titulo: quebrar(TITULO, 2), linha: `${FONTE} · ${DATA}`, grao: true };

  if (tpl === 'nostalgia') return { ...base,
    titulo: 'Notícias do surf',
    linha: quebrar(LINHA, 4, '\n'),
    edicao: DATA, selo: FONTE, rodape: 'tideline.com.br',
    chamadas: [{ k: FONTE, v: DATA }], grao: true };

  if (tpl === 'central') return { ...base,
    titulo: quebrar(TITULO.toUpperCase(), 3), linha: LINHA,
    selo: 'Notícia', edicao: DATA, rodape: 'tideline.com.br',
    subnome: 'Notícias do surf',
    chamadas: [{ k: 'Fonte', v: FONTE }, { k: 'Data', v: DATA }] };

  if (tpl === 'francesa') return { ...base,
    titulo: quebrar(TITULO.toUpperCase(), 3), linha: LINHA,
    selo: 'Notícia', edicao: DATA, rodape: 'tideline.com.br',
    topoEsq: `Notícias do surf · ${DATA}`,
    chamadas: [
      { k: 'Fonte', v: FONTE }, { k: 'Data', v: DATA },
      { k: 'Site', v: DOM }, { k: 'Edição', v: 'Notícias' },
    ] };

  return null;
}

/* ── processa UMA notícia: foto → preparo → 6 capas ── */
async function processarNoticia(n, log) {
  const slug = slugDe(n);
  const pasta = path.join(SAIDAS_BANCA, slug);
  fs.mkdirSync(pasta, { recursive: true });

  // 1) foto oficial do veículo
  log(`  buscando a página da notícia (${dominio(n.url)})…`);
  const html = (await baixar(n.url)).toString('utf8');
  const candidatas = acharFoto(html, n.url);
  if (!candidatas.length) throw new Error('nenhuma foto encontrada na página');

  let fonteFoto = null; let urlFoto = null; let consultas = 0;
  for (const cand of candidatas) {
    try {
      const buf = await baixar(cand);
      const tmp = path.join(pasta, 'fonte-teste');
      fs.writeFileSync(tmp, buf);
      const { w, h } = dimensoes(tmp);
      if (!(w >= 600 && h >= 400)) { fs.unlinkSync(tmp); continue; }
      // o Diretor olha a imagem: foto de verdade que respeita a manchete?
      if (consultas >= 4) { fs.unlinkSync(tmp); break; } // teto de custo por notícia
      consultas++;
      const crivo = await diretorAprova(tmp, n, log);
      if (!crivo.aprovada) {
        log(`  Diretor reprovou (${crivo.motivo}): ${cand.slice(0, 70)}…`);
        fs.unlinkSync(tmp); continue;
      }
      log(`  Diretor aprovou a foto (${crivo.motivo || 'ok'})`);
      fonteFoto = tmp; urlFoto = cand; break;
    } catch (e) { log(`  candidata falhou (${e.message})`); }
  }
  if (!fonteFoto) throw new Error('nenhuma foto digna de capa (o Diretor reprovou as candidatas)');
  const fonteFinal = path.join(pasta, 'fonte' + (urlFoto.match(/\.(png|webp)/i) ? '.png' : '.jpg'));
  fs.renameSync(fonteFoto, fonteFinal);

  // 2) preparo: crop focal 4:5 + contraste garantido
  log('  preparando a foto (crop focal + contraste)…');
  const prontaPath = path.join(pasta, 'foto.jpg');
  const info = JSON.parse(execFileSync('python3.12',
    [path.join(DIR, 'banca-foto.py'), fonteFinal, prontaPath], { timeout: 120000 }).toString());
  const dataUri = 'data:image/jpeg;base64,' + fs.readFileSync(prontaPath).toString('base64');

  // 3) as capas, uma por template
  const capas = [];
  for (const tpl of Object.keys(TEMPLATES)) {
    const dados = dadosPara(tpl, n, dataUri);
    if (!dados) continue;
    const htmlCapa = paginaCompleta(tpl, dados);
    const tmpHtml = path.join(os.tmpdir(), `tl-banca-${slug}-${tpl}.html`);
    fs.writeFileSync(tmpHtml, htmlCapa);
    const destino = path.join(pasta, `${tpl}.png`);
    execFileSync(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars',
      '--window-size=1080,1350', `--screenshot=${destino}`,
      '--virtual-time-budget=9000', 'file://' + tmpHtml], { stdio: 'ignore', timeout: 60000 });
    fs.unlinkSync(tmpHtml);
    if (fs.existsSync(destino)) { capas.push(`${tpl}.png`); log(`  capa pronta: ${tpl}`); }
  }
  if (!capas.length) throw new Error('nenhuma capa renderizou');

  fs.writeFileSync(path.join(pasta, 'meta.json'), JSON.stringify({
    titulo: n.title, fonte: n.source, url: n.url, data: n.date, resumo: n.summary,
    fotoOrigem: urlFoto, foto: info, capas, geradoEm: new Date().toISOString(),
  }, null, 2));
  return { slug, capas: capas.length };
}

function notificar(msg) {
  try {
    execFileSync('osascript', ['-e',
      `display notification ${JSON.stringify(msg)} with title "Estúdio Tideline" subtitle "Banca de notícias" sound name "Glass"`]);
  } catch { /* notificação é cortesia, nunca derruba o fluxo */ }
}

/* ── a verificação: feed novo? gera o que falta e avisa o Hudson ── */
let verificando = false;
function verificar(log = console.log, cb = () => {}) {
  if (verificando) return cb(null, { ocupado: true });
  verificando = true;
  lerFeed(async (err, feed) => {
    if (err) { verificando = false; return cb(err); }
    const estado = lerEstado();
    const novas = (feed || []).filter((n) => n && n.url && !estado.feitas[n.url]);
    if (!novas.length) { verificando = false; return cb(null, { novas: 0 }); }
    log(`Banca: ${novas.length} notícia(s) nova(s) no feed.`);
    let totalCapas = 0; const ok = []; const falhas = [];
    for (const n of novas) {
      try {
        log(`• ${n.title}`);
        const r = await processarNoticia(n, log);
        estado.feitas[n.url] = { slug: r.slug, capas: r.capas, em: new Date().toISOString() };
        salvarEstado(estado);
        totalCapas += r.capas; ok.push(n.title);
      } catch (e) {
        log(`  FALHOU: ${e.message}`);
        falhas.push({ titulo: n.title, erro: e.message });
        // tenta de novo nas próximas rondas, mas com teto: 5 falhas = desiste
        // e avisa (senão uma notícia quebrada roda e gasta pra sempre)
        estado.tentativas ||= {};
        estado.tentativas[n.url] = (estado.tentativas[n.url] || 0) + 1;
        if (estado.tentativas[n.url] >= 5) {
          estado.feitas[n.url] = { desistiu: true, erro: e.message, em: new Date().toISOString() };
          notificar(`Banca desistiu de "${String(n.title).slice(0, 60)}": ${e.message}`);
        }
        salvarEstado(estado);
      }
    }
    if (ok.length) notificar(`${totalCapas} capas novas de ${ok.length} notícia(s). Abra a Banca pra ver.`);
    if (falhas.length && !ok.length) notificar(`Banca: ${falhas.length} notícia(s) falharam (${falhas[0].erro}).`);
    verificando = false;
    cb(null, { novas: novas.length, capas: totalCapas, ok, falhas });
  });
}

/* ── a lista pra interface: notícias agrupadas, mais novas primeiro ── */
function lista() {
  const grupos = [];
  for (const slug of fs.readdirSync(SAIDAS_BANCA)) {
    const pasta = path.join(SAIDAS_BANCA, slug);
    const metaPath = path.join(pasta, 'meta.json');
    if (!fs.existsSync(metaPath)) continue;
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      grupos.push({ slug, ...meta });
    } catch { /* pasta quebrada não derruba a lista */ }
  }
  grupos.sort((a, b) => String(b.geradoEm).localeCompare(String(a.geradoEm)));
  return grupos;
}

/* ── vigilância: checa na subida e depois a cada 30 min ── */
function iniciarVigilancia(log = console.log) {
  setTimeout(() => verificar(log), 15000);
  setInterval(() => verificar(log), 30 * 60 * 1000);
  log('  Banca de notícias: vigiando o feed (na subida e a cada 30 min)');
}

/* ── dados de uma capa já gerada, pro editor de revista (botão Editar) ── */
function dadosParaEdicao(slug, tpl) {
  const pasta = path.join(SAIDAS_BANCA, path.basename(slug));
  const meta = JSON.parse(fs.readFileSync(path.join(pasta, 'meta.json'), 'utf8'));
  const n = { title: meta.titulo, source: meta.fonte, url: meta.url, date: meta.data, summary: meta.resumo };
  const foto = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(pasta, 'foto.jpg')).toString('base64');
  return { template: tpl, dados: dadosPara(tpl, n, foto) };
}

module.exports = { verificar, lista, iniciarVigilancia, dadosParaEdicao, SAIDAS_BANCA };
