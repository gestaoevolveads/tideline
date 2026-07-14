/* Tideline — Analytics (Meta Pixel + Google Analytics 4)
   Dispara PageView e expõe tlTrack(metaEvent, ga4Event, params) pros eventos do funil.
   NÃO roda no /admin (pra não sujar os dados).

   CONSENTIMENTO (LGPD): o Pixel e o GA só carregam DEPOIS que a pessoa aceita. Antes
   disso, nenhum script de terceiro entra na página. Rastrear sem consentimento é
   irregular no Brasil e é exatamente o tipo de coisa que derruba conta de anúncio.
   Quem pergunta é o tideline-consent.js; aqui a gente só espera a resposta.

   A atribuição de campanha (UTM) continua funcionando sempre, porque ela mora no
   próprio navegador da pessoa e não sai pra lugar nenhum sem o aceite. */
(function(){
  var PIXEL = '824809153918985';   // Meta Pixel
  var GA    = 'G-PJSTC4ZCXT';      // Google Analytics 4

  if (/\/admin/.test(location.pathname)) return; // painel interno não é rastreado

  var medicaoLigada = false;

  window.tlAtivarMedicao = function(){
    if (medicaoLigada) return;
    medicaoLigada = true;

    // ---------- Google Analytics 4 (gtag) ----------
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA);
    var gs = document.createElement('script');
    gs.async = true;
    gs.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA;
    document.head.appendChild(gs);

    // ---------- Meta Pixel ----------
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
      (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', PIXEL);
    fbq('track', 'PageView');

    // eventos que aconteceram antes do aceite não se perdem: saem agora
    while (filaEventos.length) {
      var e = filaEventos.shift();
      disparar(e[0], e[1], e[2], e[3]);
    }
  };

  var filaEventos = [];
  var consentiu = function(){
    try { return localStorage.getItem('tl_consent') === 'aceito'; } catch(e){ return false; }
  };
  if (consentiu()) window.tlAtivarMedicao();

  // ---------- ATRIBUIÇÃO (UTMs + click IDs) — 1st-touch e last-touch ----------
  var _q = new URLSearchParams(location.search);
  var UTM = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  var CLK = ['fbclid','gclid','ttclid','msclkid','igshid'];
  var _cur = {};
  UTM.concat(CLK).forEach(function(k){ var v = _q.get(k); if (v) _cur[k] = v; });
  var _hasUtm = UTM.some(function(k){ return _cur[k]; });
  try {
    // first-touch: grava UMA vez (a origem que trouxe a pessoa pela 1ª vez)
    if (!localStorage.getItem('tl_attrib_first') && (_hasUtm || document.referrer)) {
      localStorage.setItem('tl_attrib_first', JSON.stringify(Object.assign(
        { referrer: document.referrer || '', landing: location.pathname, ts: Date.now() }, _cur)));
    }
    // last-touch: atualiza sempre que chega com UTM (a última campanha que trouxe de volta)
    if (_hasUtm) {
      localStorage.setItem('tl_attrib_last', JSON.stringify(Object.assign(
        { landing: location.pathname, ts: Date.now() }, _cur)));
    }
  } catch(e){}
  window.tlAttrib     = function(){ try { return JSON.parse(localStorage.getItem('tl_attrib_first') || '{}'); } catch(e){ return {}; } };
  window.tlAttribLast = function(){ try { return JSON.parse(localStorage.getItem('tl_attrib_last')  || '{}'); } catch(e){ return {}; } };
  // fixa a origem como propriedade do usuário no GA4 (persiste entre sessões)
  try {
    var _a = window.tlAttrib();
    if (_a.utm_source) gtag('set', 'user_properties', {
      first_source: _a.utm_source, first_medium: _a.utm_medium || '',
      first_campaign: _a.utm_campaign || '', first_content: _a.utm_content || ''
    });
  } catch(e){}

  // ---------- VISITAS (contagem própria, anônima — alimenta o painel) ----------
  // Grava só: quando, qual página, de onde veio (referrer/UTM) e um id anônimo de sessão.
  // Nenhum dado pessoal. Não roda no /admin (já filtrado acima).
  try {
    var SB_URL = 'https://efgqgfnijhkuvincxfst.supabase.co';
    var SB_KEY = 'sb_publishable_dlDItMsVmfNLo1jhADYv3A_k2dV4m6i';
    var sid = localStorage.getItem('tl_sid');
    if (!sid) { sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); localStorage.setItem('tl_sid', sid); }
    // A visita passa pelo nosso servidor (Cloudflare) em vez de ir direto ao Supabase.
    // Motivo: lá ele carimba cidade e estado de graça, coisa que o navegador não sabe e que
    // a gente não vai pedir por GPS (invasivo) nem comprar de terceiro (desnecessário).
    fetch('/api/visita', {
      method: 'POST', keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: location.pathname,
        ref: document.referrer || null,
        sid: sid,
        utm_source: _cur.utm_source || null,
        utm_medium: _cur.utm_medium || null,
        utm_campaign: _cur.utm_campaign || null
      })
    }).catch(function(){});
  } catch(e){}

  // ---------- os cookies do Pixel ----------
  // O _fbp identifica o navegador, e o _fbc guarda o clique que veio do anúncio. Eles são o
  // que mais ajuda o Meta a casar uma venda feita no servidor com o anúncio que a trouxe.
  // Sem eles, a Conversions API acerta bem menos.
  window.tlFb = function(){
    function cookie(n){
      var m = document.cookie.match('(^|;)\\s*' + n + '\\s*=\\s*([^;]+)');
      return m ? m.pop() : '';
    }
    return { fbp: cookie('_fbp'), fbc: cookie('_fbc') };
  };

  // ---------- helper unificado (enriquece TODO evento com a origem) ----------
  window.tlTrack = function(metaEvent, ga4Event, params){
    params = params || {};
    var a = (window.tlAttrib && window.tlAttrib()) || {};
    var enr = Object.assign({}, params);
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k){ if (a[k]) enr[k] = a[k]; });

    // O event_id é o que impede a MESMA venda de ser contada duas vezes. O servidor manda a
    // compra pela Conversions API e o navegador manda pelo Pixel; se os dois usarem o mesmo
    // event_id, o Meta entende que é o mesmo acontecimento e junta. Sem ele, um pedido de
    // R$158 vira R$316 no relatório, e você otimiza campanha em cima de um número inventado.
    var idEvento = enr.event_id;
    delete enr.event_id;

    if (!medicaoLigada) { filaEventos.push([metaEvent, ga4Event, enr, idEvento]); return; }
    disparar(metaEvent, ga4Event, enr, idEvento);
  };

  /* O Meta só conhece uma lista fechada de eventos (Purchase, AddToCart, ViewContent...).
     Qualquer outro nome tem que ir por 'trackCustom'. A gente estava mandando 'CustomEvent'
     por 'track', e o Meta registrava TRÊS eventos diferentes (cupom aplicado, cupom recusado,
     método de pagamento) todos com o mesmo nome inútil: "CustomEvent". Não dava pra saber
     qual cupom converteu. */
  var PADRAO_META = ['PageView','ViewContent','Search','AddToCart','AddToWishlist',
    'InitiateCheckout','AddPaymentInfo','Purchase','Lead','CompleteRegistration','Contact',
    'Subscribe','StartTrial','Schedule','SubmitApplication','CustomizeProduct','Donate','FindLocation'];

  function disparar(metaEvent, ga4Event, params, idEvento) {
    var opt = idEvento ? { eventID: idEvento } : undefined;
    try {
      if (window.fbq && metaEvent) {
        if (PADRAO_META.indexOf(metaEvent) >= 0) fbq('track', metaEvent, params, opt);
        else fbq('trackCustom', ga4Event || metaEvent, params, opt);
      }
    } catch(e){}
    try { if (window.gtag && ga4Event) gtag('event', ga4Event, params); } catch(e){}
  }

  // ---------- Purchase automático no retorno do Mercado Pago ----------
  // O checkout redireciona pra app.html?assinatura=ok&v=VALOR&plan=PLANO
  try {
    var q = new URLSearchParams(location.search);
    if (q.get('assinatura') === 'ok') {
      var val = parseFloat(q.get('v')) || 0;
      var plano = q.get('plan') || '';
      window.tlTrack('Purchase', 'purchase', {
        value: val, currency: 'BRL',
        content_name: ('assinatura ' + plano).trim(),
        // o mesmo id que o servidor manda pela Conversions API: o Meta conta uma vez só
        event_id: q.get('eid') || undefined
      });
      // limpa a URL pra não recontar num refresh
      q.delete('assinatura'); q.delete('v'); q.delete('plan');
      var qs = q.toString();
      history.replaceState(null, '', location.pathname + (qs ? ('?' + qs) : '') + location.hash);
    }
  } catch(e){}
})();
