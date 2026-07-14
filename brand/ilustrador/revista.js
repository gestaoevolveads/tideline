/* Capas de revista do Tideline — os templates.
 * ─────────────────────────────────────────────────────────────────────────────
 * Cada template copia a DIAGRAMAÇÃO de uma capa de referência real e troca o nome dela
 * pelo nosso masthead. A referência está anotada em cada bloco, porque saber de onde veio
 * é o que permite manter a coerência quando alguém for mexer.
 *
 * Cada template declara os CAMPOS que ele aceita. A tela monta o formulário sozinha a
 * partir dessa lista, então criar um template novo não exige tocar na interface.
 *
 * Tudo em 1080x1350 (o retrato do feed do Instagram).
 * ───────────────────────────────────────────────────────────────────────────── */

const PALETA = `
  --deep:#172726; --mid:#243F3D; --muted:#476664;
  --surface:#D3E2DE; --paper:#F2EFE9; --accent:#F95831;
  --ff:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif;
`;

const BASE = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:1080px;height:1350px;overflow:hidden;font-family:var(--ff);-webkit-font-smoothing:antialiased}
  .capa{width:1080px;height:1350px;position:relative;overflow:hidden}
  .foto{position:absolute;inset:0;background-size:cover;background-position:center}
`;

/* filtros de imagem: o que faz uma capa parecer dos anos 90 e outra parecer de hoje */
const filtro = (d) => {
  const f = [];
  if (d.pb) f.push('grayscale(1) contrast(1.1)');
  if (d.quente) f.push('sepia(.35) saturate(1.25) contrast(1.05)');
  return f.length ? `filter:${f.join(' ')};` : '';
};
const grao = (d) => d.grao ? `
  <div style="position:absolute;inset:0;pointer-events:none;opacity:.10;mix-blend-mode:overlay;
    background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22140%22 height=%22140%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22/></filter><rect width=%22140%22 height=%22140%22 filter=%22url(%23n)%22/></svg>')"></div>` : '';

/* O masthead. Ele é a única coisa que NUNCA muda de capa pra capa: é ele que faz
   seis diagramações diferentes parecerem a mesma revista. */
const wm = (tam, cor, peso = { t: 200, l: 800 }) => `
  <span style="font-size:${tam}px;line-height:.80;letter-spacing:-.045em;color:${cor};white-space:nowrap;display:inline-block">
    <span style="font-weight:${peso.t}">tide</span><span style="font-weight:${peso.l}">line</span><span style="color:var(--accent)">.</span>
  </span>`;

const linhas = (arr, render) => (arr || []).map(render).join('');


/* ══════════════════════════════════════════════════════════════
   1. BANCA   ·   referência: SURFER
   A foto INVADE o masthead: a onda cobre parte do nome, e é isso que dá a
   sensação de revista impressa de verdade. Coluna estreita de chamadas à
   esquerda, em tipo miúdo. Título enorme lá embaixo.
   ══════════════════════════════════════════════════════════════ */
function banca(d) {
  return `<style>
    :root{${PALETA}} ${BASE}
    .capa{background:var(--deep)}
    .topo{position:absolute;top:0;left:0;right:0;z-index:4;display:flex;justify-content:space-between;
      padding:24px 44px;color:#fff}
    .topo .a{font-size:22px;font-weight:800;letter-spacing:-.01em;line-height:1.25;max-width:52%}
    .topo .a i{font-style:italic;color:var(--accent)}
    .topo .b{text-align:right;font-size:16px;line-height:1.35}
    .topo .b .k{color:var(--accent);font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:13px}
    /* Na Surfer quem come o nome é a ONDA, de forma orgânica, e sempre sobra letra pra
       marca ser lida. Cortar o masthead numa linha reta parece defeito, não intenção.
       Então: foto sangrando por baixo, nome POR CIMA dela, e a base das letras dissolvida
       num degradê. O nome afunda na água em vez de ser decapitado. */
    .name{position:absolute;top:96px;left:0;right:0;z-index:3;text-align:center;
      filter:drop-shadow(0 6px 30px rgba(23,39,38,.45));
      -webkit-mask-image:linear-gradient(180deg,#000 0%,#000 66%,rgba(0,0,0,.45) 88%,transparent 100%);
      mask-image:linear-gradient(180deg,#000 0%,#000 66%,rgba(0,0,0,.45) 88%,transparent 100%)}
    .img{z-index:1;top:0;bottom:0}
    .veu{position:absolute;inset:0;z-index:2;
      background:linear-gradient(180deg,rgba(23,39,38,.92) 0%,rgba(23,39,38,.55) 14%,rgba(23,39,38,.05) 34%,
        rgba(23,39,38,.35) 62%,rgba(23,39,38,.92) 100%)}
    .col{position:absolute;z-index:5;left:0;top:460px;width:344px;display:flex;flex-direction:column;gap:26px;
      padding:30px 30px 30px 44px;
      background:linear-gradient(100deg, rgba(23,39,38,.62) 0%, rgba(23,39,38,.30) 62%, transparent 100%);
      -webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 14%,#000 86%,transparent 100%);
      mask-image:linear-gradient(180deg,transparent 0%,#000 14%,#000 86%,transparent 100%)}
    .col .k{font-size:19px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:5px}
    .col .v{font-size:14.5px;line-height:1.5;letter-spacing:.06em;text-transform:uppercase;color:#fff;text-shadow:0 1px 10px rgba(23,39,38,.9)}
    .col .p{font-size:12px;letter-spacing:.2em;color:rgba(255,255,255,.62);margin-top:6px;text-shadow:0 1px 8px rgba(23,39,38,.8)}
    .fim{position:absolute;z-index:5;left:44px;right:44px;bottom:46px;max-height:52%}
    .selo{font-size:15px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:var(--accent);margin-bottom:10px}
    .tit{font-size:104px;font-weight:800;line-height:.9;letter-spacing:-.04em;color:#fff;text-wrap:balance}
    .sub{font-size:25px;color:rgba(255,255,255,.9);margin-top:16px;font-weight:500;max-width:74%;line-height:1.35}
  </style>
  <div class="capa">
    <div class="topo">
      <div class="a">${d.topoEsq || ''}</div>
      <div class="b"><div class="k">${d.topoDirTitulo || ''}</div>${d.topoDir || ''}</div>
    </div>
    <div class="name">${wm(230, 'rgba(255,255,255,.92)')}</div>
    <div class="foto img" style="background-image:url(${d.foto});${filtro(d)}"></div>
    ${grao(d)}
    <div class="veu"></div>
    <div class="col">
      ${linhas(d.chamadas, c => `<div><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="p">${c.p || ''}</div></div>`)}
    </div>
    <div class="fim">
      <div class="selo">${d.selo || ''}</div>
      <div class="tit">${d.titulo}</div>
      <div class="sub">${d.linha || ''}</div>
    </div>
  </div>`;
}


/* ══════════════════════════════════════════════════════════════
   2. EDITORIAL   ·   referência: MONSTER SKATEBOARD MAGAZINE
   Papel branco, suíça, silenciosa. O nome em duas linhas gigantes, o número da
   edição à direita separado por um filete, e a foto ENCAIXADA com margem generosa
   (nunca sangrando). As chamadas ficam ao lado da foto, com número de página.
   ══════════════════════════════════════════════════════════════ */
function editorial(d) {
  return `<style>
    :root{${PALETA}} ${BASE}
    .capa{background:#fff;padding:44px;display:flex;flex-direction:column}
    .head{display:flex;justify-content:space-between;align-items:flex-start}
    .nome{line-height:.78}
    .kick{font-size:17px;font-weight:700;letter-spacing:.30em;text-transform:uppercase;
      color:var(--muted);margin-top:14px}
    .num{text-align:right;min-width:270px}
    .num .n{font-size:52px;font-weight:800;letter-spacing:-.02em;color:var(--deep)}
    .num .rule{height:2px;background:var(--deep);margin:12px 0 10px}
    .num .m{font-size:13px;line-height:1.7;color:var(--muted);letter-spacing:.04em}
    .quadro{flex:1;margin-top:34px;position:relative;display:flex;gap:26px}
    .janela{flex:1;position:relative;overflow:hidden;background:#eee}
    .lado{width:250px;display:flex;flex-direction:column;gap:26px;padding-top:8px}
    .lado .it{display:flex;gap:12px}
    .lado .pg{font-size:15px;font-style:italic;color:var(--muted);min-width:28px;padding-top:3px}
    .lado .k{font-size:16px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--deep);line-height:1.35}
    .lado .v{font-size:15px;font-style:italic;color:var(--muted);margin-top:3px;line-height:1.35}
    .pe{display:flex;justify-content:space-between;align-items:center;margin-top:28px;
      border-top:2px solid var(--deep);padding-top:14px;
      font-size:15px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--deep)}
    .pe .d{color:var(--accent)}
  </style>
  <div class="capa">
    <div class="head">
      <div>
        <div class="nome">${wm(112, 'var(--deep)')}</div>
        <div class="kick">${d.subnome || 'Revista de previsão e mar'}</div>
      </div>
      <div class="num">
        <div class="n">${d.edicao}</div>
        <div class="rule"></div>
        <div class="m">${(d.ficha || '').replace(/\n/g, '<br>')}</div>
      </div>
    </div>
    <div class="quadro">
      <div class="janela"><div class="foto" style="background-image:url(${d.foto});${filtro(d)}"></div>${grao(d)}</div>
      <div class="lado">
        ${linhas(d.chamadas, c => `<div class="it"><div class="pg">${c.p || ''}</div><div><div class="k">${c.k}</div><div class="v">${c.v}</div></div></div>`)}
      </div>
    </div>
    <div class="pe"><span>${d.titulo}</span><span class="d">${d.rodape || 'tideline.com.br'}</span></div>
  </div>`;
}


/* ══════════════════════════════════════════════════════════════
   3. PÔSTER   ·   referência: STÜSSY
   Foto sangrando, preto e branco, e o logotipo ENORME por cima do céu. Não tem
   chamada, não tem número de edição: é um cartaz, e a única coisa a dizer é a frase
   embaixo. Serve pra capa de atitude, não de conteúdo.
   ══════════════════════════════════════════════════════════════ */
function poster(d) {
  return `<style>
    :root{${PALETA}} ${BASE}
    .capa{background:#111}
    .name{position:absolute;top:70px;left:0;right:0;z-index:3;text-align:center}
    .veu{position:absolute;inset:0;z-index:2;
      background:linear-gradient(180deg,rgba(0,0,0,.10) 0%,rgba(0,0,0,0) 35%,rgba(0,0,0,.55) 100%)}
    .frase{position:absolute;z-index:4;left:70px;right:70px;bottom:64px;text-align:center;color:#fff}
    .frase .t{font-size:30px;font-weight:600;line-height:1.4;letter-spacing:.02em;text-wrap:balance;max-width:28ch;margin:0 auto}
    .frase .a{font-size:15px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;
      color:rgba(255,255,255,.6);margin-top:16px}
  </style>
  <div class="capa">
    <div class="foto" style="background-image:url(${d.foto});${filtro(d)}"></div>
    ${grao(d)}
    <div class="veu"></div>
    <div class="name" style="padding:0 30px">${wm(240, '#fff')}</div>
    <div class="frase">
      <div class="t">${d.titulo}</div>
      <div class="a">${d.linha || ''}</div>
    </div>
  </div>`;
}


/* ══════════════════════════════════════════════════════════════
   4. NOSTALGIA   ·   referência: AFTERSUN / VITA BREVIS
   Cartaz de galeria: foto quente e granulada, título em caixa baixa cortando o
   horizonte, blocos de texto miúdo nos cantos e uma miniatura embaixo. É a capa
   mais "arte" das seis, e a que mais depende de uma foto bonita.
   ══════════════════════════════════════════════════════════════ */
function nostalgia(d) {
  return `<style>
    :root{${PALETA}} ${BASE}
    .capa{background:#E9E2D6}
    .veu{position:absolute;inset:0;z-index:2;
      background:linear-gradient(180deg,rgba(233,226,214,.25) 0%,rgba(0,0,0,0) 30%,rgba(23,39,38,.45) 100%)}
    .top{position:absolute;z-index:4;top:34px;left:44px;right:44px;display:flex;justify-content:space-between;
      font-size:14px;font-weight:600;letter-spacing:.03em;color:rgba(255,255,255,.9)}
    .name{position:absolute;z-index:4;top:190px;left:52px;
      display:inline-block;width:fit-content;
      filter:drop-shadow(0 4px 24px rgba(23,39,38,.55))}
    /* o texto tem largura ZERO e mínimo de 100%: não empurra o container (que fica do
       tamanho exato do logotipo) mas ocupa essa largura e quebra sozinho quando passa.
       Resultado: nada nunca ultrapassa a marca, e tudo fica no mesmo eixo à esquerda. */
    .kick{display:block;width:0;min-width:100%;text-align:left;
      font-size:22px;font-weight:600;color:#fff;margin-top:10px;letter-spacing:.01em;
      line-height:1.35;text-shadow:0 2px 14px rgba(23,39,38,.8)}
    .kick b{font-weight:800}
        .col{position:absolute;z-index:4;right:44px;top:330px;width:250px;
      font-size:13.5px;line-height:1.6;letter-spacing:.06em;text-transform:uppercase;
      color:#fff;text-align:right;text-shadow:0 1px 10px rgba(23,39,38,.85)}
    .barra{position:absolute;z-index:4;left:0;top:120px;width:9px;height:520px;background:var(--accent);opacity:.9}
    .fim{position:absolute;z-index:4;left:44px;bottom:52px;right:44px;display:flex;align-items:flex-end;
      justify-content:space-between;gap:22px}
    .mini{width:250px}
    .mini .k{font-size:15px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#fff;margin-bottom:4px}
    .mini .v{font-size:13px;color:rgba(255,255,255,.75);margin-bottom:10px;letter-spacing:.04em;text-transform:uppercase}
    .mini .q{height:120px;border:2px solid rgba(255,255,255,.85);position:relative;overflow:hidden}
    .assina{text-align:right;color:#fff}
    .assina .l{font-size:13px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.8)}
  </style>
  <div class="capa">
    <div class="foto" style="background-image:url(${d.foto});filter:sepia(.4) saturate(1.3) contrast(1.05)${d.pb ? ' grayscale(1)' : ''}"></div>
    ${grao({ grao: true })}
    <div class="veu"></div>
    <div class="barra"></div>
    <div class="top"><span>${d.edicao}</span><span>${d.rodape || 'tideline.com.br'}</span></div>
    <div class="name">
      ${wm(96, 'rgba(255,255,255,.95)')}
      <div class="kick">${d.titulo}</div>
    </div>
    <div class="col">${(d.linha || '').replace(/\n/g, '<br>')}</div>
    <div class="fim">
      <div class="mini">
        <div class="k">${(d.chamadas && d.chamadas[0] && d.chamadas[0].k) || ''}</div>
        <div class="v">${(d.chamadas && d.chamadas[0] && d.chamadas[0].v) || ''}</div>
        <div class="q"><div class="foto" style="background-image:url(${d.foto});filter:grayscale(1) contrast(1.1)"></div></div>
      </div>
      <div class="assina">${wm(40, '#fff')}<div class="l">${d.selo || ''}</div></div>
    </div>
  </div>`;
}


/* ══════════════════════════════════════════════════════════════
   5. CENTRAL   ·   referência: CARVE
   Foto sangrando, masthead CENTRADO no topo, chamadas centradas embaixo dele,
   separadas por um filete fino. Limpa, simétrica, direta. É a mais fácil de ler
   de longe, e por isso a melhor pra feed.
   ══════════════════════════════════════════════════════════════ */
function central(d) {
  return `<style>
    :root{${PALETA}} ${BASE}
    .capa{background:var(--deep)}
    .veu{position:absolute;inset:0;z-index:2;
      background:linear-gradient(180deg,rgba(23,39,38,.55) 0%,rgba(23,39,38,.10) 34%,rgba(23,39,38,.08) 62%,rgba(23,39,38,.88) 100%)}
    .in{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;align-items:center;
      padding:52px 60px 46px;text-align:center}
    .kick{font-size:17px;font-weight:700;letter-spacing:.46em;text-transform:uppercase;
      color:rgba(255,255,255,.85);margin-top:6px}
    .ch{margin-top:34px;font-size:22px;letter-spacing:.12em;text-transform:uppercase;
      color:#fff;font-weight:600;text-shadow:0 2px 16px rgba(23,39,38,.85), 0 0 40px rgba(23,39,38,.5);
      display:flex;flex-direction:column;gap:16px}
    .ch > div{line-height:1.35;text-wrap:balance;max-width:30ch;margin:0 auto}
    .rule{width:190px;height:1px;background:rgba(255,255,255,.55);margin:22px auto 0}
    .fim{margin-top:auto}
    .selo{display:inline-block;background:var(--accent);color:#fff;font-size:16px;font-weight:800;
      letter-spacing:.18em;text-transform:uppercase;padding:7px 13px;border-radius:5px;margin-bottom:14px}
    .tit{font-size:82px;font-weight:800;line-height:.95;letter-spacing:-.035em;color:#fff;text-wrap:balance;max-width:16ch;margin:0 auto}
    .pe{margin-top:18px;font-size:16px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;
      color:rgba(255,255,255,.8)}
  </style>
  <div class="capa">
    <div class="foto" style="background-image:url(${d.foto});${filtro(d)}"></div>
    ${grao(d)}
    <div class="veu"></div>
    <div class="in">
      ${wm(150, '#fff')}
      <div class="kick">${d.subnome || 'Surf Magazine'}</div>
      <div class="ch">${linhas(d.chamadas, c => `<div>${c.k}${c.v ? ': ' + c.v : ''}</div>`)}</div>
      <div class="rule"></div>
      <div class="fim">
        <div class="selo">${d.selo || ''}</div>
        <div class="tit">${d.titulo}</div>
        <div class="pe">${d.rodape || ''}</div>
      </div>
    </div>
  </div>`;
}


/* ══════════════════════════════════════════════════════════════
   6. FRANCESA   ·   referência: SURF SESSION
   Faixa branca no topo com o masthead, e logo abaixo uma fileira de chamadas
   separadas por filetes verticais. A foto ocupa o resto, com o título centrado
   em cima dela. É a que cabe MAIS conteúdo sem virar bagunça.
   ══════════════════════════════════════════════════════════════ */
function francesa(d) {
  return `<style>
    :root{${PALETA}} ${BASE}
    .capa{background:var(--deep);display:flex;flex-direction:column}
    .fita{background:var(--deep);color:#fff;padding:9px 40px;display:flex;justify-content:space-between;
      font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
    .fita .d{color:var(--accent)}
    .papel{background:var(--paper);padding:22px 40px 18px}
    .head{display:flex;align-items:flex-end;justify-content:space-between}
    .mag{font-size:18px;font-weight:700;letter-spacing:.42em;text-transform:uppercase;color:var(--muted);padding-bottom:16px}
    .grade{display:flex;margin-top:20px;border-top:2px solid var(--deep);padding-top:16px}
    .grade > div{flex:1;padding:0 16px;border-left:1px solid rgba(23,39,38,.22)}
    .grade > div:first-child{padding-left:0;border-left:0}
    .grade .k{font-size:16px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);margin-bottom:5px}
    .grade .v{font-size:15px;line-height:1.35;color:var(--mid);letter-spacing:.02em;text-transform:uppercase;font-weight:600}
    .janela{flex:1;position:relative;overflow:hidden}
    .veu{position:absolute;inset:0;background:linear-gradient(180deg,rgba(23,39,38,.35) 0%,rgba(23,39,38,0) 40%,
      rgba(23,39,38,.2) 70%,rgba(23,39,38,.8) 100%)}
    /* topo fixo quebrava com título de 3 linhas: ele avançava sobre o rodapé.
       Ancorado no centro do vão, ele cresce pros dois lados e nunca colide. */
    .tit-box{position:absolute;left:40px;right:40px;top:50%;transform:translateY(-50%);
      text-align:center;color:#fff;padding:46px 30px;
      background:radial-gradient(ellipse 70% 60% at 50% 50%, rgba(23,39,38,.58) 0%, rgba(23,39,38,.28) 55%, transparent 78%)}
    .selo{display:inline-block;background:var(--accent);color:#fff;font-size:15px;font-weight:800;
      letter-spacing:.2em;text-transform:uppercase;padding:7px 14px;border-radius:5px;margin-bottom:16px}
    .tit{font-size:88px;font-weight:800;line-height:.94;letter-spacing:-.035em;text-shadow:0 2px 30px rgba(23,39,38,.45);text-wrap:balance;max-width:15ch;margin:0 auto}
    .sub{font-size:26px;letter-spacing:.34em;text-transform:uppercase;margin-top:12px;color:#fff;font-weight:600;text-shadow:0 2px 18px rgba(23,39,38,.7)}
    .pe{position:absolute;left:40px;right:40px;bottom:30px;display:flex;justify-content:space-between;align-items:center;
      color:#fff;font-size:15px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
    .bola{width:28px;height:28px;border-radius:50%;background:var(--accent)}
  </style>
  <div class="capa">
    <div class="fita"><span>${d.topoEsq || ''}</span><span class="d">${d.edicao}</span></div>
    <div class="papel">
      <div class="head">${wm(120, 'var(--deep)')}<div class="mag">Magazine</div></div>
      <div class="grade">
        ${linhas(d.chamadas, c => `<div><div class="k">${c.k}</div><div class="v">${c.v}</div></div>`)}
      </div>
    </div>
    <div class="janela">
      <div class="foto" style="background-image:url(${d.foto});${filtro(d)}"></div>
      ${grao(d)}
      <div class="veu"></div>
      <div class="tit-box">
        <div class="selo">${d.selo || ''}</div>
        <div class="tit">${d.titulo}</div>
        <div class="sub">${d.linha || ''}</div>
      </div>
      <div class="pe"><span>${d.rodape || ''}</span><span class="bola"></span></div>
    </div>
  </div>`;
}


/* ───────────────── os campos que cada template aceita ─────────────────
   A tela monta o formulário a partir disto. Criar template novo não exige
   mexer na interface: basta declarar os campos aqui. */
const CAMPOS_PADRAO = [
  { id: 'titulo',  label: 'Título da capa', tipo: 'multi' },
  { id: 'linha',   label: 'Linha de apoio', tipo: 'texto' },
  { id: 'selo',    label: 'Etiqueta',       tipo: 'texto' },
  { id: 'edicao',  label: 'Edição',         tipo: 'texto' },
  { id: 'rodape',  label: 'Rodapé',         tipo: 'texto' },
];

const TEMPLATES = {
  banca: {
    nome: 'Banca', ref: 'Surfer',
    desc: 'A foto invade o nome. Chamadas miúdas na lateral, título gigante embaixo.',
    campos: [...CAMPOS_PADRAO,
      { id: 'topoEsq', label: 'Chamada do topo (esquerda)', tipo: 'texto' },
      { id: 'topoDirTitulo', label: 'Rótulo do topo (direita)', tipo: 'texto' },
      { id: 'topoDir', label: 'Chamada do topo (direita)', tipo: 'texto' },
    ],
    chamadas: { campos: ['k', 'v', 'p'], rotulos: ['Rótulo', 'Texto', 'Página'] },
    padrao: {
      titulo: 'O NÚMERO<br>QUE NINGUÉM<br>OLHA',
      linha: 'Por que o período decide mais do que a altura',
      selo: 'Reportagem de capa',
      edicao: '#01 · JULHO 2026',
      rodape: 'tideline.com.br',
      topoEsq: 'A PREVISÃO QUE <i>NINGUÉM</i> TRADUZIU',
      topoDirTitulo: 'Guia',
      topoDir: 'LER O MAR<br>GRÁTIS NO APP',
      chamadas: [
        { k: 'Terral', v: 'O vento que todo<br>mundo espera', p: 'Página 12' },
        { k: 'Corrente', v: 'A que assusta<br>e a que salva', p: 'Página 17' },
        { k: 'Maré', v: 'A mesma praia,<br>outra praia', p: 'Página 12' },
      ],
    },
    render: banca,
  },

  editorial: {
    nome: 'Editorial', ref: 'Monster Skateboard',
    desc: 'Papel branco, foto encaixada com margem, chamadas com número de página.',
    campos: [
      { id: 'titulo', label: 'Frase do rodapé', tipo: 'texto' },
      { id: 'subnome', label: 'Assinatura sob o nome', tipo: 'texto' },
      { id: 'edicao', label: 'Número da edição', tipo: 'texto' },
      { id: 'ficha', label: 'Ficha técnica (uma por linha)', tipo: 'multi' },
      { id: 'rodape', label: 'Rodapé (direita)', tipo: 'texto' },
    ],
    chamadas: { campos: ['p', 'k', 'v'], rotulos: ['Página', 'Título', 'Subtítulo'] },
    padrao: {
      titulo: 'A previsão que você entende',
      subnome: 'Revista de previsão e mar',
      edicao: '# 01',
      ficha: '87 praias do Brasil\nPrevisão · Cultura · Mar\nJulho 2026\ntideline.com.br',
      rodape: 'tideline.com.br',
      chamadas: [
        { p: '12', k: 'O número que ninguém olha', v: 'o período decide mais que a altura' },
        { p: '24', k: 'Terral & maral', v: 'o vento esculpe ou destrói' },
        { p: '31', k: 'Corrente de retorno', v: 'a que assusta e a que salva' },
      ],
    },
    render: editorial,
  },

  poster: {
    nome: 'Pôster', ref: 'Stüssy',
    desc: 'Foto sangrando, logo enorme por cima. Sem chamada. Capa de atitude.',
    campos: [
      { id: 'titulo', label: 'Frase (centro, embaixo)', tipo: 'multi' },
      { id: 'linha', label: 'Assinatura da frase', tipo: 'texto' },
    ],
    chamadas: null,
    padrao: {
      titulo: 'O mar não avisa.<br>Mas dá pra aprender a ouvir.',
      linha: 'Guia Ler o Mar · Tideline',
      pb: true, grao: true,
    },
    render: poster,
  },

  nostalgia: {
    nome: 'Nostalgia', ref: 'Aftersun',
    desc: 'Cartaz de galeria: foto quente e granulada, texto miúdo, miniatura no canto.',
    campos: [
      { id: 'titulo', label: 'Subtítulo (sob o nome)', tipo: 'texto' },
      { id: 'linha', label: 'Bloco de texto (direita)', tipo: 'multi' },
      { id: 'edicao', label: 'Data (topo esquerdo)', tipo: 'texto' },
      { id: 'selo', label: 'Assinatura (rodapé)', tipo: 'texto' },
      { id: 'rodape', label: 'Topo direito', tipo: 'texto' },
    ],
    chamadas: { campos: ['k', 'v'], rotulos: ['Título da miniatura', 'Subtítulo'] },
    padrao: {
      titulo: 'THE seriously <b>HONEST</b> forecast',
      linha: 'A onda que você pega hoje\nnasceu longe, dias atrás,\nnuma tempestade que\nvocê nunca viu.',
      edicao: '13 de julho de 2026',
      selo: 'Guia Ler o Mar',
      rodape: 'tideline.com.br',
      chamadas: [{ k: 'O período', v: 'o número que quase ninguém olha' }],
      grao: true,
    },
    render: nostalgia,
  },

  central: {
    nome: 'Central', ref: 'Carve',
    desc: 'Masthead centrado no topo, chamadas centradas. A que se lê de mais longe.',
    campos: [...CAMPOS_PADRAO, { id: 'subnome', label: 'Assinatura sob o nome', tipo: 'texto' }],
    chamadas: { campos: ['k', 'v'], rotulos: ['Chamada', 'Complemento'] },
    padrao: {
      titulo: 'O NÚMERO QUE<br>NINGUÉM OLHA',
      linha: '',
      selo: 'Reportagem de capa',
      edicao: '#01 · JULHO 2026',
      rodape: 'Guia Ler o Mar · Grátis no app',
      subnome: 'Surf Magazine',
      chamadas: [
        { k: 'O período', v: 'o que ele faz com a sua onda' },
        { k: 'O terral', v: 'por que todo mundo acorda cedo' },
        { k: 'A corrente', v: 'a que assusta e a que salva' },
      ],
    },
    render: central,
  },

  francesa: {
    nome: 'Francesa', ref: 'Surf Session',
    desc: 'Faixa branca com quatro chamadas em filetes, foto embaixo com título centrado.',
    campos: [...CAMPOS_PADRAO, { id: 'topoEsq', label: 'Fita do topo', tipo: 'texto' }],
    chamadas: { campos: ['k', 'v'], rotulos: ['Rótulo', 'Chamada'] },
    padrao: {
      titulo: 'LER<br>O MAR',
      linha: 'O guia completo',
      selo: 'Dossiê',
      edicao: '#01 · JULHO 2026',
      rodape: 'Grátis no app · tideline.com.br',
      topoEsq: 'A previsão que você entende · 87 praias',
      chamadas: [
        { k: 'Período', v: 'O número que<br>ninguém olha' },
        { k: 'Terral', v: 'O vento que todo<br>mundo espera' },
        { k: 'Corrente', v: 'A que assusta<br>e a que salva' },
        { k: 'Maré', v: 'A mesma praia,<br>outra praia' },
      ],
    },
    render: francesa,
  },
};

function paginaCompleta(idTemplate, dados) {
  const t = TEMPLATES[idTemplate] || TEMPLATES.banca;
  const d = Object.assign({}, t.padrao, dados || {});
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body>${t.render(d)}</body></html>`;
}

module.exports = { TEMPLATES, paginaCompleta };
