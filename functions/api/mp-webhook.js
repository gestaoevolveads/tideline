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

        // ── PEDIDO DA LOJA ────────────────────────────────────────────────────
        // Só agora, com o pagamento APROVADO, a camisa vai pra produção. Se a gente criasse
        // o pedido no clique de comprar, toda desistência de carrinho viraria uma peça
        // impressa e não paga.
        if (md.tipo === 'loja' && md.pedido) {
          await pedidoDaLoja(env, md, String(id));
          return new Response('ok', { status: 200 });   // pedido de loja não mexe em assinatura
        }

        const { userId, ref } = parseRef(pay.external_reference, md);
        const valor = Number(pay.transaction_amount) || 0;
        // plano vem do metadata (confiável); só cai no valor se faltar (fundador anual = R$99 < 100)
        const plano = (md.plan === 'anual' || md.plan === 'mensal') ? md.plan : (valor >= 100 ? 'anual' : 'mensal');
        if (userId) {
          const dias = plano === 'anual' ? 372 : 33;
          // 1) premium PRIMEIRO e sozinho: nunca pode falhar por causa de coluna nova
          await sbUpdateProfile(env, userId, { plano: 'premium', premium_until: new Date(Date.now() + dias * 86400000).toISOString() });
          // 2) extras (plano + valor) em PATCH isolado -> receita exata no painel. Se a coluna nao existir, so isso falha.
          try { await sbUpdateProfile(env, userId, { plano_tipo: plano, valor_pago: valor }); } catch (e) {}
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

// ── pedido da loja ───────────────────────────────────────────────────────────
// Antes, um erro aqui era engolido em silêncio: o cliente pagava, a Montink nunca recebia,
// e não sobrava registro de nada. Ninguém ficava sabendo, nem ele, nem você.
//
// Agora a linha do pedido nasce ANTES de falar com a Montink. Se a Montink responder bem,
// a linha vira 'ok' com o número do pedido lá. Se recusar, a linha fica 'erro' com a
// resposta inteira guardada, e o pedido aparece vermelho no painel esperando você.
async function pedidoDaLoja(env, md, mpId) {
  const p = md.pedido;
  const end = p.address || {};

  // idempotência: o Mercado Pago reenvia o mesmo webhook mais de uma vez. Sem isso, a
  // mesma camisa seria produzida duas vezes, e você pagaria a produção duas vezes.
  const jaTem = await sbGet(env, `pedidos?ref=eq.${encodeURIComponent(md.ref)}&select=id,montink_status`);
  if (jaTem && jaTem.length && jaTem[0].montink_status === 'ok') return;

  if (!jaTem || !jaTem.length) {
    await sbInsert(env, 'pedidos', {
      ref: md.ref, mp_id: mpId,
      cliente_nome: p.customer_name, cliente_email: p.customer_email,
      cliente_fone: p.customer_phone, cliente_doc: p.customer_document,
      produto_id: String((p.products && p.products[0] && p.products[0].product_id) || ''),
      produto_nome: md.produto_nome || '', cor: md.cor || '', tamanho: md.tamanho || '',
      preco: Number(md.preco) || 0, frete: Number(md.frete) || 0,
      desconto: Number(md.desconto) || 0, cupom: md.cupom || null,
      total: Number(md.total) || 0,
      endereco: end,
      montink_status: 'pendente',
    });
  }

  let resposta = null, status = 'erro';
  try {
    const r = await fetch('https://tideline.com.br/api/loja', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ segredo: env.SUPABASE_SERVICE_ROLE_KEY, pedido: p }),
    });
    resposta = await r.json();
    if (r.ok && resposta && resposta.success !== false) status = 'ok';
  } catch (e) {
    resposta = { erro: String(e && e.message) };
  }

  await sbPatch(env, `pedidos?ref=eq.${encodeURIComponent(md.ref)}`, {
    montink_status: status,
    montink_pedido: (resposta && (resposta.order_id || resposta.id || resposta.pedido)) || null,
    montink_resposta: resposta,
  });

  // O cupom só conta uso depois que o pagamento entrou. Contar no clique deixaria o cupom
  // "gasto" por gente que nem chegou a pagar.
  if (status === 'ok' && md.cupom) {
    const c = await sbGet(env, `cupons?codigo=eq.${encodeURIComponent(md.cupom)}&select=usos`);
    if (c && c.length) await sbPatch(env, `cupons?codigo=eq.${encodeURIComponent(md.cupom)}`, { usos: (c[0].usos || 0) + 1 });
  }
}

async function sbPatch(env, q, patch) {
  await fetch(`${env.SUPABASE_URL}/rest/v1/${q}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
}

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
