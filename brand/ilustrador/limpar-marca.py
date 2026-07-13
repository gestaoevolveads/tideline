#!/usr/bin/env python3
"""Apaga a estrelinha que o Gemini carimba no canto inferior direito.

Cortar não resolve: o carimbo fica uns 8% para dentro da imagem, e cortar tanto
assim estraga o enquadramento. Então reconstruímos o fundo por baixo dele.

Como funciona: no canto de baixo à direita, o carimbo é uma marca CLARA e macia
sobre o fundo. Um filtro de mediana com janela grande devolve o fundo sem ele.
Comparando os dois, tudo que ficou mais claro que o fundo é carimbo, e só isso é
substituído. O traço da ilustração, que é escuro, nem é tocado.

Uso:  python3 limpar-marca.py imagem.png [saida.png]
"""
import sys
from PIL import Image, ImageFilter, ImageChops

# o canto onde o carimbo mora, em fração da imagem
CANTO = 0.22
# o quanto mais claro que o fundo um pixel precisa ser para ser considerado carimbo
LIMIAR = 5


def limpar(caminho, saida=None):
    im = Image.open(caminho).convert("RGB")
    w, h = im.size
    cx, cy = int(w * (1 - CANTO)), int(h * (1 - CANTO))
    canto = im.crop((cx, cy, w, h))

    # a janela precisa ser MAIOR que o miolo do carimbo, senão a mediana enxerga
    # só carimbo ali dentro e "reconstrói" o carimbo de novo.
    janela = max(31, (min(canto.size) // 3) | 1)
    fundo = canto.filter(ImageFilter.MedianFilter(size=janela))

    # onde o canto é mais CLARO que o fundo reconstruído, é carimbo
    mais_claro = ImageChops.subtract(canto.convert("L"), fundo.convert("L"))
    mascara = mais_claro.point(lambda v: 255 if v > LIMIAR else 0)
    mascara = mascara.filter(ImageFilter.MaxFilter(9))          # engorda pra pegar a borda macia
    mascara = mascara.filter(ImageFilter.GaussianBlur(2))       # suaviza a emenda

    canto = Image.composite(fundo, canto, mascara)
    im.paste(canto, (cx, cy))
    im.save(saida or caminho)
    return im


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("uso: limpar-marca.py imagem.png [saida.png]")
    limpar(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
