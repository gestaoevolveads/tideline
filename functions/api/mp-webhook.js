// Cloudflare Pages Function — webhook do Mercado Pago
// Vira o cliente premium E registra a comissão do afiliado (preciso, à prova de fraude).
// Env: MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Segurança: só confiamos no ID; valor/status vêm re-buscados do MP. external_reference = "userId|REF".

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    let body = {};
    try { body = await request.json(); } catch {}
    const type = body.type || body.topic || url.searchParams.get('type') || url.searchParams.get('topic') || '';
    const id = (body.data && body.data.id) || body.id || url.searchParams.get('data.id') || url.searchParams.get('id');
    if (!id) return ok();

    if (type.includes('payment')) {
      // pagamento (anual único OU cobrança da assinatura mensal)
      const pay = await mpGet(env, `/v1/payments/${id}`);
      if (pay && pay.status === 'approved') {
        const md = pay.metadata || {};
        const { userId, ref } = parseRef(pay.external_reference, md);
        const valor = Number(pay.transaction_amount) || 0;
        // plano vem do metadata (confiável); só cai no valor se faltar (fundador anual = R$99 < 100)
        const plano = (md.plan === 'anual' || md.plan === 'mensal') ? md.plan : (valor >= 100 ? 'anual' : 'mensal');
        if (userId) {
          const dias = plano === 'anual' ? 372 : 33;
          await sbUpdateProfile(env, userId, { plano: 'premium', premium_until: new Date(Date.now() + dias * 86400000).toISOString() });
          // marca fundador (compra anual de fundador) — PATCH isolado: se a coluna não existir, o premium acima já foi gravado
          const isFounder = md.founder === true || md.founder === 'true' || (plano === 'anual' && valor > 0 && valor < 120);
          if (isFounder) { try { await sbUpdateProfile(env, userId, { founder: true }); } catch (e) {} }
        }
        if (ref) await registrarComissao(env, { ref, userId, plano, valor, mpId: String(id) });
      }
    } else if (type.includes('preapproval') || type.includes('subscription')) {
      // assinatura autorizada → garante premium (a comissão vem no evento de pagamento)
      const pre = await mpGet(env, `/preapproval/${id}`);
      if (pre && (pre.status === 'authorized' || pre.status === 'active')) {
        const { userId } = parseRef(pre.external_reference, null);
        if (userId) await sbUpdateProfile(env, userId, { plano: 'premium', premium_until: new Date(Date.now() + 33 * 86400000).toISOString() });
      }
    }
    return ok();
  } catch (e) { return ok(); }
}

export async function onRequestGet() { return ok(); }

// "userId|REF" → { userId, ref }; cai pro metadata se precisar
function parseRef(extRef, metadata) {
  let userId = '', ref = '';
  if (extRef && extRef.includes('|')) { const p = extRef.split('|'); userId = p[0] || ''; ref = (p[1] || '').toUpperCase(); }
  else { userId = extRef || ''; }
  if (!userId && metadata) userId = metadata.user_id || '';
  if (!ref && metadata && metadata.ref) ref = String(metadata.ref).toUpperCase();
  return { userId, ref };
}

async function registrarComissao(env, { ref, userId, plano, valor, mpId }) {
  // idempotência: esse pagamento já virou comissão?
  const dup = await sbGet(env, `comissoes?mp_id=eq.${encodeURIComponent(mpId)}&select=id`);
  if (dup && dup.length) return;
  // afiliado ativo + taxas dele
  const af = await sbGet(env, `afiliados?codigo=eq.${encodeURIComponent(ref)}&ativo=eq.true&select=*`);
  if (!af || !af.length) return; // código inválido/inativo → sem comissão
  const a = af[0];
  let tipo, rate;
  if (plano === 'anual') { tipo = 'anual'; rate = Number(a.comissao_anual) || 40; }
  else {
    const jaTem = await sbGet(env, `comissoes?afiliado_codigo=eq.${encodeURIComponent(ref)}&user_id=eq.${encodeURIComponent(userId)}&plano=eq.mensal&select=id`);
    if (jaTem && jaTem.length) { tipo = 'recorrente'; rate = Number(a.comissao_mensal_recorrente) || 25; }
    else { tipo = 'primeira'; rate = Number(a.comissao_mensal_primeira) || 60; }
  }
  const comissao = Math.round(valor * rate) / 100; // 2 casas
  const agora = new Date();
  await sbInsert(env, 'comissoes', {
    afiliado_codigo: ref, user_id: userId || null, plano, tipo,
    valor_pago: valor, comissao,
    pago_em: agora.toISOString(),
    libera_em: new Date(agora.getTime() + 30 * 86400000).toISOString(),
    status: 'pendente', mp_id: mpId,
  });
}

async function mpGet(env, path) {
  const r = await fetch(`https://api.mercadopago.com${path}`, { headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } });
  return r.ok ? r.json() : null;
}
async function sbGet(env, q) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${q}`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } });
  return r.ok ? r.json() : null;
}
async function sbInsert(env, table, row) {
  await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, prefer: 'return=minimal' }, body: JSON.stringify(row) });
}
async function sbUpdateProfile(env, userId, patch) {
  await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, { method: 'PATCH', headers: { 'content-type': 'application/json', apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, prefer: 'return=minimal' }, body: JSON.stringify(patch) });
}
function ok() { return new Response('ok', { status: 200 }); }
