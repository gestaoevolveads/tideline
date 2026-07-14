/* Fotos de campanha das camisas.
 * ─────────────────────────────────────────────────────────────────────────────
 * O mockup da Montink é um cabide num fundo preto. Serve pra loja, não vende nada no
 * Instagram. O que vende é a camisa VESTIDA, numa cena que a pessoa quer habitar.
 *
 * O que a gente manda pro modelo, e por quê:
 *
 *   1. O MOCKUP REAL (primeira imagem): é dele que sai a estampa. O modelo tem que copiar
 *      o desenho do peito EXATAMENTE. Se ele inventar a estampa, a foto é inútil: você
 *      estaria anunciando uma camisa que não existe.
 *   2. A CENA (o texto): onde, quando, quem, que luz. É aqui que mora a diferença entre
 *      foto de e-commerce e foto de campanha.
 *   3. A CÂMERA (o texto): o segredo do visual anos 2000 não é "filtro", é ÓPTICA. Filme
 *      35mm, flash direto na cara, grão, cor lavada. Descrever a câmera é o que impede a
 *      imagem de sair com aquela cara plástica de IA.
 *
 * O grão e a cor vêm depois, no filme.py, e não do modelo: assim ficam iguais em todas as
 * fotos e a marca fala uma língua só.
 * ───────────────────────────────────────────────────────────────────────────── */

/* A base que TODA foto carrega. É ela que mata a cara de IA. */
const CAMERA = `Shot on 35mm film, Kodak Gold or Portra, scanned from negative with visible grain.
Amateur-but-good photography from the early 2000s: slightly off-center framing, a moment caught rather than posed,
imperfect focus, natural skin with visible texture and pores, no retouching, no beauty filter, no plastic skin.
Real human proportions. Colors slightly faded and warm, blacks are lifted (never pure black), soft highlight bloom.
Depth of field is shallow but not artificial.`;

const NEGATIVO = `NOT a 3D render. NOT digital art. NOT AI-looking. No plastic skin, no airbrushing, no symmetrical
perfect face, no glossy studio lighting, no watermark, no text overlay, no logo other than the one printed on the shirt,
no extra fingers, no distorted hands, no duplicated garment seams. The fabric is NEVER wet, transparent,
see-through or clinging to the body: it is an opaque, dry, heavy cotton tee.`;

/* Uma regra que vale mais que todo o resto.
 *
 * Repare que ela NÃO diz onde a estampa fica. As duas camisas são diferentes: a do mascote
 * é pequena no peito esquerdo, a do wordmark é centralizada. Se a regra cravasse um lugar,
 * ela mentiria sobre metade do catálogo, e a foto anunciaria uma camisa que ninguém recebe.
 * Quem sabe onde a estampa fica é o mockup anexado, e é dele que o modelo tem que copiar. */
const ESTAMPA = `CRITICAL: the shirt worn in the photo must carry EXACTLY the same chest print as the attached
product mockup: same artwork, same size, same position on the chest, same colors. Copy it from the mockup. Do not
redesign it, do not enlarge it, do not move it, do not add any print that is not in the mockup. The garment is an
oversized boxy heavyweight t-shirt with drop shoulders, exactly like the mockup.`;

const CENAS = {
  praia: {
    nome: 'Praia ao amanhecer',
    desc: 'Areia, luz baixa, prancha. O óbvio, mas feito direito.',
    txt: `A person standing on the sand at dawn wearing the t-shirt, a surfboard resting beside them, the ocean
    behind out of focus. Low warm sun, long shadows, wind in the hair. Photographed from slightly below, close enough
    to see the fabric texture.`,
  },
  flash: {
    nome: 'Flash na noite',
    desc: 'Flash direto, rua molhada, fim de noite. A cara dos anos 2000.',
    txt: `A young person wearing the t-shirt at night on a wet coastal street, photographed with a DIRECT ON-CAMERA
    FLASH: harsh light on the subject, hard shadow behind, background falling into darkness. Slightly red eyes from the
    flash. Wet asphalt reflecting light. The unposed, snapshot look of a disposable camera.`,
  },
  kombi: {
    nome: 'Kombi e estrada',
    desc: 'Surf trip: prancha no teto, café na mão, estrada de terra.',
    txt: `A young person leaning on an old Volkswagen van at a dirt road pull-off, wearing the t-shirt, surfboards
    strapped to the roof, morning haze, coffee mug in hand. Sun flare hitting the lens. Documentary feel, as if a
    friend took the picture during a surf trip.`,
  },
  quarto: {
    nome: 'Quarto bagunçado',
    desc: 'Pôsteres na parede, cama desfeita. Íntimo e real.',
    txt: `A young person sitting on the floor of a messy bedroom wearing the t-shirt, surf posters and stickers on the
    wall behind, an old TV glowing, clothes on the bed. Window light mixed with the TV glow. Intimate, unposed, like a
    photo taken by a sibling.`,
  },
  pico: {
    nome: 'Costão molhado',
    desc: 'Pedras, spray de mar, roupa molhada de sal.',
    txt: `A young person on wet dark rocks by the sea wearing the t-shirt, hair wet, salt on the skin, big waves
    breaking behind out of focus. The shirt is dry and opaque. Overcast diffuse light, cool tones. Photographed from
    the side, in motion.`,
  },
  varal: {
    nome: 'Varal e sol',
    desc: 'A camisa sozinha, secando no sol. Sem gente.',
    txt: `The t-shirt itself hanging on a clothesline outside a beach house, drying in the sun, gently moving in the
    wind. Palm shadows on a whitewashed wall behind. Shot slightly from below against the bright sky. No people in the
    frame. Still-life feel, warm and nostalgic.`,
  },
};

const ENQUADRAMENTOS = {
  meio: { nome: 'Meio corpo', txt: 'Waist-up framing, the chest print clearly readable.' },
  inteiro: { nome: 'Corpo inteiro', txt: 'Full-body framing, the person small in a big environment.' },
  detalhe: { nome: 'Detalhe do tecido', txt: 'Tight crop on the chest and shoulder: fabric weave, seams and the print in detail. Face out of frame or blurred.' },
  costas: { nome: 'De costas', txt: 'Seen from behind, looking at the sea. The shirt drapes over the back, oversized fit visible.' },
};

function montarPrompt({ cena, enquadramento, extra }) {
  const c = CENAS[cena] || CENAS.praia;
  const e = ENQUADRAMENTOS[enquadramento] || ENQUADRAMENTOS.meio;
  return [
    `Create a photorealistic lifestyle photograph of a person wearing the exact t-shirt from the attached product mockup.`,
    ``,
    `SCENE: ${c.txt.replace(/\s+/g, ' ')}`,
    `FRAMING: ${e.txt}`,
    extra ? `ALSO: ${extra}` : '',
    ``,
    `GARMENT AND PRINT: ${ESTAMPA.replace(/\s+/g, ' ')}`,
    ``,
    `CAMERA AND FILM: ${CAMERA.replace(/\s+/g, ' ')}`,
    ``,
    `AVOID: ${NEGATIVO.replace(/\s+/g, ' ')}`,
  ].filter(Boolean).join('\n');
}

module.exports = { CENAS, ENQUADRAMENTOS, montarPrompt };
