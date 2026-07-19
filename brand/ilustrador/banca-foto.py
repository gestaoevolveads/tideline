# Prepara a foto de uma notícia pra virar capa de revista (Banca do Estúdio).
#
#   python3.12 banca-foto.py entrada.jpg saida.jpg
#
# O que ele garante (regras do Hudson, jul/2026):
#   1. CROP 4:5 (1080x1350) em volta do PONTO FOCAL da imagem, não do centro cego.
#      O foco é achado pela energia de bordas (onde a imagem "acontece": pessoas,
#      prancha, onda quebrando), com viés pro terço superior, onde ficam rostos.
#      É isso que evita decapitar gente no corte.
#   2. CONTRASTE do texto: mede a luminância nas faixas onde os templates põem
#      texto (topo e rodapé). Faixa clara demais ganha um degradê escuro (scrim),
#      na medida, até o texto branco passar com folga. Nada de texto ilegível.
#   3. Nunca preto e branco. Cores ficam como estão (leve aquecimento opcional
#      fica pros templates, que já têm seus filtros).
#
# Saída no stdout: JSON com o que foi feito (focal, luminâncias, scrims).

import json
import subprocess
import sys

import numpy as np

ALVO_W, ALVO_H = 1080, 1350  # 4:5, o formato das capas


def ler(caminho):
    """Decodifica qualquer imagem pra RGB via ffmpeg (sem depender de PIL)."""
    probe = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0',
         '-show_entries', 'stream=width,height', '-of', 'csv=p=0', caminho],
        capture_output=True, text=True)
    w, h = [int(x) for x in probe.stdout.strip().split(',')[:2]]
    raw = subprocess.run(
        ['ffmpeg', '-loglevel', 'error', '-i', caminho,
         '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
        capture_output=True).stdout
    img = np.frombuffer(raw, np.uint8)
    img = img[:w * h * 3].reshape(h, w, 3).astype(np.float32)
    return img


def salvar(img, caminho):
    h, w = img.shape[:2]
    dado = np.clip(img, 0, 255).astype(np.uint8).tobytes()
    subprocess.run(
        ['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo',
         '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-i', '-',
         '-q:v', '2', caminho],
        input=dado)


def focal_x(gray):
    """Centro de massa da energia de bordas na banda vertical do meio.
    Ignora as beiradas (céu liso, areia lisa) e acha onde a cena acontece."""
    gy, gx = np.gradient(gray)
    energia = np.abs(gx) + np.abs(gy)
    h = energia.shape[0]
    banda = energia[int(h * 0.15):int(h * 0.80), :]   # nem céu raso, nem rodapé
    porColuna = banda.sum(axis=0)
    porColuna = np.convolve(porColuna, np.ones(31) / 31, mode='same')  # suaviza
    total = porColuna.sum()
    if total <= 0:
        return 0.5
    x = float((porColuna * np.arange(len(porColuna))).sum() / total / len(porColuna))
    return min(max(x, 0.22), 0.78)  # nunca cola na borda


def main():
    entrada, saida = sys.argv[1], sys.argv[2]
    img = ler(entrada)
    h, w = img.shape[:2]
    gray = img.mean(axis=2)

    # ── 1. escala pra cobrir 1080x1350 e crop no ponto focal ──
    escala = max(ALVO_W / w, ALVO_H / h)
    nw, nh = int(round(w * escala)), int(round(h * escala))
    # redimensiona via ffmpeg (qualidade melhor que interpolação manual)
    dado = np.clip(img, 0, 255).astype(np.uint8).tobytes()
    raw = subprocess.run(
        ['ffmpeg', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
         '-s', f'{w}x{h}', '-i', '-', '-vf', f'scale={nw}:{nh}:flags=lanczos',
         '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
        input=dado, capture_output=True).stdout
    img = np.frombuffer(raw, np.uint8)[:nw * nh * 3].reshape(nh, nw, 3).astype(np.float32)

    fx = focal_x(gray)
    x0 = int(round(fx * nw - ALVO_W / 2))
    x0 = min(max(x0, 0), nw - ALVO_W)
    # viés vertical: se sobra altura, corta mais por baixo (rostos moram em cima)
    sobraY = nh - ALVO_H
    y0 = int(round(sobraY * 0.38)) if sobraY > 0 else 0
    y0 = min(max(y0, 0), max(nh - ALVO_H, 0))
    img = img[y0:y0 + ALVO_H, x0:x0 + ALVO_W]

    # ── 2. contraste: mede as zonas de texto e aplica scrim onde precisar ──
    gray2 = img.mean(axis=2)
    lumTopo = float(gray2[:int(ALVO_H * 0.30), :].mean())
    lumBase = float(gray2[int(ALVO_H * 0.62):, :].mean())

    y = np.arange(ALVO_H, dtype=np.float32)
    scrimTopo = 0.0
    scrimBase = 0.0
    if lumTopo > 128:                       # topo claro: texto do topo sofreria
        scrimTopo = min(0.50, (lumTopo - 128) / 160 + 0.22)
        peso = np.clip(1 - y / (ALVO_H * 0.34), 0, 1) ** 1.4
        img *= (1 - scrimTopo * peso)[:, None, None]
    if lumBase > 110:                       # rodapé claro: título gigante sofreria
        scrimBase = min(0.55, (lumBase - 110) / 150 + 0.28)
        peso = np.clip((y - ALVO_H * 0.55) / (ALVO_H * 0.45), 0, 1) ** 1.3
        img *= (1 - scrimBase * peso)[:, None, None]

    salvar(img, saida)
    print(json.dumps({
        'focalX': round(fx, 3), 'lumTopo': round(lumTopo), 'lumBase': round(lumBase),
        'scrimTopo': round(scrimTopo, 2), 'scrimBase': round(scrimBase, 2),
        'origem': f'{w}x{h}',
    }))


if __name__ == '__main__':
    main()
