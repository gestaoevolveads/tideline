/* Tideline — o cérebro compartilhado.
   ────────────────────────────────────────────────────────────────────────────
   As praias e o julgamento de uma condição moram AQUI, num arquivo só, porque
   duas cabeças pensam diferente: se o app pontuasse de um jeito e o robô do
   Alerta Sniper de outro, o alerta acabaria discordando da tela, e o usuário
   perderia a confiança nos dois.

   Roda nos dois mundos: no navegador (window.TL) e no Node (module.exports).
   ──────────────────────────────────────────────────────────────────────────── */
(function (raiz) {

const BEACHES = [
  // NORDESTE
  {name:'Fernando de Noronha',city:'Noronha',state:'PE',lat:-3.85,lon:-32.43,region:'nordeste',terral:'S/SE'},
  {name:'Cacimba do Padre',city:'Noronha',state:'PE',lat:-3.86,lon:-32.43,region:'nordeste',terral:'S/SE'},
  {name:'Praia de Pipa',city:'Tibau do Sul',state:'RN',lat:-6.23,lon:-35.05,region:'nordeste',terral:'O/SO'},
  {name:'Maracaípe',city:'Ipojuca',state:'PE',lat:-8.55,lon:-35.02,region:'nordeste',terral:'O/SO'},
  {name:'Praia do Cupe',city:'Ipojuca',state:'PE',lat:-8.48,lon:-35.01,region:'nordeste',terral:'O/SO'},
  {name:'Tiririca',city:'Itacaré',state:'BA',lat:-14.28,lon:-38.99,region:'nordeste',terral:'O/NO'},
  {name:'Engenhoca',city:'Itacaré',state:'BA',lat:-14.26,lon:-38.99,region:'nordeste',terral:'O/NO'},
  {name:'Barra de Ilhéus',city:'Ilhéus',state:'BA',lat:-14.78,lon:-39.04,region:'nordeste',terral:'O/NO'},
  {name:'Itaúnas',city:'Conceição da Barra',state:'ES',lat:-18.42,lon:-39.67,region:'nordeste',terral:'O/NO'},
  // SUDESTE
  {name:'Saquarema',city:'Saquarema',state:'RJ',lat:-22.93,lon:-42.51,region:'sudeste',terral:'N/NO'},
  {name:'Praia do Forte',city:'Cabo Frio',state:'RJ',lat:-22.88,lon:-42.01,region:'sudeste',terral:'N/NO'},
  {name:'Praia do Peró',city:'Cabo Frio',state:'RJ',lat:-22.84,lon:-42.07,region:'sudeste',terral:'NE'},
  {name:'Ipanema',city:'Rio de Janeiro',state:'RJ',lat:-22.98,lon:-43.20,region:'sudeste',art:'em',terral:'N/NO'},
  {name:'Arpoador',city:'Rio de Janeiro',state:'RJ',lat:-22.99,lon:-43.19,region:'sudeste',art:'no',terral:'N/NO'},
  {name:'Prainha',city:'Rio de Janeiro',state:'RJ',lat:-23.04,lon:-43.51,region:'sudeste',terral:'N/NE'},
  {name:'Grumari',city:'Rio de Janeiro',state:'RJ',lat:-23.04,lon:-43.54,region:'sudeste',terral:'N/NE'},
  {name:'Recreio dos Bandeirantes',city:'Rio de Janeiro',state:'RJ',lat:-23.02,lon:-43.47,region:'sudeste',art:'no',terral:'N/NO'},
  {name:'Barra da Tijuca',city:'Rio de Janeiro',state:'RJ',lat:-23.01,lon:-43.36,region:'sudeste',terral:'N/NO'},
  {name:'Macumba',city:'Rio de Janeiro',state:'RJ',lat:-23.02,lon:-43.49,region:'sudeste',terral:'N/NE'},
  {name:'Itacoatiara',city:'Niterói',state:'RJ',lat:-22.97,lon:-43.04,region:'sudeste',terral:'N/NO'},
  {name:'Geribá',city:'Búzios',state:'RJ',lat:-22.77,lon:-41.90,region:'sudeste',art:'em',terral:'O/NO'},
  {name:'Tucuns',city:'Búzios',state:'RJ',lat:-22.77,lon:-41.88,region:'sudeste',art:'em',terral:'O/NO'},
  {name:'Monte Alto',city:'Arraial do Cabo',state:'RJ',lat:-22.94,lon:-42.12,region:'sudeste',terral:'N/NO'},
  {name:'Figueira',city:'Arraial do Cabo',state:'RJ',lat:-22.95,lon:-42.06,region:'sudeste',terral:'N/NO'},
  {name:'Foguete',city:'Cabo Frio',state:'RJ',lat:-22.92,lon:-42.06,region:'sudeste',terral:'N/NO'},
  {name:'Unamar',city:'Cabo Frio',state:'RJ',lat:-22.94,lon:-42.22,region:'sudeste',terral:'N/NO'},
  {name:'Praia Grande',city:'Arraial do Cabo',state:'RJ',lat:-22.97,lon:-42.00,region:'sudeste',terral:'N/NO'},
  {name:'Praia Brava (Arraial)',city:'Arraial do Cabo',state:'RJ',lat:-22.97,lon:-42.02,region:'sudeste',terral:'N/NO'},
  {name:'Praia Brava (Cabo Frio)',city:'Cabo Frio',state:'RJ',lat:-22.89,lon:-42.00,region:'sudeste',terral:'N/NO'},
  {name:'Praia Brava (Búzios)',city:'Búzios',state:'RJ',lat:-22.73,lon:-41.89,region:'sudeste',terral:'O/NO'},
  {name:'Tombo',city:'Guarujá',state:'SP',lat:-23.99,lon:-46.26,region:'sudeste',terral:'N/NO'},
  {name:'Pitangueiras',city:'Guarujá',state:'SP',lat:-23.98,lon:-46.25,region:'sudeste',art:'em',terral:'N/NO'},
  {name:'Barra do Sahy',city:'São Sebastião',state:'SP',lat:-23.74,lon:-45.53,region:'sudeste',terral:'N/NO'},
  {name:'Maresias',city:'São Sebastião',state:'SP',lat:-23.80,lon:-45.57,region:'sudeste',art:'em',terral:'N/NO'},
  {name:'Camburi',city:'São Sebastião',state:'SP',lat:-23.66,lon:-45.43,region:'sudeste',terral:'N/NO'},
  {name:'Itamambuca',city:'Ubatuba',state:'SP',lat:-23.37,lon:-44.98,region:'sudeste',terral:'O/NO'},
  {name:'Vermelha do Norte',city:'Ubatuba',state:'SP',lat:-23.30,lon:-44.87,region:'sudeste',terral:'O/NO'},
  {name:'Domingas Dias',city:'Ubatuba',state:'SP',lat:-23.49,lon:-45.11,region:'sudeste',terral:'N/NO'},
  {name:'Praia do Bonete',city:'Ilhabela',state:'SP',lat:-23.83,lon:-45.35,region:'sudeste',terral:'N/NO'},
  {name:'Castelhanos',city:'Ilhabela',state:'SP',lat:-23.79,lon:-45.26,region:'sudeste',terral:'O/NO'},
  {name:'Massaguaçu',city:'Caraguatatuba',state:'SP',lat:-23.59,lon:-45.36,region:'sudeste',terral:'N/NO'},
  {name:'Jureia',city:'Peruíbe',state:'SP',lat:-24.39,lon:-47.01,region:'sudeste',terral:'N/NO'},
  // SUL
  {name:'Costão do Santinho',city:'Florianópolis',state:'SC',lat:-27.49,lon:-48.39,region:'sul',terral:'O/NO'},
  {name:'Joaquina',city:'Florianópolis',state:'SC',lat:-27.63,lon:-48.44,region:'sul',art:'na',terral:'O/NO'},
  {name:'Praia Mole',city:'Florianópolis',state:'SC',lat:-27.60,lon:-48.43,region:'sul',terral:'O/NO'},
  {name:'Campeche',city:'Florianópolis',state:'SC',lat:-27.67,lon:-48.49,region:'sul',terral:'O/NO'},
  {name:'Barra da Lagoa',city:'Florianópolis',state:'SC',lat:-27.57,lon:-48.42,region:'sul',terral:'O/NO'},
  {name:'Moçambique',city:'Florianópolis',state:'SC',lat:-27.55,lon:-48.41,region:'sul',terral:'O/NO'},
  {name:'Pântano do Sul',city:'Florianópolis',state:'SC',lat:-27.78,lon:-48.51,region:'sul',terral:'N/NO'},
  {name:'Praia da Silveira',city:'Garopaba',state:'SC',lat:-28.05,lon:-48.64,region:'sul',terral:'O/NO'},
  {name:'Praia do Ferrugem',city:'Garopaba',state:'SC',lat:-28.07,lon:-48.62,region:'sul',terral:'O/NO'},
  {name:'Praia do Rosa',city:'Imbituba',state:'SC',lat:-28.12,lon:-48.65,region:'sul',terral:'O/NO'},
  {name:'Ibiraquera',city:'Imbituba',state:'SC',lat:-28.08,lon:-48.62,region:'sul',terral:'O/NO'},
  {name:'Guarda do Embaú',city:'Palhoça',state:'SC',lat:-27.82,lon:-48.60,region:'sul',terral:'O/NO'},
  {name:'Atalaia',city:'Itajaí',state:'SC',lat:-26.86,lon:-48.66,region:'sul',terral:'O/NO'},
  {name:'Penha',city:'Penha',state:'SC',lat:-26.76,lon:-48.64,region:'sul',terral:'O/NO'},
  {name:'Caiobá',city:'Matinhos',state:'PR',lat:-25.83,lon:-48.54,region:'sul',terral:'O/NO'},
  {name:'Matinhos',city:'Matinhos',state:'PR',lat:-25.82,lon:-48.54,region:'sul',terral:'O/NO'},
  {name:'Torres',city:'Torres',state:'RS',lat:-29.33,lon:-49.72,region:'sul',terral:'O/NO'},
  {name:'Tramandaí',city:'Tramandaí',state:'RS',lat:-29.99,lon:-50.13,region:'sul',terral:'O/NO'},
  {name:'Cidreira',city:'Cidreira',state:'RS',lat:-30.17,lon:-50.22,region:'sul',terral:'O/NO'},
  {name:'Arroio do Sal',city:'Arroio do Sal',state:'RS',lat:-29.56,lon:-49.89,region:'sul',terral:'O/NO'},
  {name:'Capão da Canoa',city:'Capão da Canoa',state:'RS',lat:-29.77,lon:-50.01,region:'sul',terral:'O/NO'},
  {name:'Cassino',city:'Rio Grande',state:'RS',lat:-32.20,lon:-52.17,region:'sul',terral:'O/NO'},
  // NOVAS — expansão 2026
  {name:'Titanzinho',city:'Fortaleza',state:'CE',lat:-3.71,lon:-38.47,region:'nordeste',terral:'S/SO'},
  {name:'Praia do Futuro',city:'Fortaleza',state:'CE',lat:-3.74,lon:-38.45,region:'nordeste',terral:'S/SO'},
  {name:'Baía Formosa',city:'Baía Formosa',state:'RN',lat:-6.37,lon:-35.01,region:'nordeste',terral:'O/SO'},
  {name:'Itacarezinho',city:'Itacaré',state:'BA',lat:-14.35,lon:-38.98,region:'nordeste',terral:'O/NO'},
  {name:'Regência',city:'Linhares',state:'ES',lat:-19.65,lon:-39.83,region:'sudeste',terral:'O/NO'},
  {name:'Setiba',city:'Guarapari',state:'ES',lat:-20.60,lon:-40.42,region:'sudeste',terral:'O/NO'},
  {name:'Praia da Vila',city:'Saquarema',state:'RJ',lat:-22.92,lon:-42.50,region:'sudeste',terral:'N/NO'},
  {name:'Praia Brava (Floripa)',city:'Florianópolis',state:'SC',lat:-27.40,lon:-48.41,region:'sul',terral:'O/NO'},
  {name:'Praia do Porto (Imbituba)',city:'Imbituba',state:'SC',lat:-28.24,lon:-48.65,region:'sul',terral:'O/NO'},
  {name:'Farol de Santa Marta',city:'Laguna',state:'SC',lat:-28.60,lon:-48.81,region:'sul',terral:'O/NO'},
  // MUNDIAL — WT spots
];

/* Vento: a direção de onde ele SOPRA. Terral limpa a parede, maral desmancha. */
// ── Vento POR PRAIA (mesma lógica do gerador de narrações) ──────────────────
// O app classificava o vento por uma regra fixa (terral = quadrante oeste), que
// só vale pra praia voltada ao sul. Pra Fortaleza (olha pro NE) ou qualquer
// praia de outra orientação, isso discordava da narração. Agora usa o terral
// real da praia selecionada, então narração e card falam sempre o mesmo vento.
const _COMPASS = { N:0, NNE:22.5, NE:45, ENE:67.5, E:90, L:90, ESE:112.5, LSE:112.5,
  SE:135, SSE:157.5, S:180, SSO:202.5, SO:225, OSO:247.5, O:270, W:270, ONO:292.5, NO:315, NNO:337.5 };
function _azimuthOf(str) {
  if (!str) return null;
  const toks = String(str).toUpperCase().split(/[\/\s-]+/).map(t => _COMPASS[t]).filter(v => v != null);
  if (!toks.length) return null;
  let x = 0, y = 0;
  for (const a of toks) { const r = a * Math.PI / 180; x += Math.cos(r); y += Math.sin(r); }
  if (Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9) return null; // direções opostas: degenerado, ignora
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}
function _angDist(a, b) { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
let _terralAz = null;
function setBeachTerral(terral) { _terralAz = _azimuthOf(terral); }

const _TERRAL = { label:'Terral', cls:'pill-terral', quality:1, sub:'da terra pro mar', tip:'Vento da terra pro mar. Sopra contra a face da onda, segura o lip e deixa a parede lisa. O melhor que pode ter.' };
const _MARAL  = { label:'Maral', cls:'pill-maral', quality:-2, sub:'do mar pra terra', tip:'Vento do mar pra terra. Pega a onda por trás, joga água pra cima e desfaz a parede. Mar picado e sem forma.' };
const _LATERAL= { label:'Lateral', cls:'pill-lateral', quality:0, sub:'paralelo à praia', tip:'Vento de lado, paralelo à praia. Efeito misturado. Pode ter canto com ondas mais limpas que outro.' };
function classifyWind(deg) {
  const d = ((deg % 360) + 360) % 360;
  if (_terralAz != null) {                    // por praia (preferido)
    const dist = _angDist(d, _terralAz);
    if (dist <= 55) return _TERRAL;
    if (dist >= 125) return _MARAL;
    return _LATERAL;
  }
  if (d >= 45  && d <= 135) return _MARAL;     // fallback genérico (praia ao sul)
  if (d >= 225 && d <= 315) return _TERRAL;
  return _LATERAL;
}

/* Energia da onda (kW por metro de crista). Fórmula padrão de água profunda:
   P = (ρ g² Hs² Te) / (64π). É ela que impede uma onda pequena de parecer boa
   só porque o vento está bom. */
function wavePower(h, t) {
  return (1025 * 9.81 * 9.81 * h * h * t) / (64 * Math.PI * 1000);
}

/* A nota da condição. Vento, período e altura somam, e a energia trava o teto. */
function calcScore(wind, period, height) {
  let s = wind.quality;
  s += period >= 12 ? 2 : period >= 10 ? 1 : period >= 8 ? 0 : period >= 6 ? -1 : -2;
  s += height >= 1.5 ? 2 : height >= 1.0 ? 1 : height >= 0.6 ? 0 : height >= 0.3 ? -1 : -2;
  const kw = wavePower(height, period);
  if (kw < 2)  return Math.min(s, -2);
  if (kw < 5)  return Math.min(s,  0);
  if (kw < 10) s = Math.min(s, 1);
  if (kw >= 40 && period >= 10) s += 1;
  return s;
}

function scoreToVibe(s) {
  if (s >= 4) return { dot:'cg', bar:'bfg', tag:'Pumping'          };
  if (s >= 2) return { dot:'cb', bar:'bfb', tag:'Condição boa'     };
  if (s >= 0) return { dot:'cf', bar:'bff', tag:'Condição razoável' };
  return             { dot:'cd', bar:'bfd', tag:'Condição ruim'    };
}

/* Calcula a nota direto dos números crus da previsão. É o que o robô usa. */
function scoreHora({ windDeg, period, height }) {
  const w = classifyWind(windDeg);
  return { score: calcScore(w, period, height), vento: w, kw: wavePower(height, period) };
}


  const TL = { BEACHES, classifyWind, setBeachTerral, wavePower, calcScore, scoreToVibe, scoreHora };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TL;                       // Node (o robô do Sniper)
  } else {
    raiz.TL = TL;                              // navegador
    // o app já chamava esses nomes soltos; mantém funcionando sem reescrever nada
    raiz.BEACHES = BEACHES; raiz.classifyWind = classifyWind; raiz.setBeachTerral = setBeachTerral; raiz.wavePower = wavePower;
    raiz.calcScore = calcScore; raiz.scoreToVibe = scoreToVibe; raiz.scoreHora = scoreHora;
  }

})(typeof self !== 'undefined' ? self : this);
