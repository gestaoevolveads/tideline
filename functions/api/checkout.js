// Cloudflare Pages Function — cria o checkout no Mercado Pago
// POST /api/checkout  body: { plan: 'anual' | 'mensal', userId, email }
// Env (Cloudflare Pages): MP_ACCESS_TOKEN
// Retorna { init_point } — a URL do checkout MP (Pix/cartão) pra redirecionar.

const PLANOS = {
  anual:  { titulo: 'Tideline Premium — Anual',  valor: 149.00, tipo: 'once'      },
  mensal: { titulo: 'Tideline Premium — Mensal', valor: 19.90,  tipo: 'recurring' },
};
const FOUNDER_PRICE = 99.00; // preço de fundador (1º ano) pros primeiros
const FOUNDER_LIMIT = 300;   // até 300 vagas de fundador

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = new URL(request.url).origin;
  try {
    const { plan, userId, email, ref } = await request.json();
    const p = PLANOS[plan];
    if (!p) return json({ error: 'plano inválido' }, 400);
    if (!env.MP_ACCESS_TOKEN) return json({ error: 'MP não configurado' }, 500);

    // Preço de fundador: R$99 no 1º ano pros primeiros 300 (só anual).
    // Degradação segura: se não der pra confirmar as vagas, cobra o valor cheio.
    let precoAnual = p.valor;   // 149
    let founderBuy = false;
    if (plan === 'anual') {
      const st = await founderStatus(env, userId);
      if (st.open && !st.youAreFounder) { precoAnual = FOUNDER_PRICE; founderBuy = true; }
    }
    const precoFinal = (plan === 'anual') ? precoAnual : p.valor;

    const back = `${origin}/app.html?assinatura=ok&v=${precoFinal}&plan=${encodeURIComponent(plan)}`;
    // external_reference carrega userId + código do afiliado: "userId|REF"
    const extRef = `${userId || ''}|${(ref || '').toUpperCase()}`;
    let url, body;

    if (p.tipo === 'recurring') {
      // Assinatura recorrente (mensal) → preapproval (redireciona pro MP autorizar)
      url = 'https://api.mercadopago.com/preapproval';
      body = {
        reason: p.titulo,
        external_reference: extRef,
        payer_email: email || undefined,
        back_url: back,
        auto_recurring: {
          frequency: 1, frequency_type: 'months',
          transaction_amount: p.valor, currency_id: 'BRL',
        },
        status: 'pending',
      };
    } else {
      // Pagamento único (anual) → preference (Pix + cartão)
      url = 'https://api.mercadopago.com/checkout/preferences';
      body = {
        items: [{ title: founderBuy ? `${p.titulo} · Fundador` : p.titulo, quantity: 1, unit_price: precoFinal, currency_id: 'BRL' }],
        payer: email ? { email } : undefined,
        external_reference: extRef,
        back_urls: { success: back, pending: back, failure: `${origin}/assinar.html` },
        auto_return: 'approved',
        notification_url: `${origin}/api/mp-webhook`,
        metadata: { user_id: userId || '', plan, ref: (ref || '').toUpperCase(), founder: founderBuy },
      };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return json({ error: data.message || 'falha no Mercado Pago', detalhe: data }, 502);

    const init = data.init_point || data.sandbox_init_point;
    if (!init) return json({ error: 'sem init_point', detalhe: data }, 502);
    return json({ init_point: init });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}

// Situação de fundador: { open: há vaga (<300), youAreFounder: esse user já é fundador }.
// Qualquer falha (sem env, coluna ausente, erro de rede) → open:false (cobra o valor cheio).
export async function founderStatus(env, userId) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return { open: false, youAreFounder: false };
  try {
    let youAreFounder = false;
    if (userId) {
      const prof = await sbGet(env, `profiles?id=eq.${encodeURIComponent(userId)}&select=founder`);
      if (prof === null) return { open: false, youAreFounder: false }; // erro/coluna ausente
      youAreFounder = !!(prof[0] && prof[0].founder === true);
    }
    const count = await sbCount(env, 'profiles?founder=eq.true');
    if (count < 0) return { open: false, youAreFounder }; // erro ao contar
    return { open: count < FOUNDER_LIMIT, youAreFounder };
  } catch (e) { return { open: false, youAreFounder: false }; }
}
async function sbGet(env, q) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${q}`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } });
  return r.ok ? r.json() : null;
}
async function sbCount(env, q) {
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${q}&select=id`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, Prefer: 'count=exact', Range: '0-0' } });
    if (!r.ok) return -1;
    const cr = r.headers.get('content-range');
    if (cr && cr.includes('/')) { const n = parseInt(cr.split('/')[1], 10); return isNaN(n) ? -1 : n; }
    return -1;
  } catch (e) { return -1; }
}

// deploy bump 1783537421
