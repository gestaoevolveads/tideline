#!/usr/bin/env python3
"""Monta o carrossel do Instagram que vende o Guia Ler o Mar.

Renderiza 9 cards em 1080x1350 (o retrato do feed, que ocupa mais tela na timeline)
direto na pasta ~/Downloads/Tideline-Carrossel-Guia/.

A capa é a capa de verdade do guia, com a mesma foto. Depois disso o carrossel segue a
lógica de quem lê: primeiro o problema que a pessoa reconhece, depois o que é a coisa,
depois por que ela é confiável, depois as objeções, e só no fim o pedido.
"""
import base64, pathlib, subprocess, tempfile, os

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SAIDA = pathlib.Path.home() / "Downloads" / "Tideline-Carrossel-Guia"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

import re
ebook = (RAIZ / "ebook" / "ler-o-mar.html").read_text()
FOTO = re.search(r'\.capa \.bg\{.*?url\(data:image/jpeg;base64,([^)]+)\)', ebook, re.S).group(1)
ILUS = re.findall(r'<div class="art" style="background-image:url\(data:image/jpeg;base64,([^)]+)\)', ebook)

CSS = """
:root{
  --deep:#172726; --mid:#243F3D; --muted:#476664;
  --surface:#D3E2DE; --surface2:#E8F0ED; --paper:#F2EFE9;
  --accent:#F95831;
  --ff:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif;
}
*{box-sizing:border-box; margin:0; padding:0}
body{ background:#555; font-family:var(--ff); -webkit-font-smoothing:antialiased }

.card{
  width:1080px; height:1350px; position:relative; overflow:hidden;
  background:var(--paper); color:var(--deep); display:flex; flex-direction:column;
  padding:96px 88px 88px;
}
.card.escuro{ background:var(--deep); color:var(--paper) }
.card.verde{ background:var(--surface); color:var(--deep) }

/* a marca assina embaixo, sempre no mesmo lugar. Repetição é o que constrói memória. */
.assina{ position:absolute; left:88px; right:88px; bottom:64px;
  display:flex; justify-content:space-between; align-items:center;
  font-size:26px; letter-spacing:-.01em }
.assina .t{ font-weight:300 } .assina .l{ font-weight:700 } .assina .d{ color:var(--accent) }
.assina .n{ font-size:22px; font-weight:600; color:var(--muted) }
.card.escuro .assina .n{ color:rgba(211,226,222,.5) }

.kicker{ font-size:24px; font-weight:700; letter-spacing:.22em; text-transform:uppercase;
  color:var(--accent); margin-bottom:34px }
h2{ font-size:82px; font-weight:700; line-height:1.06; letter-spacing:-.025em; margin-bottom:34px; text-wrap:balance }
h2.pequeno{ font-size:66px }
/* A medida (comprimento da linha) é o que decide se o parágrafo parece arrumado. Curta
   demais, a borda direita fica serrilhada e o texto parece desalinhado, mesmo estando.
   Entre 30 e 40 caracteres é onde o olho descansa num card de feed.
   text-wrap:pretty evita a palavra órfã sozinha na última linha. */
p{ font-size:34px; line-height:1.5; color:var(--muted); max-width:32ch; text-wrap:pretty }
.card.escuro p{ color:rgba(234,242,239,.78) }
p + p{ margin-top:26px }
b{ font-weight:700; color:var(--deep) }
.card.escuro b{ color:var(--paper) }

/* Todo o conteúdo ancorado embaixo, à esquerda, como na capa. Assim o olho pousa
   sempre no mesmo canto ao deslizar, e a foto ou o vazio de cima viram respiro.
   O padding de baixo é o que impede o texto de encostar na assinatura. */
.centro{ flex:1; display:flex; flex-direction:column; justify-content:flex-end; padding-bottom:44px }

/* listas: número laranja, texto que respira */
.lista{ display:flex; flex-direction:column; gap:26px; margin-top:8px }
.item{ display:flex; gap:24px; align-items:baseline }
.item .n{ font-size:28px; font-weight:700; color:var(--accent); min-width:44px }
.item .t{ font-size:33px; line-height:1.35; font-weight:500 }
.card.escuro .item .t{ color:var(--paper) }

.blocos{ display:flex; flex-direction:column; gap:30px; margin-top:10px }
.bloco{ background:rgba(255,255,255,.72); border-radius:22px; padding:34px 36px }
.card.escuro .bloco{ background:rgba(255,255,255,.06) }
.bloco .q{ font-size:30px; font-weight:700; margin-bottom:12px }
.bloco .a{ font-size:29px; line-height:1.45; color:var(--muted) }
.card.escuro .bloco .a{ color:rgba(234,242,239,.72) }

.numerao{ font-size:200px; font-weight:700; line-height:.9; letter-spacing:-.04em; color:var(--accent) }

.ilus{ width:100%; height:420px; border-radius:22px; background-size:cover;
  background-position:center; margin-top:52px }

.cta{ display:inline-block; align-self:flex-start; background:var(--accent); color:#fff;
  font-size:34px; font-weight:700; padding:28px 44px; border-radius:18px; margin-top:12px }

/* ---------- a capa: a capa do guia mesmo ---------- */
.capa{ padding:0; color:var(--paper) }
.capa .bg{ position:absolute; inset:0;
  background:
    linear-gradient(180deg, rgba(23,39,38,.78) 0%, rgba(23,39,38,.30) 26%,
      rgba(23,39,38,.36) 46%, rgba(23,39,38,.88) 74%, rgba(23,39,38,.97) 100%),
    url(data:image/jpeg;base64,FOTO) center/cover;
}
.capa .conteudo{ position:relative; z-index:2; height:100%; display:flex; flex-direction:column;
  justify-content:space-between; padding:96px 88px 88px }
.capa .selo{ font-size:24px; font-weight:700; letter-spacing:.22em; text-transform:uppercase; color:var(--accent) }
.capa h1{ font-size:150px; font-weight:700; line-height:.98; letter-spacing:-.035em }
.capa h1 .o{ color:var(--accent) }
.capa .sub{ font-size:36px; line-height:1.45; color:rgba(234,242,239,.9); max-width:24ch; margin-top:34px }
.capa .faixa{ margin-top:44px; padding-top:34px; border-top:1px solid rgba(211,226,222,.24);
  display:flex; justify-content:space-between; align-items:center }
.capa .faixa .wm{ font-size:34px; color:var(--paper) }
.capa .faixa .wm b{ color:var(--paper) }   /* sem isso o "line" herda o escuro e some no fundo escuro */
.capa .faixa .free{ font-size:24px; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:var(--accent) }
"""

def assina(n):
    return f'<div class="assina"><span><span class="t">tide</span><span class="l">line</span><span class="d">.</span></span><span class="n">{n}/9</span></div>'

CARDS = []

# 1. A capa do guia. Ela para o dedo sozinha.
CARDS.append(f'''
<div class="card capa">
  <div class="bg"></div>
  <div class="conteudo">
    <div class="selo">Guia Tideline</div>
    <div>
      <h1>Ler<br>o mar<span class="o">.</span></h1>
      <div class="sub">O que a previsão está dizendo, e por que quase ninguém entende.</div>
      <div class="faixa">
        <span class="wm"><span class="t" style="font-weight:300">tide</span><b>line</b><span style="color:var(--accent)">.</span></span>
        <span class="free">grátis no app</span>
      </div>
    </div>
  </div>
</div>''')

# 2. O problema. Começa por onde a pessoa já está.
CARDS.append(f'''
<div class="card escuro">
  <div class="centro">
    <div class="kicker">Você já passou por isso</div>
    <h2>Todo mundo já<br>foi na fé e voltou<br>de mãos vazias.</h2>
    <p>A previsão não mentiu. Ela só nunca foi traduzida pra você, <b>na sua praia, naquele dia</b>.</p>
  </div>
  {assina(2)}
</div>''')

# 3. O que é.
CARDS.append(f'''
<div class="card">
  <div class="centro">
    <div class="kicker">O que é</div>
    <h2>21 páginas<br>que traduzem<br>o oceano.</h2>
    <p>Escrito por quem estuda o mar e surfa desde criança, no português que se fala na areia.</p>
    <p>Você vai <b>entender</b> a previsão, não decorar tabela.</p>
  </div>
  {assina(3)}
</div>''')

# 4. O que tem dentro. Concreto vende, promessa vaga não.
CARDS.append(f'''
<div class="card verde">
  <div class="centro">
    <div class="kicker">O que tem dentro</div>
    <h2 class="pequeno">Os nove capítulos,<br>na ordem em que<br>o mar acontece.</h2>
    <div class="lista">
      <div class="item"><span class="n">01</span><span class="t">A onda que você pega nasceu longe</span></div>
      <div class="item"><span class="n">02</span><span class="t">O período, o número que quase ninguém olha</span></div>
      <div class="item"><span class="n">03</span><span class="t">A altura mente um pouco</span></div>
      <div class="item"><span class="n">04</span><span class="t">A direção e a janela da sua praia</span></div>
      <div class="item"><span class="n">05</span><span class="t">O vento esculpe ou destrói</span></div>
      <div class="item"><span class="n">06</span><span class="t">A maré muda a praia inteira</span></div>
      <div class="item"><span class="n">07</span><span class="t">O fundo decide como ela quebra</span></div>
      <div class="item"><span class="n">08</span><span class="t">A corrente que assusta e salva</span></div>
      <div class="item"><span class="n">09</span><span class="t">A ordem certa de ler tudo</span></div>
    </div>
  </div>
  {assina(4)}
</div>''')

# 5. O desenho. Falamos do que ele FAZ, nunca de quem o fez: dizer "ilustrado à mão"
# seria mentira, e dizer que é IA seria burrice. O que importa é que ele ensina.
CARDS.append(f'''
<div class="card">
  <div class="centro">
    <div class="kicker">Como é lá dentro</div>
    <h2 class="pequeno">Um desenho vale<br>três parágrafos.</h2>
    <p>Corrente de retorno, refração, terral. As ideias difíceis viram imagem, e você entende antes de acabar de ler a legenda.</p>
    <div class="ilus" style="background-image:url(data:image/jpeg;base64,{ILUS[0]})"></div>
  </div>
  {assina(5)}
</div>''')

# 6. A vantagem de ler no app (o motivo de a pessoa entrar).
CARDS.append(f'''
<div class="card escuro">
  <div class="centro">
    <div class="kicker">Onde ele vive</div>
    <h2>Ele mora<br>dentro do app.</h2>
    <p>Você abre e lê, rolando, como qualquer coisa no celular. Sem PDF perdido na pasta de downloads.</p>
    <p>E, na mesma tela, a <b>previsão de hoje</b> pra você conferir o que acabou de aprender.</p>
  </div>
  {assina(6)}
</div>''')

# 7. Prova. A objeção real hoje é "isso é texto de robô?".
CARDS.append(f'''
<div class="card verde">
  <div class="centro">
    <div class="kicker">Por que confiar</div>
    <h2 class="pequeno">Nada aqui<br>é chute.</h2>
    <p>Cada número saiu de literatura técnica, de publicação da <b>Marinha do Brasil</b> ou de estudo revisado. As fontes estão listadas na última página, com nome e sobrenome.</p>
    <p>Se você achar algo que não bate com o que vê no mar, a gente corrige.</p>
  </div>
  {assina(7)}
</div>''')

# 8. Objeções, ditas com as palavras da própria pessoa.
CARDS.append(f'''
<div class="card">
  <div class="centro">
    <div class="kicker">Antes que você pergunte</div>
    <h2 class="pequeno" style="margin-bottom:40px">Três dúvidas<br>honestas.</h2>
    <div class="blocos">
      <div class="bloco">
        <div class="q">"Sou iniciante, vou entender?"</div>
        <div class="a">Foi escrito pensando em você. Quem já surfa há vinte anos também aprende, mas ninguém precisa saber nada pra começar.</div>
      </div>
      <div class="bloco">
        <div class="q">"Se eu aprender, largo o app?"</div>
        <div class="a">Ao contrário. O guia ensina a ler. O app é quem olha o mar de 87 praias por você, todo dia, de hora em hora.</div>
      </div>
      <div class="bloco">
        <div class="q">"Vou ter que pagar?"</div>
        <div class="a">Não. Ele é presente de boas-vindas de quem cria conta, inclusive no teste grátis de 14 dias.</div>
      </div>
    </div>
  </div>
  {assina(8)}
</div>''')

# 9. O pedido. Um só, e fácil.
CARDS.append(f'''
<div class="card escuro">
  <div class="centro">
    <div class="kicker">Como pegar o seu</div>
    <h2>Crie sua conta<br>e ele já está lá.</h2>
    <p>Teste grátis de 14 dias, sem cartão. O guia é seu no primeiro dia, e continua seu depois.</p>
    <div class="cta">tideline.com.br</div>
  </div>
  {assina(9)}
</div>''')

HTML = f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><style>{CSS.replace('FOTO', FOTO)}</style></head>
<body>{''.join(CARDS)}</body></html>"""

SAIDA.mkdir(parents=True, exist_ok=True)
tmp = pathlib.Path(tempfile.mkdtemp()) / "carrossel.html"
tmp.write_text(HTML)

# um screenshot por card, no tamanho exato do feed
for i in range(len(CARDS)):
    unico = HTML.replace("<body>", "<body>").replace(
        "".join(CARDS), CARDS[i])
    p = tmp.parent / f"c{i+1}.html"
    p.write_text(unico)
    destino = SAIDA / f"{i+1:02d}.png"
    r = subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                        "--window-size=1080,1350", f"--screenshot={destino}",
                        "--virtual-time-budget=9000", f"file://{p}"],
                       capture_output=True, text=True)
    if not destino.exists():
        print("  FALHOU:", destino.name, r.stderr[-200:])
        continue
    print(f"  {destino.name}")

print(f"\n{len(CARDS)} cards em {SAIDA}")
