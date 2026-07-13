/* Tideline — consentimento de cookies (LGPD).
   ─────────────────────────────────────────────────────────────────────────────
   A LGPD exige consentimento ANTES de carregar rastreamento não essencial. O
   Meta Pixel e o Google Analytics disparavam assim que a página abria, o que é
   irregular e é exatamente o tipo de coisa que derruba conta de anúncio.

   Aqui a regra é simples: enquanto não houver escolha, o tideline-analytics.js
   não carrega nada de terceiros. Quem decide é a pessoa, e ela pode mudar de
   ideia depois pelo link no rodapé.

   Cookies essenciais (login, preferências) não passam por aqui: sem eles o app
   não funciona, e a lei não exige consentimento para esses.
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
  var CHAVE = 'tl_consent';           // 'aceito' | 'recusado'
  var escolha = null;
  try { escolha = localStorage.getItem(CHAVE); } catch (e) {}

  function salvar(valor) {
    try { localStorage.setItem(CHAVE, valor); } catch (e) {}
    escolha = valor;
    fechar();
    if (valor === 'aceito' && window.tlAtivarMedicao) window.tlAtivarMedicao();
    // recusa depois de ter aceito: a página recarrega pra descarregar o que já subiu
    if (valor === 'recusado' && window.fbq) location.reload();
  }

  function fechar() {
    var el = document.getElementById('tl-consent');
    if (el) el.remove();
  }

  function abrir() {
    if (document.getElementById('tl-consent')) return;

    var css = document.createElement('style');
    css.textContent = [
      '#tl-consent{position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;justify-content:center;padding:16px;',
      '  animation:tlSobe .28s cubic-bezier(.2,.8,.2,1)}',
      '@keyframes tlSobe{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}',
      '#tl-consent .cx{width:100%;max-width:540px;background:#172726;color:#EAF2EF;border-radius:16px;',
      '  padding:20px 22px;box-shadow:0 12px 40px -10px rgba(0,0,0,.5);',
      '  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif}',
      '#tl-consent .tt{font-size:15px;font-weight:700;margin-bottom:6px}',
      '#tl-consent .tx{font-size:13.5px;line-height:1.55;color:rgba(234,242,239,.72);margin-bottom:16px}',
      '#tl-consent .tx a{color:#F95831;font-weight:600;text-decoration:none}',
      '#tl-consent .bt{display:flex;gap:10px}',
      '#tl-consent button{flex:1;font:inherit;font-size:14px;font-weight:700;padding:13px;border-radius:11px;',
      '  cursor:pointer;min-height:46px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#EAF2EF}',
      '#tl-consent button.ok{background:#F95831;border-color:#F95831;color:#fff}',
      '#tl-consent button:hover{filter:brightness(1.1)}',
      '@media (prefers-reduced-motion:reduce){#tl-consent{animation:none}}',
    ].join('\n');
    document.head.appendChild(css);

    var box = document.createElement('div');
    box.id = 'tl-consent';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Preferências de cookies');
    box.innerHTML =
      '<div class="cx">' +
        '<div class="tt">A gente pode medir como você usa o app?</div>' +
        '<div class="tx">Só pra entender o que funciona e melhorar. Se você recusar, ' +
          'nada de rastreamento carrega e o app continua igual. ' +
          '<a href="./privacidade.html">Ver a política de privacidade</a></div>' +
        '<div class="bt">' +
          '<button type="button" id="tl-no">Recusar</button>' +
          '<button type="button" class="ok" id="tl-yes">Aceitar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(box);

    document.getElementById('tl-yes').onclick = function () { salvar('aceito'); };
    document.getElementById('tl-no').onclick  = function () { salvar('recusado'); };
  }

  window.tlConsent = {
    aceito: function () { return escolha === 'aceito'; },
    escolheu: function () { return escolha === 'aceito' || escolha === 'recusado'; },
    abrir: abrir,
  };

  // primeira visita: pergunta. O painel do admin fica de fora, não é público.
  if (!window.tlConsent.escolheu() && !/\/admin/.test(location.pathname)) {
    if (document.body) abrir();
    else document.addEventListener('DOMContentLoaded', abrir);
  }
})();
