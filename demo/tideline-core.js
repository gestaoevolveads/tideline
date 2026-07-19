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
  {name:'Fernando de Noronha',city:'Noronha',state:'PE',lat:-3.85,lon:-32.43,region:'nordeste'},
  {name:'Cacimba do Padre',city:'Noronha',state:'PE',lat:-3.86,lon:-32.43,region:'nordeste'},
  {name:'Praia de Pipa',city:'Tibau do Sul',state:'RN',lat:-6.23,lon:-35.05,region:'nordeste'},
  {name:'Maracaípe',city:'Ipojuca',state:'PE',lat:-8.55,lon:-35.02,region:'nordeste'},
  {name:'Praia do Cupe',city:'Ipojuca',state:'PE',lat:-8.48,lon:-35.01,region:'nordeste'},
  {name:'Tiririca',city:'Itacaré',state:'BA',lat:-14.28,lon:-38.99,region:'nordeste'},
  {name:'Engenhoca',city:'Itacaré',state:'BA',lat:-14.26,lon:-38.99,region:'nordeste'},
  {name:'Barra de Ilhéus',city:'Ilhéus',state:'BA',lat:-14.78,lon:-39.04,region:'nordeste'},
  {name:'Itaúnas',city:'Conceição da Barra',state:'ES',lat:-18.42,lon:-39.67,region:'nordeste'},
  // SUDESTE
  {name:'Saquarema',city:'Saquarema',state:'RJ',lat:-22.93,lon:-42.51,region:'sudeste'},
  {name:'Praia do Forte',city:'Cabo Frio',state:'RJ',lat:-22.88,lon:-42.01,region:'sudeste'},
  {name:'Praia do Peró',city:'Cabo Frio',state:'RJ',lat:-22.84,lon:-42.07,region:'sudeste'},
  {name:'Ipanema',city:'Rio de Janeiro',state:'RJ',lat:-22.98,lon:-43.20,region:'sudeste',art:'em'},
  {name:'Arpoador',city:'Rio de Janeiro',state:'RJ',lat:-22.99,lon:-43.19,region:'sudeste',art:'no'},
  {name:'Prainha',city:'Rio de Janeiro',state:'RJ',lat:-23.04,lon:-43.51,region:'sudeste'},
  {name:'Grumari',city:'Rio de Janeiro',state:'RJ',lat:-23.04,lon:-43.54,region:'sudeste'},
  {name:'Recreio dos Bandeirantes',city:'Rio de Janeiro',state:'RJ',lat:-23.02,lon:-43.47,region:'sudeste',art:'no'},
  {name:'Barra da Tijuca',city:'Rio de Janeiro',state:'RJ',lat:-23.01,lon:-43.36,region:'sudeste'},
  {name:'Macumba',city:'Rio de Janeiro',state:'RJ',lat:-23.02,lon:-43.49,region:'sudeste'},
  {name:'Itacoatiara',city:'Niterói',state:'RJ',lat:-22.97,lon:-43.04,region:'sudeste'},
  {name:'Geribá',city:'Búzios',state:'RJ',lat:-22.77,lon:-41.90,region:'sudeste',art:'em'},
  {name:'Tucuns',city:'Búzios',state:'RJ',lat:-22.77,lon:-41.88,region:'sudeste',art:'em'},
  {name:'Monte Alto',city:'Arraial do Cabo',state:'RJ',lat:-22.94,lon:-42.12,region:'sudeste'},
  {name:'Figueira',city:'Arraial do Cabo',state:'RJ',lat:-22.95,lon:-42.06,region:'sudeste'},
  {name:'Foguete',city:'Cabo Frio',state:'RJ',lat:-22.92,lon:-42.06,region:'sudeste'},
  {name:'Unamar',city:'Cabo Frio',state:'RJ',lat:-22.94,lon:-42.22,region:'sudeste'},
  {name:'Praia Grande',city:'Arraial do Cabo',state:'RJ',lat:-22.97,lon:-42.00,region:'sudeste'},
  {name:'Praia Brava (Arraial)',city:'Arraial do Cabo',state:'RJ',lat:-22.97,lon:-42.02,region:'sudeste'},
  {name:'Praia Brava (Cabo Frio)',city:'Cabo Frio',state:'RJ',lat:-22.89,lon:-42.00,region:'sudeste'},
  {name:'Praia Brava (Búzios)',city:'Búzios',state:'RJ',lat:-22.73,lon:-41.89,region:'sudeste'},
  {name:'Tombo',city:'Guarujá',state:'SP',lat:-23.99,lon:-46.26,region:'sudeste'},
  {name:'Pitangueiras',city:'Guarujá',state:'SP',lat:-23.98,lon:-46.25,region:'sudeste',art:'em'},
  {name:'Barra do Sahy',city:'São Sebastião',state:'SP',lat:-23.74,lon:-45.53,region:'sudeste'},
  {name:'Maresias',city:'São Sebastião',state:'SP',lat:-23.80,lon:-45.57,region:'sudeste',art:'em'},
  {name:'Camburi',city:'São Sebastião',state:'SP',lat:-23.66,lon:-45.43,region:'sudeste'},
  {name:'Itamambuca',city:'Ubatuba',state:'SP',lat:-23.37,lon:-44.98,region:'sudeste'},
  {name:'Vermelha do Norte',city:'Ubatuba',state:'SP',lat:-23.30,lon:-44.87,region:'sudeste'},
  {name:'Domingas Dias',city:'Ubatuba',state:'SP',lat:-23.49,lon:-45.11,region:'sudeste'},
  {name:'Praia do Bonete',city:'Ilhabela',state:'SP',lat:-23.83,lon:-45.35,region:'sudeste'},
  {name:'Castelhanos',city:'Ilhabela',state:'SP',lat:-23.79,lon:-45.26,region:'sudeste'},
  {name:'Massaguaçu',city:'Caraguatatuba',state:'SP',lat:-23.59,lon:-45.36,region:'sudeste'},
  {name:'Jureia',city:'Peruíbe',state:'SP',lat:-24.39,lon:-47.01,region:'sudeste'},
  // SUL
  {name:'Costão do Santinho',city:'Florianópolis',state:'SC',lat:-27.49,lon:-48.39,region:'sul'},
  {name:'Joaquina',city:'Florianópolis',state:'SC',lat:-27.63,lon:-48.44,region:'sul',art:'na'},
  {name:'Praia Mole',city:'Florianópolis',state:'SC',lat:-27.60,lon:-48.43,region:'sul'},
  {name:'Campeche',city:'Florianópolis',state:'SC',lat:-27.67,lon:-48.49,region:'sul'},
  {name:'Barra da Lagoa',city:'Florianópolis',state:'SC',lat:-27.57,lon:-48.42,region:'sul'},
  {name:'Moçambique',city:'Florianópolis',state:'SC',lat:-27.55,lon:-48.41,region:'sul'},
  {name:'Pântano do Sul',city:'Florianópolis',state:'SC',lat:-27.78,lon:-48.51,region:'sul'},
  {name:'Praia da Silveira',city:'Garopaba',state:'SC',lat:-28.05,lon:-48.64,region:'sul'},
  {name:'Praia do Ferrugem',city:'Garopaba',state:'SC',lat:-28.07,lon:-48.62,region:'sul'},
  {name:'Praia do Rosa',city:'Imbituba',state:'SC',lat:-28.12,lon:-48.65,region:'sul'},
  {name:'Ibiraquera',city:'Imbituba',state:'SC',lat:-28.08,lon:-48.62,region:'sul'},
  {name:'Guarda do Embaú',city:'Palhoça',state:'SC',lat:-27.82,lon:-48.60,region:'sul'},
  {name:'Atalaia',city:'Itajaí',state:'SC',lat:-26.86,lon:-48.66,region:'sul'},
  {name:'Penha',city:'Penha',state:'SC',lat:-26.76,lon:-48.64,region:'sul'},
  {name:'Caiobá',city:'Matinhos',state:'PR',lat:-25.83,lon:-48.54,region:'sul'},
  {name:'Matinhos',city:'Matinhos',state:'PR',lat:-25.82,lon:-48.54,region:'sul'},
  {name:'Torres',city:'Torres',state:'RS',lat:-29.33,lon:-49.72,region:'sul'},
  {name:'Tramandaí',city:'Tramandaí',state:'RS',lat:-29.99,lon:-50.13,region:'sul'},
  {name:'Cidreira',city:'Cidreira',state:'RS',lat:-30.17,lon:-50.22,region:'sul'},
  {name:'Arroio do Sal',city:'Arroio do Sal',state:'RS',lat:-29.56,lon:-49.89,region:'sul'},
  {name:'Capão da Canoa',city:'Capão da Canoa',state:'RS',lat:-29.77,lon:-50.01,region:'sul'},
  {name:'Cassino',city:'Rio Grande',state:'RS',lat:-32.20,lon:-52.17,region:'sul'},
  // NOVAS — expansão 2026
  {name:'Titanzinho',city:'Fortaleza',state:'CE',lat:-3.71,lon:-38.47,region:'nordeste'},
  {name:'Praia do Futuro',city:'Fortaleza',state:'CE',lat:-3.74,lon:-38.45,region:'nordeste'},
  {name:'Baía Formosa',city:'Baía Formosa',state:'RN',lat:-6.37,lon:-35.01,region:'nordeste'},
  {name:'Itacarezinho',city:'Itacaré',state:'BA',lat:-14.35,lon:-38.98,region:'nordeste'},
  {name:'Regência',city:'Linhares',state:'ES',lat:-19.65,lon:-39.83,region:'sudeste'},
  {name:'Setiba',city:'Guarapari',state:'ES',lat:-20.60,lon:-40.42,region:'sudeste'},
  {name:'Praia da Vila',city:'Saquarema',state:'RJ',lat:-22.92,lon:-42.50,region:'sudeste'},
  {name:'Praia Brava (Floripa)',city:'Florianópolis',state:'SC',lat:-27.40,lon:-48.41,region:'sul'},
  {name:'Praia do Porto (Imbituba)',city:'Imbituba',state:'SC',lat:-28.24,lon:-48.65,region:'sul'},
  {name:'Farol de Santa Marta',city:'Laguna',state:'SC',lat:-28.60,lon:-48.81,region:'sul'},
  // MUNDIAL — WT spots
];

/* Vento: a direção de onde ele SOPRA. Terral limpa a parede, maral desmancha. */
function classifyWind(deg) {
  const d = ((deg % 360) + 360) % 360;
  if (d >= 45  && d <= 135) return { label:'Maral',   cls:'pill-maral',   quality:-2, sub:'do mar pra terra', tip:'Vento do mar pra terra. Pega a onda por trás, joga água pra cima e desfaz a parede. Mar picado e sem forma.' };
  if (d >= 225 && d <= 315) return { label:'Terral',  cls:'pill-terral',  quality: 1, sub:'da terra pro mar', tip:'Vento da terra pro mar. Sopra contra a face da onda, segura o lip e deixa a parede lisa. O melhor que pode ter.' };
  return                          { label:'Lateral', cls:'pill-lateral', quality: 0, sub:'paralelo à praia',   tip:'Vento de lado, paralelo à praia. Efeito misturado. Pode ter canto com ondas mais limpas que outro.' };
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


  const TL = { BEACHES, classifyWind, wavePower, calcScore, scoreToVibe, scoreHora };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TL;                       // Node (o robô do Sniper)
  } else {
    raiz.TL = TL;                              // navegador
    // o app já chamava esses nomes soltos; mantém funcionando sem reescrever nada
    raiz.BEACHES = BEACHES; raiz.classifyWind = classifyWind; raiz.wavePower = wavePower;
    raiz.calcScore = calcScore; raiz.scoreToVibe = scoreToVibe; raiz.scoreHora = scoreHora;
  }

})(typeof self !== 'undefined' ? self : this);
