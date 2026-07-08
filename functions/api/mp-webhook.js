// Cloudflare Pages Function — webhook do Mercado Pago
// MP chama esta URL quando um pagamento/assinatura muda de status.
// Env: MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Segurança: só confiamos no ID do recurso; TODO o resto vem re-buscado do MP.

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    let body = {};
    try { body = await request.json(); } catch {}
    const type = body.type || body.topic || url.searchParams.get('type') || url.searchParams.get('topic') || '';
    const id = (body.data && body.data.id) || body.id || url.searchParams.get('data.id') || url.searchParams.get('id');
    if (!id) return ok();

    let userId = '', plan = '', granted = false;

    if (type.includes('payment')) {
      // pagamento único (anual) — busca o pagamento real no MP
      const pay = await mpGet(env, `/v1/payments/${id}`);
      if (pay && pay.status === 'approved') {
        userId = pay.external_reference || (pay.metadata && pay.metadata.user_id) || '';
        plan = (pay.metadata && pay.metadata.plan) || (Number(pay.transaction_amount) >= 100 ? 'anual' : 'mensal');
        granted = true;
      }
    } else if (type.includes('preapproval') || type.includes('subscription')) {
      // assinatura recorrente (mensal)
      const pre = await mpGet(env, `/preapproval/${id}`);
      if (pre && (pre.status === 'authorized' || pre.status === 'active')) {
        userId = pre.external_reference || '';
        plan = 'mensal';
        granted = true;
      }
    }

    if (granted && userId) {
      const dias = plan === 'anual' ? 372 : 33; // + buffer
      const premiumUntil = new Date(Date.now() + dias * 86400000).toISOString();
      await supabaseUpdateProfile(env, userId, { plano: 'premium', premium_until: premiumUntil });
    }
    return ok();
  } catch (e) {
    // sempre 200 pro MP não ficar reenviando; loga o erro
    return ok();
  }
}

// MP também pode mandar GET de teste na criação do webhook
export async function onRequestGet() { return ok(); }

async function mpGet(env, path) {
  const r = await fetch(`https://api.mercadopago.com${path}`, {
    headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
  });
  if (!r.ok) return null;
  return r.json();
}

async function supabaseUpdateProfile(env, userId, patch) {
  await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  });
}

function ok() { return new Response('ok', { status: 200 }); }
