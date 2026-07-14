/* Capas de carrossel e posts estáticos.
 * ─────────────────────────────────────────────────────────────────────────────
 * Diferente das capas de revista, que gritam. Aqui a marca sussurra: a foto manda, o
 * texto é pouco e a assinatura é discreta. É o registro do houseofsomos, da Patagonia,
 * da Waves & Woods. Cada template copia a diagramação de uma peça real (anotada no bloco).
 *
 * Tudo em 1080x1350.
 * ───────────────────────────────────────────────────────────────────────────── */

const PALETA = `
  --deep:#172726; --mid:#243F3D; --muted:#476664;
  --surface:#D3E2DE; --paper:#F2EFE9; --accent:#F95831;
  --ff:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif;
`;

const BASE = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:1080px;height:1350px;overflow:hidden;font-family:var(--ff);-webkit-font-smoothing:antialiased}
  .post{width:1080px;height:1350px;position:relative;overflow:hidden}
  .foto{position:absolute;inset:0;background-size:cover;background-position:center}
`;

const wm = (tam, cor) => `
  <span style="font-size:${tam}px;line-height:.82;letter-spacing:-.045em;color:${cor};white-space:nowrap;display:inline-block">
    <span style="font-weight:200">tide</span><span style="font-weight:800">line</span><span style="color:var(--accent)">.</span>
  </span>`;

/* o texto sob a marca nunca ultrapassa a largura dela: largura zero, mínimo de 100% */
const sobMarca = (texto, estilo) => `<div style="display:block;width:0;min-width:100%;${estilo}">${texto}</div>`;


/* ══════════ 1. EXPEDIÇÃO · referência: pôster Patagonia ══════════
   Foto sangrando com moldura de papel em volta. A marca vive PEQUENA no canto de baixo,
   com uma legenda miúda embaixo. Nada de título gigante: quem fala é a imagem. */
function expedicao(d) {
  return `<style>
    :root{${PALETA}} ${BASE}
    .post{background:#E7DFCE;padding:26px}
    .quadro{position:absolute;inset:26px;overflow:hidden}
    .veu{position:absolute;inset:0;background:linear-gradient(180deg,rgba(23,39,38,.18) 0%,
      rgba(23,39,38,0) 30%,rgba(23,39,38,.10) 62%,rgba(23,39,38,.62) 100%)}
    .marca{position:absolute;left:56px;bottom:64px;z-index:3;width:fit-content;
      filter:drop-shadow(0 3px 20px rgba(23,39,38,.5))}
    .leg{font-size:17px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;
      color:rgba(255,255,255,.9);margin-top:10px}
    .cod{position:absolute;right:56px;top:56px;z-index:3;text-align:right;
      font-size:13px;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,.75);
      writing-mode:vertical-rl}
  </style>
  <div class="post">
    <div class="quadro">
      <div class="foto" style="background-image:url(${d.foto})"></div>
      <div class="veu"></div>
    </div>
    <div class="cod">${d.codigo || ''}</div>
    <div class="marca">
      ${wm(78, '#fff')}
      ${sobMarca(d.legenda || '', 'font-size:17px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;color:rgba(255,255,255,.92);margin-top:10px;line-height:1.4')}
    </div>
  </div>`;
}


/* ══════════ 2. REVISTA BRANCA · referência: Waves & Woods ══════════
   Papel, muito ar, masthead no alto e a foto como uma FAIXA no meio. As chamadas ficam
   embaixo, em tipo pequeno. É a peça mais silenciosa e a que mais parece cara. */
function branca(d) {
  return `<style>
    :root{${PALETA}} ${BASE}
    .post{background:#F5F3EE;display:flex;flex-direction:column;align-items:center;padding:76px 60px 54px}
    .marca{text-align:center}
    .kick{font-size:19px;letter-spacing:.34em;text-transform:uppercase;color:var(--muted);margin-top:14px}
    .faixa{width:100%;flex:1;margin:56px 0;position:relative;overflow:hidden}
    .linhas{width:100%;display:flex;flex-direction:column;gap:10px;
      border-top:1px solid rgba(23,39,38,.2);padding-top:22px}
    .linhas div{font-size:19px;color:var(--mid);line-height:1.4}
    .linhas b{font-weight:700;color:var(--deep)}
  </style>
  <div class="post">
    <div class="marca">
      ${wm(96, 'var(--deep)')}
      <div class="kick">${d.kicker || ''}</div>
    </div>
    <div class="faixa"><div class="foto" style="background-image:url(${d.foto})"></div></div>
    <div class="linhas">
      ${(d.chamadas || []).map(c => `<div><b>${c.k}</b>${c.v ? ' · ' + c.v : ''}</div>`).join('')}
    </div>
  </div>`;
}


/* ══════════ 3. ASSINATURA · referência: pôster Surfer ══════════
   Foto sozinha, marca pequena no alto à direita e uma única linha de crédito.
   Zero enfeite. É o post de foto: a imagem é o conteúdo. */
function assinatura(d) {
  return `<style>
    :root{${PALETA}} ${BASE}
    .post{background:#111}
    .veu{position:absolute;inset:0;background:linear-gradient(180deg,rgba(23,39,38,.45) 0%,
      rgba(23,39,38,0) 24%,rgba(23,39,38,0) 78%,rgba(23,39,38,.55) 100%)}
    .topo{position:absolute;top:52px;right:56px;z-index:3;text-align:right;width:fit-content}
    .cred{font-size:16px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;
      color:rgba(255,255,255,.88);margin-top:10px;text-align:right}
    .pe{position:absolute;left:56px;bottom:52px;z-index:3;font-size:16px;font-weight:600;
      letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.8)}
  </style>
  <div class="post">
    <div class="foto" style="background-image:url(${d.foto})"></div>
    <div class="veu"></div>
    <div class="topo">
      ${wm(64, '#fff')}
      ${sobMarca(d.credito || '', 'font-size:15px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.85);margin-top:10px;text-align:right;line-height:1.4')}
    </div>
    <div class="pe">${d.rodape || ''}</div>
  </div>`;
}


/* ══════════ 4. FRASE · referência: "relax bro, life's not a race" ══════════
   Duas linhas de texto em degrau: a primeira encostada à esquerda, a segunda empurrada
   pra direita. O degrau é o que dá o ritmo de fala. Foto granulada por baixo. */
function frase(d) {
  return `<style>
    :root{${PALETA}} ${BASE}
    .post{background:#111}
    .veu{position:absolute;inset:0;background:linear-gradient(180deg,rgba(23,39,38,.58) 0%,
      rgba(23,39,38,.20) 40%,rgba(23,39,38,.05) 70%,rgba(23,39,38,.45) 100%)}
    .txt{position:absolute;left:64px;right:64px;top:150px;z-index:3;color:#fff}
    .l1{font-size:62px;font-weight:600;line-height:1.15;letter-spacing:-.02em;
      text-shadow:0 2px 24px rgba(23,39,38,.6)}
    .l2{font-size:62px;font-weight:800;line-height:1.15;letter-spacing:-.02em;text-align:right;
      margin-top:6px;text-shadow:0 2px 24px rgba(23,39,38,.6)}
    .marca{position:absolute;left:64px;bottom:56px;z-index:3;width:fit-content}
  </style>
  <div class="post">
    <div class="foto" style="background-image:url(${d.foto})"></div>
    <div class="veu"></div>
    <div class="txt">
      <div class="l1">${d.linha1 || ''}</div>
      <div class="l2">${d.linha2 || ''}</div>
    </div>
    <div class="marca">
      ${wm(50, '#fff')}
      ${sobMarca(d.rodape || '', 'font-size:14px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:rgba(255,255,255,.8);margin-top:8px;line-height:1.4')}
    </div>
  </div>`;
}


/* ══════════ 5. DUOTONE · referência: Stüssy x The North Face ══════════
   A foto vira duas cores só (o verde da marca e o papel), como serigrafia barata de
   camiseta. A marca fica grande e centrada no alto. É a peça mais gráfica de todas. */
function duotone(d) {
  return `<style>
    :root{${PALETA}} ${BASE}
    .post{background:var(--surface)}
    /* Duotone de verdade se faz com DOIS limites, não empilhando mesclagem:
       'lighten' com a cor escura levanta os pretos até ela.
       'darken' com a cor clara derruba os brancos até ela.
       O resultado é uma imagem que só existe entre essas duas cores, como serigrafia. */
    .foto{filter:grayscale(1) contrast(1.25) brightness(1.05)}
    .escuro{position:absolute;inset:0;background:var(--mid);mix-blend-mode:lighten}
    .claro{position:absolute;inset:0;background:var(--surface);mix-blend-mode:darken}
    /* 'lighten' e 'darken' só APARAM as pontas: o miolo continua cinza. Quem pinta a
       imagem inteira com a cor da marca é o modo 'color', que troca o matiz e mantém a
       luminosidade. É isso que faz virar serigrafia em vez de preto e branco tingido. */
    .tinta{position:absolute;inset:0;background:var(--mid);mix-blend-mode:color;opacity:.9}
    /* o texto precisa existir tanto sobre a água escura quanto sobre a areia clara */
    .scrim{position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,
      rgba(23,39,38,.55) 0%, rgba(23,39,38,0) 26%, rgba(23,39,38,0) 76%, rgba(23,39,38,.6) 100%)}
    .grao{position:absolute;inset:0;z-index:3;opacity:.22;mix-blend-mode:multiply;
      background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%223%22/></filter><rect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22/></svg>')}
    .marca{position:absolute;top:92px;left:0;right:0;z-index:4;text-align:center;
      filter:drop-shadow(0 3px 18px rgba(23,39,38,.35))}
    .kick{font-size:18px;font-weight:700;letter-spacing:.4em;text-transform:uppercase;
      color:var(--deep);margin-top:14px}
    .pe{position:absolute;left:0;right:0;bottom:58px;z-index:4;text-align:center;
      font-size:17px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:var(--deep)}
  </style>
  <div class="post">
    <div class="foto" style="background-image:url(${d.foto})"></div>
    <div class="escuro"></div>
    <div class="claro"></div>
    <div class="tinta"></div>
    <div class="grao"></div>
    <div class="scrim"></div>
    <div class="marca">
      ${wm(120, 'var(--paper)')}
      <div class="kick" style="color:var(--paper)">${d.kicker || ''}</div>
    </div>
    <div class="pe" style="color:var(--paper)">${d.rodape || ''}</div>
  </div>`;
}


const TEMPLATES = {
  expedicao: {
    nome: 'Expedição', ref: 'Patagonia',
    desc: 'Foto com moldura de papel, marca pequena no canto. A imagem é quem fala.',
    campos: [
      { id: 'legenda', label: 'Legenda sob a marca', tipo: 'texto' },
      { id: 'codigo', label: 'Código lateral (opcional)', tipo: 'texto' },
    ],
    chamadas: null,
    padrao: { legenda: 'Praia do Forte · 2026', codigo: 'TIDELINE 01' },
    render: expedicao,
  },
  branca: {
    nome: 'Revista branca', ref: 'Waves & Woods',
    desc: 'Papel, muito ar, foto em faixa no meio. A mais silenciosa e a que parece mais cara.',
    campos: [{ id: 'kicker', label: 'Linha sob a marca', tipo: 'texto' }],
    chamadas: { campos: ['k', 'v'], rotulos: ['Destaque', 'Complemento'] },
    padrao: {
      kicker: 'Previsão / Cultura / Mar',
      chamadas: [
        { k: 'Ler o Mar', v: 'o guia que ensina a entender a previsão' },
        { k: 'Alerta Sniper', v: 'quinze dias à frente, em dez praias' },
        { k: '87 praias', v: 'do Ceará ao Rio Grande do Sul' },
      ],
    },
    render: branca,
  },
  assinatura: {
    nome: 'Assinatura', ref: 'Pôster Surfer',
    desc: 'Foto sozinha, marca discreta no alto, uma linha de crédito. Zero enfeite.',
    campos: [
      { id: 'credito', label: 'Crédito (sob a marca)', tipo: 'texto' },
      { id: 'rodape', label: 'Rodapé', tipo: 'texto' },
    ],
    chamadas: null,
    padrao: { credito: 'Itamambuca · foto de @alguem', rodape: 'tideline.com.br' },
    render: assinatura,
  },
  frase: {
    nome: 'Frase', ref: "relax bro, life's not a race",
    desc: 'Duas linhas em degrau sobre a foto. O degrau é o que dá ritmo de fala.',
    campos: [
      { id: 'linha1', label: 'Primeira linha (esquerda)', tipo: 'texto' },
      { id: 'linha2', label: 'Segunda linha (direita)', tipo: 'texto' },
      { id: 'rodape', label: 'Sob a marca', tipo: 'texto' },
    ],
    chamadas: null,
    padrao: {
      linha1: 'o mar não avisa,',
      linha2: 'mas dá pra ouvir',
      rodape: 'Guia Ler o Mar · grátis no app',
    },
    render: frase,
  },
  duotone: {
    nome: 'Duotone', ref: 'Stüssy × The North Face',
    desc: 'A foto vira duas cores, como serigrafia de camiseta. A mais gráfica.',
    campos: [
      { id: 'kicker', label: 'Linha sob a marca', tipo: 'texto' },
      { id: 'rodape', label: 'Rodapé', tipo: 'texto' },
    ],
    chamadas: null,
    padrao: { kicker: 'Surf Forecast · Brasil', rodape: '87 praias · grátis no app' },
    render: duotone,
  },
};

function paginaCompleta(id, dados) {
  const t = TEMPLATES[id] || TEMPLATES.expedicao;
  const d = Object.assign({}, t.padrao, dados || {});
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body>${t.render(d)}</body></html>`;
}

module.exports = { TEMPLATES, paginaCompleta };
