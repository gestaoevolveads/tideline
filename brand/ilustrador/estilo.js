// Motor de estilo do Tideline.
// Fonte da verdade humana: brand/tideline-illustration-style.md
// Este arquivo é aquele documento virado prompt executável.
// Se o estilo da marca mudar lá, mude aqui também.

const PALETA = 'burnt orange #F95831, pale sage #D3E2DE, dark teal #243F3D, muted teal #476664, near-black teal #172726';

const TRACO = `Hand-drawn retro surf cartoon illustration, 1970s underground comix and vintage surf magazine style, Rick Griffin era surf zine art, screen-print flat spot colors. Loose confident ink pen linework: irregular stroke weight, slightly wobbly lines, corners that do not perfectly close, occasional double strokes, as if drawn fast by a skilled hand. Flat solid color fills ONLY: no gradients, no shading, no volume, no digital brush texture. Strict five-color palette: ${PALETA}. Nothing outside this palette. Characters comically elongated and lanky: very long thin arms and legs, short torso, big feet, exaggerated keep-on-truckin scissor stride, wide grins with individually drawn teeth, sunglasses. The sun and the waves may be anthropomorphic and friendly. One scene, one action. Ground merely suggested by a loose horizon line and a few scribbled pebbles. Generous empty space. Orange is an accent on one or two elements only, never the dominant color.`;

const VARIANTES = {
  clara: {
    nome: 'Clara',
    desc: 'Fundo sálvia, traço teal. O padrão do app, do e-book e do feed.',
    fundo: 'Pale sage #D3E2DE background with dark teal #243F3D ink linework.',
    refs: ['01-clara-surfista.png', '03-clara-ondas.png', '04-clara-vento.png', '05-clara-corrente.png'],
  },
  nanquim: {
    nome: 'Nanquim',
    desc: 'Fundo quase preto, traço claro. Cartaz de noite, story, camiseta.',
    fundo: 'Near-black teal #172726 background with pale sage #D3E2DE ink linework, night-poster feel.',
    refs: ['02-nanquim-mascote.png', '01-clara-surfista.png'],
  },
};

// Cada linha aqui é um erro que já cometemos. Não apague sem motivo.
const NEGATIVOS = 'Absolutely NO text, NO letters, NO words, NO numbers, NO labels, NO captions, NO watermark and NO signature anywhere in the image. No gradients. No airbrush. No 3D render. No photorealism. No clean vector or Adobe Illustrator smoothness, no perfectly straight machine-drawn lines. No cute-childish or corporate-mascot styling. No colors outside the five listed.';

// Formatos que o Instagram realmente usa, em pixels exatos.
const FORMATOS = {
  quadrado: { w: 1080, h: 1080, ar: '1:1',  nome: 'Feed quadrado' },
  retrato:  { w: 1080, h: 1350, ar: '4:5',  nome: 'Feed retrato (mais área na timeline)' },
  paisagem: { w: 1920, h: 1080, ar: '16:9', nome: 'Paisagem / capa' },
  story:    { w: 1080, h: 1920, ar: '9:16', nome: 'Story e Reels' },
};

/**
 * Monta o prompt final que vai pro modelo.
 * @param {string} cena  O que acontece na imagem. Pode escrever em português.
 * @param {object} opts  { variante, didatico, comCroqui }
 */
function montarPrompt(cena, opts = {}) {
  const v = VARIANTES[opts.variante] || VARIANTES.clara;
  const p = [
    'Draw the scene below in EXACTLY the same drawing style, palette, line quality and character proportions as the attached reference images. The references define the style. Do not invent a different look.',
    '',
    `SCENE: ${cena}`,
    '',
    `STYLE: ${TRACO}`,
    v.fundo,
  ];
  if (opts.comCroqui) {
    // Lição cara: descrever geometria didática em texto não funciona, o modelo erra o
    // arranjo. Só um croqui anexado resolve. E jamais escrever rótulo em CAIXA ALTA no
    // prompt, porque o modelo desenha a palavra literalmente dentro da imagem.
    p.push(
      '',
      'GEOMETRY: the LAST attached image is a rough diagram of the intended layout. Follow its composition, positions and proportions faithfully, but redraw everything in the hand-drawn style of the other references. The diagram is a guide for placement, never for style.',
      'The idea must be readable at a glance from shape and color alone, with zero written labels.',
    );
  }
  p.push('', `AVOID: ${NEGATIVOS}`);
  return p.join('\n');
}

module.exports = { montarPrompt, VARIANTES, FORMATOS, PALETA, NEGATIVOS };
