#!/usr/bin/env python3
"""Gera o leitor web (demo/guia.html) a partir do mesmo ler-o-mar.html que vira PDF.

UM modo só, de leitura. Tentamos antes um "modo página" que encaixava a folha A4 na
tela por escala (CSS zoom). No Chrome funcionava; no Safari do iPhone o zoom quebra o
layout, o texto vaza da folha e atropela o rodapé. Não dá pra entregar isso.

A capa é a exceção: ela é fiel ao PDF, ocupa a tela inteira, com a foto reinando e o
texto ancorado embaixo. É a primeira impressão, e ela merece.

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

/* a capa vai de ponta a ponta, por baixo da barra (que é translúcida). As demais
   páginas têm o próprio respiro de topo, então ninguém fica escondido atrás dela. */
.tl-corpo{ padding-top:0 }
.tl-corpo > .page:not(.capa):first-child{ padding-top:60px !important }

/* ================= A LEITURA ================= */
body{ background:var(--paper) }
.page{
  width:auto !important; height:auto !important; min-height:0 !important;
  margin:0 !important; padding:0 !important; box-shadow:none !important;
  /* relative, e não static: a folha precisa continuar sendo âncora. Sem isso, tudo que
     é absoluto dentro dela (a foto da capa, o rodapé da contracapa) se solta e vai
     parar em cima de outra página. */
  position:relative !important; overflow:visible !important; zoom:1 !important;
  border-bottom:1px solid rgba(23,39,38,.10);
}
/* blocos que o e-book posicionou à mão, com style inline, voltam pro fluxo normal */
.page .pad div[style*="absolute"]{
  position:static !important; left:auto !important; right:auto !important;
  bottom:auto !important; top:auto !important; margin-top:32px !important;
}
.page .pad{
  position:static !important; inset:auto !important;
  max-width:640px; margin:0 auto; padding:44px 22px 52px !important;
}
/* ---------- a capa: fiel ao PDF ----------
   Tela inteira, a foto mandando, e o texto ancorado embaixo. No PDF o título vive no
   terço de baixo da folha, e é isso que reproduzimos: espaço, respiro e a onda enorme. */
.page.capa{
  position:relative !important; overflow:hidden !important; background:var(--deep);
  height:100dvh !important; min-height:560px !important; border-bottom:0;
}
.page.capa .pad{
  position:absolute !important; inset:0 !important; z-index:2;
  max-width:none !important; margin:0 !important;
  display:flex !important; flex-direction:column; justify-content:space-between;
  padding:calc(70px + env(safe-area-inset-top)) 26px calc(30px + env(safe-area-inset-bottom)) !important;
}
.capa h1{ font-size:clamp(40px, 13vw, 64px) !important; line-height:1.02 !important; margin:0 !important }
.capa .sub{ font-size:clamp(14px, 4vw, 17px) !important; max-width:34ch !important; margin-top:16px !important }
.capa .selo, .capa .kicker{ align-self:flex-start }
/* Nada de encolher: sem isso o flex comprime o bloco de baixo, o subtítulo transborda
   da caixa dele e vai parar em cima da assinatura. */
.capa .pad > *{ flex:0 0 auto }
.capa .assina{ margin-top:22px !important; padding-top:16px !important }
h2{ font-size:27px !important; line-height:1.24; margin:0 0 18px !important }
h3{ font-size:18px !important; margin:30px 0 10px !important }
p, li, td{ font-size:17px !important; line-height:1.72 !important }
.cap-num{ font-size:40px !important }
table{ width:100%; display:block; overflow-x:auto }
.foto .art{ height:auto !important; aspect-ratio:16/9 }
.foto .brief{ font-size:14px !important }
.foot{ display:none }       /* número de página não quer dizer nada aqui */
.toc-i .p{ display:none }

.toc-i{ display:flex; text-decoration:none; color:inherit; cursor:pointer }
.toc-i{ border-radius:8px; margin:0 -8px; padding:9px 8px !important; transition:background .15s }
.toc-i:hover{ background:var(--surface2) }
.page[id]{ scroll-margin-top:70px }

/* ---------- fim ---------- */
.tl-fim{ max-width:640px; margin:0 auto; padding:50px 22px 80px; text-align:center }
.tl-fim p{ color:#9DB3AF; margin:0 0 18px; font-size:15px }
.tl-fim p{ color:var(--muted) }
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
<body>

<div class="tl-prog" id="prog"></div>

<header class="tl-topo" id="topo">
  <span class="wm"><span class="t">tide</span><span class="l">line</span><span class="d">.</span></span>
  <a href="./app.html">Voltar</a>
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
