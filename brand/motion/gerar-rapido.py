#!/usr/bin/env python3
"""Renderiza o motion abrindo o Chrome UMA vez só.

O gerador antigo abria um Chrome inteiro por quadro. Num vídeo de 54 quadros, são 54
processos, e cada um leva uns 3 segundos só pra subir: quase todo o tempo era o navegador
nascendo e morrendo, não desenhando.

Aqui o Chrome abre uma vez, desenha os quadros em sequência e manda cada um pra este
servidorzinho, que grava no disco. Mesmo desenho, mesma qualidade, uma fração do tempo.

Uso:  python3 gerar-rapido.py [arquivo.html] [duracao] [fps]
Saída: ~/Downloads/Tideline-Motion/
"""
import base64, http.server, json, pathlib, shutil, socketserver, subprocess, sys, tempfile, threading, time

AQUI = pathlib.Path(__file__).resolve().parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SAIDA = pathlib.Path.home() / "Downloads" / "Tideline-Motion"

ARQ = sys.argv[1] if len(sys.argv) > 1 else "tv.html"
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 1.8
FPS = int(sys.argv[3]) if len(sys.argv) > 3 else 30
W, H = 1080, 1920
TOTAL = int(DUR * FPS)

frames = pathlib.Path(tempfile.mkdtemp())
recebidos = {"n": 0}
pronto = threading.Event()


class Coletor(http.server.SimpleHTTPRequestHandler):
    """Recebe cada quadro do navegador e grava. O navegador só precisa saber postar."""

    def do_POST(self):
        tam = int(self.headers.get('content-length', 0))
        corpo = json.loads(self.rfile.read(tam))
        i = corpo['i']
        dados = corpo['png'].split(',', 1)[1]
        (frames / f"f{i:04d}.png").write_bytes(base64.b64decode(dados))
        recebidos['n'] += 1
        if recebidos['n'] % 10 == 0:
            print(f"  {recebidos['n']}/{TOTAL}")
        if recebidos['n'] >= TOTAL:
            pronto.set()
        self.send_response(200)
        self.send_header('access-control-allow-origin', '*')
        self.end_headers()
        self.wfile.write(b'ok')

    def do_GET(self):
        # serve o próprio motion e uma página que percorre os quadros
        if self.path.startswith('/roda'):
            html = f"""<!doctype html><meta charset=utf-8>
<body style="margin:0;background:#111">
<iframe id="f" src="/{ARQ}?t=0" width="{W}" height="{H}"
        style="border:0;transform:scale(.25);transform-origin:top left"></iframe>
<script>
// Um Chrome só, desenhando todos os quadros em sequência. A janela do iframe recarrega o
// motion com o t de cada quadro, e a gente fotografa o canvas dele com toDataURL.
const TOTAL = {TOTAL}, FPS = {FPS};
const f = document.getElementById('f');

function esperarQuadro(t){{
  return new Promise(ok => {{
    f.onload = () => setTimeout(ok, 30);   // um respiro pro canvas terminar de pintar
    f.src = '/{ARQ}?t=' + t.toFixed(4);
  }});
}}

(async () => {{
  for (let i = 0; i < TOTAL; i++) {{
    await esperarQuadro(i / FPS);
    const c = f.contentDocument.getElementById('c');
    const png = c.toDataURL('image/png');
    await fetch('/', {{ method:'POST', body: JSON.stringify({{ i, png }}) }});
  }}
  document.title = 'fim';
}})();
</script></body>"""
            self.send_response(200)
            self.send_header('content-type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(html.encode())
            return
        # qualquer outro caminho: serve os arquivos da pasta do motion
        caminho = AQUI / self.path.lstrip('/').split('?')[0]
        if caminho.exists() and caminho.is_file():
            self.send_response(200)
            self.send_header('content-type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(caminho.read_bytes())
        else:
            self.send_error(404)

    def log_message(self, *a):
        pass


PORTA = 8791
servidor = socketserver.TCPServer(("127.0.0.1", PORTA), Coletor)
threading.Thread(target=servidor.serve_forever, daemon=True).start()

print(f"Renderizando {TOTAL} quadros de {ARQ} ({DUR}s @ {FPS}fps) com UM Chrome...")
t0 = time.time()

chrome = subprocess.Popen([
    CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
    f"--window-size={W//4},{H//4}",
    "--virtual-time-budget=600000",
    f"http://127.0.0.1:{PORTA}/roda",
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

pronto.wait(timeout=600)
chrome.terminate()
servidor.shutdown()

feitos = sorted(frames.glob("*.png"))
print(f"{len(feitos)} quadros em {time.time()-t0:.0f}s. Montando o vídeo...")

SAIDA.mkdir(parents=True, exist_ok=True)
NOMES = {
    'tv.html': 'abertura-tv-ligando',
    'tv-off.html': 'encerramento-tv-desligando',
    'vhs.html': 'abertura-vhs',
    'filme.html': 'abertura-rolo-de-filme',
    'fisheye.html': 'abertura-olho-de-peixe',
    'sticker.html': 'abertura-adesivo',
}
nome = 'tideline-' + NOMES.get(ARQ, ARQ.replace('.html',''))
mp4 = SAIDA / f"{nome}.mp4"

subprocess.run(["ffmpeg", "-y", "-framerate", str(FPS), "-i", str(frames / "f%04d.png"),
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16",
                "-movflags", "+faststart", str(mp4)], capture_output=True)
subprocess.run(["ffmpeg", "-y", "-framerate", str(FPS), "-i", str(frames / "f%04d.png"),
                "-vf", "scale=320:-1:flags=lanczos,fps=15", str(SAIDA / f"{nome}-previa.gif")],
               capture_output=True)

shutil.rmtree(frames, ignore_errors=True)
print(f"\nPronto em {time.time()-t0:.0f}s: {mp4}")
