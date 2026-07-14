#!/usr/bin/env python3
"""Filme analógico: transforma uma foto digital numa foto que parece filme.

NÃO usa IA. A sua foto continua sendo a sua foto: os rostos, o lugar e o instante são os
mesmos. A IA recriaria tudo do zero e você perderia a verdade da imagem. O que a gente faz
aqui é o que um colorista faz na mesa: mexe na curva, no grão e na luz.

O visual do tipo houseofsomos (e de quase todo perfil de surf que parece caro) é sempre a
mesma combinação, e cada peça tem uma razão física:

  PRETO LEVANTADO   Filme nunca registra preto absoluto. A sombra mais escura de um negativo
                    ainda tem densidade. É isso que dá o ar "lavado" e nostálgico.
  SPLIT TONE        Sombra puxada pro verde-azulado, luz puxada pro âmbar. É a assinatura do
                    filme vencido e do processamento cruzado.
  SATURAÇÃO BAIXA   Filme não grita cor. Ele sussurra.
  GRÃO              A prata do negativo. Sem grão, o resto vira filtro de celular.
  HALAÇÃO           A luz forte vaza para os lados no filme. É o brilho macio no céu e na
                    espuma, que nenhuma câmera digital faz sozinha.
  VINHETA           A lente antiga escurece os cantos. Prende o olho no meio.

Uso:  python3 filme.py entrada.jpg saida.jpg [preset]
"""
import sys
from PIL import Image, ImageEnhance, ImageFilter, ImageChops
import random

# ────────────────────────────── as receitas ──────────────────────────────
PRESETS = {
    'somos': {                      # o do houseofsomos: verão quente, meio lavado
        'nome': 'Verão analógico',
        'preto': 22, 'branco': 246,
        'sombra': (10, 22, 20), 'luz': (26, 12, -14),
        'saturacao': 0.86, 'contraste': 1.06, 'brilho': 1.02,
        'grao': 9, 'halacao': 0.20, 'vinheta': 0.22, 'quente': 1.05,
    },
    'kodak': {                      # cor mais rica, pele bonita, tipo Portra
        'nome': 'Kodak quente',
        'preto': 16, 'branco': 250,
        'sombra': (6, 12, 16), 'luz': (22, 10, -8),
        'saturacao': 1.02, 'contraste': 1.10, 'brilho': 1.01,
        'grao': 7, 'halacao': 0.16, 'vinheta': 0.18, 'quente': 1.06,
    },
    'desbotado': {                  # o filme esquecido no porta-luvas
        'nome': 'Desbotado',
        'preto': 34, 'branco': 240,
        'sombra': (14, 26, 24), 'luz': (18, 8, -6),
        'saturacao': 0.70, 'contraste': 0.94, 'brilho': 1.05,
        'grao': 12, 'halacao': 0.26, 'vinheta': 0.28, 'quente': 1.03,
    },
    'frio': {                       # manhã de inverno, mar cinza
        'nome': 'Manhã fria',
        'preto': 20, 'branco': 246,
        'sombra': (0, 16, 30), 'luz': (10, 8, 4),
        'saturacao': 0.80, 'contraste': 1.08, 'brilho': 1.0,
        'grao': 8, 'halacao': 0.14, 'vinheta': 0.20, 'quente': 0.97,
    },
    'pb': {                         # preto e branco de jornal de surf
        'nome': 'Preto e branco',
        'preto': 14, 'branco': 248,
        'sombra': (0, 0, 0), 'luz': (0, 0, 0),
        'saturacao': 0.0, 'contraste': 1.18, 'brilho': 1.0,
        'grao': 14, 'halacao': 0.18, 'vinheta': 0.26, 'quente': 1.0,
    },
}


def _curva(im, preto, branco):
    """Levanta o preto e baixa o branco. É o que impede a foto de 'bater no fundo'."""
    faixa = branco - preto
    tabela = [min(255, max(0, int(preto + i * faixa / 255))) for i in range(256)]
    return im.point(tabela * 3)


def _split_tone(im, sombra, luz):
    """Cor diferente na sombra e na luz. A assinatura do filme."""
    r, g, b = im.split()
    lum = im.convert('L')
    # máscara: onde é sombra (escuro) e onde é luz (claro)
    mask_sombra = lum.point(lambda v: 255 - v)
    mask_luz = lum

    def aplicar(canal, delta_sombra, delta_luz):
        s = canal.point(lambda v: min(255, max(0, v + delta_sombra)))
        l = canal.point(lambda v: min(255, max(0, v + delta_luz)))
        canal = Image.composite(s, canal, mask_sombra.point(lambda v: int(v * 0.5)))
        canal = Image.composite(l, canal, mask_luz.point(lambda v: int(v * 0.5)))
        return canal

    r = aplicar(r, sombra[0], luz[0])
    g = aplicar(g, sombra[1], luz[1])
    b = aplicar(b, sombra[2], luz[2])
    return Image.merge('RGB', (r, g, b))


def _halacao(im, forca):
    """A luz forte vaza pros lados. É o brilho macio que a câmera digital não faz."""
    if forca <= 0:
        return im
    lum = im.convert('L')
    brilho = lum.point(lambda v: 255 if v > 205 else 0)      # só o que é MUITO claro
    borrado = im.filter(ImageFilter.GaussianBlur(radius=max(im.size) / 90))
    brilho = brilho.filter(ImageFilter.GaussianBlur(radius=max(im.size) / 120))
    return Image.composite(ImageChops.screen(im, borrado), im,
                           brilho.point(lambda v: int(v * forca)))


def _grao(im, forca):
    """A prata do negativo. Sem isso, tudo vira filtro de celular."""
    if forca <= 0:
        return im
    w, h = im.size
    random.seed(7)                                   # mesmo grão sempre: resultado reproduzível
    ruido = Image.effect_noise((w, h), forca * 2.2).convert('L')
    ruido = ruido.filter(ImageFilter.GaussianBlur(0.4))
    cinza = Image.new('RGB', (w, h), (128, 128, 128))
    ruido_rgb = Image.merge('RGB', (ruido, ruido, ruido))
    return Image.blend(im, ImageChops.overlay(im, ruido_rgb), 0.42)


def _vinheta(im, forca):
    """A lente antiga escurece os cantos e prende o olho no meio."""
    if forca <= 0:
        return im
    w, h = im.size
    mascara = Image.new('L', (w, h), 0)
    # um oval branco no centro, borrado: fora dele, escurece
    from PIL import ImageDraw
    d = ImageDraw.Draw(mascara)
    d.ellipse([-w * 0.22, -h * 0.22, w * 1.22, h * 1.22], fill=255)
    mascara = mascara.filter(ImageFilter.GaussianBlur(min(w, h) / 7))
    escuro = ImageEnhance.Brightness(im).enhance(1 - forca)
    return Image.composite(im, escuro, mascara)


def aplicar(caminho_entrada, caminho_saida, preset='somos'):
    p = PRESETS.get(preset, PRESETS['somos'])
    im = Image.open(caminho_entrada).convert('RGB')

    im = ImageEnhance.Color(im).enhance(p['saturacao'])
    im = ImageEnhance.Contrast(im).enhance(p['contraste'])
    im = ImageEnhance.Brightness(im).enhance(p['brilho'])

    if p['quente'] != 1.0:                            # temperatura: mais vermelho, menos azul
        r, g, b = im.split()
        k = p['quente']
        r = r.point(lambda v: min(255, int(v * k)))
        b = b.point(lambda v: min(255, int(v / k)))
        im = Image.merge('RGB', (r, g, b))

    im = _split_tone(im, p['sombra'], p['luz'])
    im = _curva(im, p['preto'], p['branco'])          # o preto levantado vem por ÚLTIMO na cor
    im = _halacao(im, p['halacao'])
    im = _vinheta(im, p['vinheta'])
    im = _grao(im, p['grao'])                         # o grão é a última camada, como no negativo

    im.save(caminho_saida, quality=94)
    return im


if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit('uso: filme.py entrada.jpg saida.jpg [' + '|'.join(PRESETS) + ']')
    aplicar(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 'somos')
