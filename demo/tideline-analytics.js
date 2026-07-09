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

  // ---------- helper unificado ----------
  // metaEvent = evento padrão do Meta; ga4Event = nome do evento no GA4
  window.tlTrack = function(metaEvent, ga4Event, params){
    params = params || {};
    try { if (window.fbq && metaEvent) fbq('track', metaEvent, params); } catch(e){}
    try { if (window.gtag && ga4Event) gtag('event', ga4Event, params); } catch(e){}
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
