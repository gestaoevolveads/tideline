/* Tideline — Analytics (Meta Pixel + Google Analytics 4)
   Carrega os dois, dispara PageView, e expõe tlTrack(metaEvent, ga4Event, params)
   pros eventos do funil. NÃO roda no /admin (pra não sujar os dados). */
(function(){
  var PIXEL = '824809153918985';   // Meta Pixel
  var GA    = 'G-PJSTC4ZCXT';      // Google Analytics 4

  if (/\/admin/.test(location.pathname)) return; // painel interno não é rastreado

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

  // ---------- helper unificado (enriquece TODO evento com a origem) ----------
  window.tlTrack = function(metaEvent, ga4Event, params){
    params = params || {};
    var a = (window.tlAttrib && window.tlAttrib()) || {};
    var enr = Object.assign({}, params);
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k){ if (a[k]) enr[k] = a[k]; });
    try { if (window.fbq && metaEvent) fbq('track', metaEvent, enr); } catch(e){}
    try { if (window.gtag && ga4Event) gtag('event', ga4Event, enr); } catch(e){}
  };

  // ---------- Purchase automático no retorno do Mercado Pago ----------
  // O checkout redireciona pra app.html?assinatura=ok&v=VALOR&plan=PLANO
  try {
    var q = new URLSearchParams(location.search);
    if (q.get('assinatura') === 'ok') {
      var val = parseFloat(q.get('v')) || 0;
      var plano = q.get('plan') || '';
      window.tlTrack('Purchase', 'purchase', {
        value: val, currency: 'BRL',
        content_name: ('assinatura ' + plano).trim()
      });
      // limpa a URL pra não recontar num refresh
      q.delete('assinatura'); q.delete('v'); q.delete('plan');
      var qs = q.toString();
      history.replaceState(null, '', location.pathname + (qs ? ('?' + qs) : '') + location.hash);
    }
  } catch(e){}
})();
