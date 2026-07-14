#!/usr/bin/env python3
"""Monta o vídeo da abertura, quadro a quadro.

Por que quadro a quadro e não gravação de tela: gravar em tempo real depende da máquina
estar livre, perde quadros e o resultado muda a cada tentativa. Aqui cada quadro é uma
FUNÇÃO DO TEMPO (render(t) no tv.html), então o navegador desenha o instante exato, a gente
fotografa, e o ffmpeg costura. O vídeo sai idêntico toda vez, em qualquer máquina.

Uso:  python3 gerar.py [duracao] [fps]
Saída: ~/Downloads/Tideline-Motion/
"""
import pathlib, subprocess, sys, tempfile, shutil

AQUI = pathlib.Path(__file__).resolve().parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SAIDA = pathlib.Path.home() / "Downloads" / "Tideline-Motion"

ARQ = sys.argv[3] if len(sys.argv) > 3 else "tv.html"
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 2.2
FPS = int(sys.argv[2]) if len(sys.argv) > 2 else 30
W, H = 1080, 1920

SAIDA.mkdir(parents=True, exist_ok=True)
frames = pathlib.Path(tempfile.mkdtemp())

total = int(DUR * FPS)
print(f"Renderizando {total} quadros ({DUR}s a {FPS}fps, {W}x{H})...")

for i in range(total):
    t = i / FPS
    destino = frames / f"f{i:04d}.png"
    subprocess.run([
        CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
        f"--window-size={W},{H}",
        f"--screenshot={destino}",
        "--virtual-time-budget=4000",
        f"file://{AQUI}/{ARQ}?t={t:.4f}",
    ], capture_output=True)
    if not destino.exists():
        print(f"  falhou no quadro {i}")
        break
    if i % 10 == 0:
        print(f"  {i}/{total}")

feitos = sorted(frames.glob("*.png"))
print(f"{len(feitos)} quadros prontos. Montando o vídeo...")

nome = "tideline-encerramento-story" if "off" in ARQ else "tideline-abertura-story"
mp4 = SAIDA / f"{nome}.mp4"
subprocess.run([
    "ffmpeg", "-y", "-framerate", str(FPS),
    "-i", str(frames / "f%04d.png"),
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-profile:v", "high", "-crf", "16",       # qualidade alta: o grão não pode virar borrão
    "-movflags", "+faststart",
    str(mp4),
], capture_output=True)

# um GIF pra você conferir rápido, sem abrir editor
gif = SAIDA / f"{nome}-previa.gif"
subprocess.run([
    "ffmpeg", "-y", "-framerate", str(FPS), "-i", str(frames / "f%04d.png"),
    "-vf", "scale=320:-1:flags=lanczos,fps=15", str(gif),
], capture_output=True)

shutil.rmtree(frames, ignore_errors=True)

if mp4.exists():
    mb = mp4.stat().st_size / 1e6
    print(f"\nPronto:\n  {mp4}  ({mb:.1f} MB)\n  {gif}")
else:
    print("\nO ffmpeg não gerou o vídeo. Confira se ele está instalado.")
