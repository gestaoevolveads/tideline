#!/usr/bin/env python3
"""Carimba a estampa REAL na foto gerada.

Por que isso existe:
    Modelo de imagem não sabe escrever. Ele acerta o desenho do mascote (é traço), mas na
    camisa do wordmark ele escreveu "tideine." e comeu o L. Uma foto de loja com a marca
    escrita errada é pior do que não ter foto nenhuma.

    Então a logo não é gerada: ela é RECORTADA do mockup real da Montink (o mesmo arquivo
    que a gráfica imprime) e colada na foto. O que aparece no peito passa a ser, literalmente,
    o arquivo da marca.

    A cola usa multiply, que é como tinta se comporta sobre tecido: escurece onde há tinta e
    deixa a sombra e a dobra do pano passarem por baixo. Colar por cima (normal) daria aquele
    adesivo chapado que denuncia a montagem na hora.

Uso:
    python3 estampar.py foto.jpg mockup.png cx cy largura [rotacao]
      cx cy    centro da estampa na foto, em % da largura/altura (ex: 46 42)
      largura  largura da estampa, em % da largura da foto (ex: 11)
      rotacao  graus, opcional (a camisa nunca está perfeitamente reta)
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def recortar_estampa(mockup):
    """Tira a estampa do mockup e devolve com fundo transparente."""
    im = Image.open(mockup).convert('RGB')
    g = np.array(im.convert('L')).astype(np.int16)

    # A estampa é a única coisa escura no meio do peito. Procuro só ali para não pegar o
    # cabide, a sombra da dobra ou a borda da camisa.
    h, w = g.shape
    jan = g[int(h * .33):int(h * .55), int(w * .30):int(w * .70)]
    ys, xs = np.where(jan < 120)
    if not len(xs):
        raise SystemExit('não achei estampa escura no peito do mockup')
    x0 = int(w * .30) + xs.min(); x1 = int(w * .30) + xs.max()
    y0 = int(h * .33) + ys.min(); y1 = int(h * .33) + ys.max()

    m = 6                                   # uma folga, pra não cortar a perna do "p"
    corte = im.crop((x0 - m, y0 - m, x1 + m + 1, y1 + m + 1))

    # O fundo do recorte é o tecido (claro). Transformo claridade em transparência: onde é
    # branco some, onde é tinta fica. É o oposto de recortar na mão, e não deixa serrilha.
    c = np.array(corte).astype(np.float32)
    lum = c.mean(axis=2)
    alfa = np.clip((250 - lum) / 90 * 255, 0, 255).astype(np.uint8)
    rgba = np.dstack([c.astype(np.uint8), alfa])
    return Image.fromarray(rgba, 'RGBA')


def main():
    foto, mockup, cx, cy, larg = sys.argv[1], sys.argv[2], *map(float, sys.argv[3:6])
    rot = float(sys.argv[6]) if len(sys.argv) > 6 else 0.0

    base = Image.open(foto).convert('RGB')
    W, H = base.size
    est = recortar_estampa(mockup)

    nova_l = max(8, int(W * larg / 100))
    nova_a = max(4, int(est.height * nova_l / est.width))
    est = est.resize((nova_l, nova_a), Image.LANCZOS)
    if rot:
        est = est.rotate(rot, resample=Image.BICUBIC, expand=True)

    px = int(W * cx / 100 - est.width / 2)
    py = int(H * cy / 100 - est.height / 2)

    # Antes de carimbar o certo, apaga o errado. O modelo já escreveu alguma coisa ali
    # ("tideine.", sem o L), e carimbar por cima deixaria as duas sobrepostas.
    #
    # Preencher com uma cor chapada deixava um retângulo visível: o peito tem sombra e dobra,
    # e um bloco de cor lisa denuncia a montagem na hora. Quem apaga o texto é um filtro de
    # MEDIANA: ele engole traço fino escuro (a letra) e preserva o degradê do tecido, porque a
    # sombra é larga e a letra não. E a colagem entra com a borda esfumada, sem emenda.
    # A margem é generosa de propósito: o texto que o modelo inventou quase nunca cai no mesmo
    # lugar exato onde eu vou carimbar o certo. Com margem curta sobrava um fantasma da letra
    # velha logo abaixo da nova.
    mg = max(12, int(est.height * 0.9))
    limpa = base.filter(ImageFilter.MedianFilter(size=max(3, (est.height // 2) * 2 + 1)))
    mascara = Image.new('L', base.size, 0)
    ImageDraw.Draw(mascara).rectangle(
        [px - mg, py - mg, px + est.width + mg, py + est.height + mg], fill=255)
    mascara = mascara.filter(ImageFilter.GaussianBlur(11))   # a esfumada
    base = Image.composite(limpa, base, mascara)

    # MULTIPLY na mão: a tinta escurece o pano, e a dobra do pano continua aparecendo por
    # baixo dela. Só multiplico onde a estampa tem tinta (alfa), com a força do alfa.
    camada = Image.new('RGBA', base.size, (0, 0, 0, 0))
    camada.paste(est, (px, py))
    c = np.array(camada).astype(np.float32)
    b = np.array(base).astype(np.float32)
    tinta = c[:, :, :3] / 255.0
    a = (c[:, :, 3:4] / 255.0) * 0.92          # 0.92: a tinta nunca é 100% opaca no algodão
    saida = b * (1 - a) + (b * tinta) * a
    Image.fromarray(saida.astype(np.uint8)).save(foto, quality=95)
    print(f'estampa real carimbada em {foto}')


if __name__ == '__main__':
    main()
