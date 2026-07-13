#!/usr/bin/env python3
"""Gera o leitor web (demo/guia.html) a partir do mesmo ler-o-mar.html que vira PDF.

O leitor tem DOIS modos, e o usuário escolhe:

  PÁGINA (padrão)  A folha A4 inteira, do jeito que foi diagramada, encaixada na largura
                   da tela. É a experiência de ver o PDF: a capa aparece cheia, a
                   diagramação é respeitada, o espaçamento é o do designer. Dá pinça pra
                   aproximar, como em qualquer PDF.

  TEXTO            O mesmo conteúdo em texto corrido, tipografia grande, pra quem quer
                   ler no ônibus sem apertar os olhos.

Uma fonte só: mudou o e-book, roda ./gerar-web.sh e o leitor acompanha.
"""
import re, pathlib

AQUI = pathlib.Path(__file__).parent
FONTE = AQUI / "ler-o-mar.html"
DESTINO = AQUI.parent / "demo" / "guia.html"

ebook = FONTE.read_text()

# O <style> do e-book vem inteiro: é ele que desenha a folha A4, as caixas, as tabelas.
# No modo página ele reina sozinho. No modo texto a gente o sobrepõe.
estilo_ebook = re.search(r"<style>(.*?)</style>", ebook, re.S).group(1)
# o zoom mobile antigo era gambiarra de folha solta; aqui quem cuida do encaixe é o leitor
estilo_ebook = re.sub(r"@media screen and \(max-width: 820px\)\{.*?\n\}", "", estilo_ebook, flags=re.S)

corpo = re.sub(r"<style>.*?</style>", "", ebook, flags=re.S)
corpo = re.sub(r"<script>.*?</script>", "", corpo, flags=re.S)
corpo = re.sub(r"<meta[^>]*>", "", corpo)

# cada capítulo ganha âncora, e o sumário vira um menu que pula até ele
corpo = re.sub(r'<div class="page">(\s*<div class="pad">\s*<div class="cap-num">(\d+)</div>)',
               lambda m: f'<div class="page" id="cap-{m.group(2)}">{m.group(1)}', corpo)
corpo = re.sub(r'<div class="toc-i"><span class="n">(\d+)</span>(.*?)</div>',
               lambda m: f'<a class="toc-i" href="#cap-{int(m.group(1)):02d}"><span class="n">{m.group(1)}</span>{m.group(2)}</a>',
               corpo)

LEITOR = """
/* ================= LEITOR ================= */
html{ -webkit-text-size-adjust:100% }
body{ margin:0; background:#0F1B1A }

/* ---------- barra do topo: sai da frente quando você desce ---------- */
.tl-topo{
  position:fixed; top:0; left:0; right:0; z-index:50;
  display:flex; align-items:center; gap:8px; padding:10px 14px;
  background:rgba(15,27,26,.86); backdrop-filter:blur(12px);
  border-bottom:1px solid rgba(255,255,255,.08);
  transition:transform .25s ease;
}
.tl-topo.esconde{ transform:translateY(-100%) }
.tl-topo .wm{ font-size:15px; letter-spacing:-.02em; color:#EAF2EF; margin-right:auto }
.tl-topo .wm .t{ font-weight:300 } .tl-topo .wm .l{ font-weight:700 } .tl-topo .wm .d{ color:var(--accent) }
.tl-topo a, .tl-topo button{
  font:inherit; font-size:13px; font-weight:600; color:#EAF2EF; background:transparent;
  border:1px solid rgba(255,255,255,.18); border-radius:9px; padding:8px 12px;
  min-height:40px; min-width:44px; display:flex; align-items:center; justify-content:center;
  cursor:pointer; text-decoration:none; transition:.15s; white-space:nowrap;
}
.tl-topo a:hover, .tl-topo button:hover{ background:rgba(255,255,255,.10) }
.tl-topo .pdf{ background:var(--accent); border-color:var(--accent); color:#fff }
.tl-topo .pdf:hover{ background:#e14b26; border-color:#e14b26 }
.tl-prog{ position:fixed; top:0; left:0; height:3px; width:0; background:var(--accent);
  z-index:60; transition:width .08s linear }

.tl-corpo{ padding-top:60px }

/* ================= MODO PÁGINA: o PDF na tela ================= */
/* A folha continua A4 de verdade (210mm), com a diagramação intacta. O que muda é só a
   ESCALA: encaixamos a folha na largura da tela. Mexer em margem ou corpo de texto aqui
   seria jogar fora a diagramação inteira. */
body.modo-pagina .tl-corpo{ padding-bottom:36px }
body.modo-pagina .page{
  zoom: var(--z, 1);
  margin:0 auto 4mm !important;
  box-shadow:0 4px 24px rgba(0,0,0,.45) !important;
}

/* ================= MODO TEXTO: leitura corrida ================= */
body.modo-texto{ background:var(--paper) }
body.modo-texto .page{
  width:auto !important; height:auto !important; min-height:0 !important;
  margin:0 !important; padding:0 !important; box-shadow:none !important;
  position:static !important; overflow:visible !important; zoom:1 !important;
  border-bottom:1px solid rgba(23,39,38,.10);
}
body.modo-texto .page .pad{
  position:static !important; inset:auto !important;
  max-width:640px; margin:0 auto; padding:44px 22px 52px !important;
}
body.modo-texto .page.capa{ position:relative !important; overflow:hidden !important; background:var(--deep) }
body.modo-texto .page.capa .pad{
  position:relative !important; z-index:2; min-height:70vh;
  display:flex; flex-direction:column; justify-content:flex-end; padding:70px 22px 56px !important;
}
body.modo-texto .capa h1{ font-size:44px !important }
body.modo-texto .capa .sub{ font-size:16px !important; max-width:none !important }
body.modo-texto h2{ font-size:27px !important; line-height:1.24; margin:0 0 18px !important }
body.modo-texto h3{ font-size:18px !important; margin:30px 0 10px !important }
body.modo-texto p, body.modo-texto li, body.modo-texto td{ font-size:17px !important; line-height:1.72 !important }
body.modo-texto .cap-num{ font-size:40px !important }
body.modo-texto table{ width:100%; display:block; overflow-x:auto }
body.modo-texto .foto .art{ height:auto !important; aspect-ratio:16/9 }
body.modo-texto .foto .brief{ font-size:14px !important }
body.modo-texto .foot{ display:none }       /* número de página não quer dizer nada aqui */
body.modo-texto .toc-i .p{ display:none }

.toc-i{ display:flex; text-decoration:none; color:inherit; cursor:pointer }
body.modo-texto .toc-i{ border-radius:8px; margin:0 -8px; padding:9px 8px !important; transition:background .15s }
body.modo-texto .toc-i:hover{ background:var(--surface2) }
.page[id]{ scroll-margin-top:70px }

/* ---------- fim ---------- */
.tl-fim{ max-width:640px; margin:0 auto; padding:50px 22px 80px; text-align:center }
.tl-fim p{ color:#9DB3AF; margin:0 0 18px; font-size:15px }
body.modo-texto .tl-fim p{ color:var(--muted) }
.tl-fim a{ display:inline-block; background:var(--accent); color:#fff; text-decoration:none;
  font-weight:600; padding:15px 26px; border-radius:12px; min-height:52px; box-sizing:border-box }

/* ---------- aviso do download ---------- */
.tl-modal{ position:fixed; inset:0; z-index:100; display:none; align-items:flex-end; justify-content:center;
  background:rgba(15,27,26,.6); backdrop-filter:blur(3px) }
.tl-modal.abre{ display:flex }
.tl-folha{ width:100%; max-width:440px; background:var(--paper); color:var(--deep);
  border-radius:20px 20px 0 0; padding:26px 22px calc(26px + env(safe-area-inset-bottom));
  animation:sobe .22s cubic-bezier(.2,.8,.2,1) }
@media (min-width:560px){ .tl-modal{ align-items:center } .tl-folha{ border-radius:20px } }
@keyframes sobe{ from{ transform:translateY(18px); opacity:0 } to{ transform:none; opacity:1 } }
.tl-folha h4{ font-size:19px; font-weight:700; margin:0 0 8px }
.tl-folha p{ font-size:14.5px; color:var(--muted); line-height:1.6; margin:0 0 16px }
.tl-folha ol{ margin:0 0 20px; padding-left:20px }
.tl-folha li{ font-size:14.5px; line-height:1.7; margin-bottom:4px }
.tl-folha .bts{ display:flex; gap:10px }
.tl-folha button{ flex:1; font:inherit; font-size:15px; font-weight:600; min-height:52px; padding:14px;
  border-radius:12px; cursor:pointer; border:1px solid rgba(23,39,38,.18);
  background:transparent; color:var(--muted) }
.tl-folha button.ok{ background:var(--deep); color:#fff; border-color:var(--deep) }

@media (prefers-reduced-motion:reduce){ .tl-folha{ animation:none } .tl-topo{ transition:none } }
"""

html = f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0F1B1A">
<title>Guia Ler o Mar · Tideline</title>
<script src="./tideline-analytics.js"></script>
<style>
{estilo_ebook}
{LEITOR}
</style>
</head>
<body class="modo-pagina">

<div class="tl-prog" id="prog"></div>

<header class="tl-topo" id="topo">
  <span class="wm"><span class="t">tide</span><span class="l">line</span><span class="d">.</span></span>
  <a href="./app.html">Voltar</a>
  <button id="btn-modo" type="button">Aa</button>
  <button class="pdf" id="btn-pdf" type="button">PDF</button>
</header>

<div class="tl-corpo">
{corpo}

<div class="tl-fim">
  <p>Chegou ao fim. Agora abre o app e olha a previsão de hoje com esses olhos novos.</p>
  <a href="./app.html">Ver a previsão</a>
</div>
</div>

<div class="tl-modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="modal-t">
  <div class="tl-folha">
    <h4 id="modal-t">Como salvar o guia</h4>
    <p id="modal-p"></p>
    <ol id="modal-passos"></ol>
    <div class="bts">
      <button type="button" id="modal-nao">Agora não</button>
      <button type="button" class="ok" id="modal-sim">Salvar o PDF</button>
    </div>
  </div>
</div>

<script src="./tideline-config.js"></script>
<script src="./tideline-data.js"></script>
<script>
const $ = s => document.querySelector(s);

/* ---------- modo de leitura ---------- */
// A folha A4 tem 210mm, que dão 793.7px na régua do CSS. Encaixá-la na largura da tela é
// só uma conta. Nada de mexer em margem ou corpo de texto: a diagramação é do designer.
const A4 = 793.7;
function encaixar(){{
  if (!document.body.classList.contains('modo-pagina')) return;
  const larg = document.documentElement.clientWidth;
  const z = larg < 900 ? larg / A4 : Math.min(1, (larg - 80) / A4);
  document.documentElement.style.setProperty('--z', z);
}}
function aplicarModo(m){{
  document.body.className = 'modo-' + m;
  const b = $('#btn-modo');
  b.textContent = (m === 'pagina') ? 'Aa' : '\\u2637';
  b.setAttribute('aria-label', m === 'pagina' ? 'Ler como texto corrido' : 'Ver a página do e-book');
  b.title = b.getAttribute('aria-label');
  localStorage.setItem('tl_guia_modo', m);
  encaixar();
}}
aplicarModo(localStorage.getItem('tl_guia_modo') || 'pagina');

$('#btn-modo').onclick = () => {{
  const atual = document.body.classList.contains('modo-pagina') ? 'pagina' : 'texto';
  const alt = document.body.scrollHeight - innerHeight || 1;
  const onde = scrollY / alt;                       // guarda o ponto da leitura
  aplicarModo(atual === 'pagina' ? 'texto' : 'pagina');
  requestAnimationFrame(() => scrollTo(0, onde * (document.body.scrollHeight - innerHeight)));
}};
addEventListener('resize', encaixar);
addEventListener('orientationchange', () => setTimeout(encaixar, 150));

/* ---------- progresso, e a barra que se recolhe ---------- */
const prog = $('#prog'), topo = $('#topo');
let ultimo = 0;
addEventListener('scroll', () => {{
  const t = document.body.scrollHeight - innerHeight;
  prog.style.width = (t > 0 ? (scrollY / t) * 100 : 0) + '%';
  topo.classList.toggle('esconde', scrollY > ultimo && scrollY > 240);   // descendo, sai da frente
  ultimo = scrollY;
}}, {{ passive: true }});

/* ---------- leitura contada uma vez por sessão ---------- */
if (window.tlTrack && !sessionStorage.getItem('tl_guia_lido')) {{
  sessionStorage.setItem('tl_guia_lido', '1');
  tlTrack('ViewContent', 'guia_abriu', {{ content_name: 'Guia Ler o Mar', content_category: 'ebook' }});
}}

/* ---------- baixar o PDF ---------- */
// No celular "baixar" não é óbvio: o iPhone abre a folha de compartilhamento e o arquivo
// só existe se a pessoa escolher "Salvar em Arquivos". Sem aviso, ela acha que nada
// aconteceu. Então: avisa antes, usa a folha nativa quando dá, e confirma depois.
const ehiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const ehAndroid = /Android/.test(navigator.userAgent);
const ehCelular = ehiOS || ehAndroid;
const modal = $('#modal');

function abrirModal(){{
  const p = $('#modal-p'), passos = $('#modal-passos');
  if (ehiOS) {{
    p.textContent = 'O iPhone não guarda o arquivo sozinho. Ele vai abrir a tela de compartilhamento, e o guia só fica salvo se você escolher onde.';
    passos.innerHTML = '<li>Toque em <b>Salvar em Arquivos</b></li>' +
                       '<li>Escolha uma pasta e confirme</li>' +
                       '<li>Depois é só abrir o app <b>Arquivos</b> pra ler offline</li>';
  }} else if (ehAndroid) {{
    p.textContent = 'O arquivo vai para a pasta de downloads do seu celular.';
    passos.innerHTML = '<li>Confirme o download quando o navegador perguntar</li>' +
                       '<li>Depois abra em <b>Downloads</b> ou <b>Arquivos</b></li>';
  }} else {{
    p.textContent = 'O arquivo vai direto para a sua pasta de downloads.';
    passos.innerHTML = '<li>Procure por <b>Guia Ler o Mar - Tideline.pdf</b></li>';
  }}
  modal.classList.add('abre');
  $('#modal-sim').focus();
}}
const fecharModal = () => modal.classList.remove('abre');
$('#modal-nao').onclick = fecharModal;
modal.onclick = e => {{ if (e.target === modal) fecharModal(); }};
addEventListener('keydown', e => {{ if (e.key === 'Escape') fecharModal(); }});

const btnPdf = $('#btn-pdf');
btnPdf.onclick = () => (ehCelular ? abrirModal() : baixarPdf());
$('#modal-sim').onclick = () => {{ fecharModal(); baixarPdf(); }};

async function baixarPdf(){{
  const b = btnPdf, orig = 'PDF';
  b.disabled = true; b.textContent = '…';
  try {{
    const c = window.TLData && await window.TLData.client();
    const {{ data: sess }} = await c.auth.getSession();
    const token = sess && sess.session && sess.session.access_token;
    if (!token) throw new Error('Entre na sua conta para baixar o PDF.');
    const r = await fetch('/api/ebook-link', {{ method: 'POST', headers: {{ authorization: 'Bearer ' + token }} }});
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'não consegui liberar o arquivo');

    const blob = await (await fetch(d.url)).blob();
    const arquivo = new File([blob], 'Guia Ler o Mar - Tideline.pdf', {{ type: 'application/pdf' }});

    if (navigator.canShare && navigator.canShare({{ files: [arquivo] }})) {{
      await navigator.share({{ files: [arquivo], title: 'Guia Ler o Mar' }});   // o caminho do "Salvar em Arquivos"
    }} else {{
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = arquivo.name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }}
    if (window.tlTrack) tlTrack('Lead', 'ebook_download', {{ content_name: 'Guia Ler o Mar' }});
    b.textContent = '✓';
    setTimeout(() => {{ b.disabled = false; b.textContent = orig; }}, 2400);
  }} catch (err) {{
    if (err && err.name === 'AbortError') {{ b.disabled = false; b.textContent = orig; return; }}   // desistiu, não é erro
    alert(err.message || 'Não consegui baixar agora.');
    b.disabled = false; b.textContent = orig;
  }}
}}
</script>
</body>
</html>
"""

DESTINO.write_text(html)
print(f"{DESTINO.name}: {len(html)/1e6:.2f} MB")
