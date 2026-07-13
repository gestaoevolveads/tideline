#!/usr/bin/env python3
"""Transforma o e-book (folhas A4) no leitor web (texto corrido, para celular)."""
import re, pathlib

AQUI = pathlib.Path(__file__).parent
FONTE = AQUI / "ler-o-mar.html"
DESTINO = AQUI.parent / "demo" / "guia.html"

ebook = FONTE.read_text()

# o <style> do e-book vem junto: as cores, as fontes e o desenho dos elementos internos
# (caixas, tabelas, ilustrações) continuam valendo. O que o leitor derruba é a FOLHA.
estilo_ebook = re.search(r"<style>(.*?)</style>", ebook, re.S).group(1)
corpo = re.sub(r"<style>.*?</style>", "", ebook, flags=re.S)
corpo = re.sub(r"<script>.*?</script>", "", corpo, flags=re.S)   # o zoom mobile era coisa de folha
corpo = re.sub(r"<meta[^>]*>", "", corpo)
corpo = re.sub(r'<div class="foot">.*?</div>\s*', "", corpo, flags=re.S)  # rodapé com número de página

# Num texto que rola, "página 04" não quer dizer nada. Então: cada capítulo ganha uma
# âncora, e o sumário vira um menu que pula até ele. O número de página some.
def ancorar(m):
    return f'<div class="page" id="cap-{m.group(1)}">'
corpo = re.sub(r'<div class="page">(?=\s*<div class="pad">\s*<div class="cap-num">(\d+)</div>)',
               lambda m: m.group(0), corpo)  # (mantém o resto intacto)
corpo = re.sub(r'<div class="page">(\s*<div class="pad">\s*<div class="cap-num">(\d+)</div>)',
               lambda m: f'<div class="page" id="cap-{m.group(2)}">{m.group(1)}', corpo)
corpo = re.sub(r'<div class="toc-i"><span class="n">(\d+)</span>(.*?)</div>',
               lambda m: f'<a class="toc-i" href="#cap-{int(m.group(1)):02d}"><span class="n">{m.group(1)}</span>{m.group(2)}</a>',
               corpo)

LEITOR = """
/* ---------- o leitor: joga a folha A4 fora e deixa o conteúdo respirar ---------- */
html{ -webkit-text-size-adjust:100% }
body{ margin:0; background:var(--paper); color:var(--deep); }

.page{
  width:auto !important; min-height:0 !important; height:auto !important;
  margin:0 !important; padding:0 !important; box-shadow:none !important;
  page-break-after:auto; position:static !important; overflow:visible !important;
  border-bottom:1px solid rgba(23,39,38,.10);
}
.page .pad{
  position:static !important; inset:auto !important;
  max-width:660px; margin:0 auto; padding:44px 22px 52px !important;
}
.page.capa{ background:var(--deep); position:relative !important; overflow:hidden !important }
/* sem esse position:relative, a foto (absolute, inset:0) perde a âncora e se estica
   pelo documento inteiro, aparecendo atrás de todos os capítulos. */
/* a capa precisa continuar POSICIONADA: se virar static, o z-index morre e a foto
   (que é absoluta) passa por cima do título. */
.page.capa .pad{ position:relative !important; z-index:2;
  padding:70px 22px 60px !important; min-height:74vh; display:flex;
  flex-direction:column; justify-content:flex-end }
.capa .bg{ position:absolute !important }
.capa h1{ font-size:44px !important }
.capa .sub{ font-size:16px !important; max-width:none !important }

/* tipografia de leitura, não de impressão */
h2{ font-size:27px !important; line-height:1.22; margin:0 0 18px !important }
h3{ font-size:18px !important; margin:30px 0 10px !important }
p, li, td{ font-size:17px !important; line-height:1.72 !important }
.kicker{ font-size:12px !important; letter-spacing:.18em }
.cap-num{ font-size:40px !important }
.page[id]{ scroll-margin-top:64px }              /* a barra fixa não cobre o título ao pular */
.toc-i{ display:flex; text-decoration:none; color:inherit; cursor:pointer;
  border-radius:8px; margin:0 -8px; padding:9px 8px !important; transition:background .15s }
.toc-i:hover{ background:var(--surface2) }
.toc-i .p{ display:none }                        /* número de página não existe aqui */
table{ width:100%; display:block; overflow-x:auto }   /* tabela larga rola sozinha, sem quebrar a página */

/* a ilustração vira imagem de largura cheia, não uma faixa recortada */
.foto .art{ height:auto !important; aspect-ratio:16/9; background-size:cover }
.foto .brief{ font-size:14px !important }

/* ---------- barra do topo ---------- */
.tl-topo{
  position:sticky; top:0; z-index:50; display:flex; align-items:center; gap:12px;
  padding:12px 16px; background:rgba(242,239,233,.92); backdrop-filter:blur(10px);
  border-bottom:1px solid rgba(23,39,38,.10);
}
.tl-topo .wm{ font-size:16px; letter-spacing:-.02em; margin-right:auto }
.tl-topo .wm .t{ font-weight:300 } .tl-topo .wm .l{ font-weight:700 } .tl-topo .wm .d{ color:var(--accent) }
.tl-topo a, .tl-topo button{
  font:inherit; font-size:13px; font-weight:600; color:var(--deep); background:transparent;
  border:1px solid rgba(23,39,38,.18); border-radius:9px; padding:9px 13px; min-height:40px;
  cursor:pointer; text-decoration:none; display:flex; align-items:center; transition:.15s;
}
.tl-topo a:hover, .tl-topo button:hover{ background:var(--surface2); border-color:var(--muted) }
.tl-topo .pdf{ background:var(--deep); color:#fff; border-color:var(--deep) }
.tl-topo .pdf:hover{ background:var(--mid); color:#fff }

/* progresso da leitura: uma linha fina, sem alarde */
.tl-prog{ position:fixed; top:0; left:0; height:3px; width:0; background:var(--accent); z-index:60; transition:width .1s linear }

.tl-fim{ max-width:660px; margin:0 auto; padding:44px 22px 70px; text-align:center }
.tl-fim p{ color:var(--muted); margin:0 0 18px }
.tl-fim a{ display:inline-block; background:var(--accent); color:#fff; text-decoration:none;
  font-weight:600; padding:15px 26px; border-radius:12px; min-height:52px; box-sizing:border-box }

@media (min-width:900px){
  .page .pad{ padding:60px 24px 70px !important }
  .capa h1{ font-size:64px !important }
}
@media (prefers-reduced-motion:reduce){ .tl-prog{ transition:none } }
"""

html = f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Guia Ler o Mar · Tideline</title>
<script src="./tideline-analytics.js"></script>
<style>
{estilo_ebook}
{LEITOR}
</style>
</head>
<body>

<div class="tl-prog" id="prog"></div>

<header class="tl-topo">
  <span class="wm"><span class="t">tide</span><span class="l">line</span><span class="d">.</span></span>
  <a href="./app.html">Voltar</a>
  <button class="pdf" id="btn-pdf" type="button">Baixar PDF</button>
</header>

{corpo}

<div class="tl-fim">
  <p>Chegou ao fim. Agora abre o app e olha a previsão de hoje com esses olhos novos.</p>
  <a href="./app.html">Ver a previsão</a>
</div>

<script src="./tideline-config.js"></script>
<script src="./tideline-data.js"></script>
<script>
// barra de progresso
const prog = document.getElementById('prog');
addEventListener('scroll', () => {{
  const t = document.body.scrollHeight - innerHeight;
  prog.style.width = (t > 0 ? (scrollY / t) * 100 : 0) + '%';
}}, {{ passive: true }});

// leitura contada uma vez por sessão
if (window.tlTrack && !sessionStorage.getItem('tl_guia_lido')) {{
  sessionStorage.setItem('tl_guia_lido', '1');
  tlTrack('ViewContent', 'guia_abriu', {{ content_name: 'Guia Ler o Mar', content_category: 'ebook' }});
}}

// o PDF continua disponível pra quem quiser o arquivo. Só que agora é escolha, não caminho.
document.getElementById('btn-pdf').onclick = async (e) => {{
  const b = e.currentTarget, orig = b.textContent;
  b.disabled = true; b.textContent = 'Preparando…';
  try {{
    const c = window.TLData && await window.TLData.client();
    const {{ data: sess }} = await c.auth.getSession();
    const token = sess && sess.session && sess.session.access_token;
    if (!token) throw new Error('Entre na sua conta para baixar o PDF.');
    const r = await fetch('/api/ebook-link', {{ method: 'POST', headers: {{ authorization: 'Bearer ' + token }} }});
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'não consegui liberar o arquivo');
    const blob = await (await fetch(d.url)).blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Guia Ler o Mar - Tideline.pdf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    if (window.tlTrack) tlTrack('Lead', 'ebook_download', {{ content_name: 'Guia Ler o Mar' }});
    b.textContent = 'Baixado ✓';
    setTimeout(() => {{ b.disabled = false; b.textContent = orig; }}, 2500);
  }} catch (err) {{
    alert(err.message || 'Não consegui baixar agora.');
    b.disabled = false; b.textContent = orig;
  }}
}};
</script>
</body>
</html>
"""

DESTINO.write_text(html)
print(f"{DESTINO.name}: {len(html)/1e6:.2f} MB")
