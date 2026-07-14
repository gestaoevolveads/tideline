// Diagnóstico das credenciais do Mercado Pago.
//
// Existe pra responder UMA pergunta: o access token (secreto, no servidor) e a public key
// (que vai pro navegador) são do MESMO dono e do MESMO tipo? Quando não são, o Mercado Pago
// responde "Unauthorized use of live credentials", que não diz qual das duas está errada.
//
// Nada de secreto sai daqui: só o número da conta, o país e o modo (produção ou teste).
// Apague esta rota depois que o checkout estiver funcionando.

export async function onRequestGet(context) {
  const { env } = context;
  const out = {};

  // De quem é o access token?
  try {
    const r = await fetch('https://api.mercadopago.com/users/me', {
      headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
    });
    const d = await r.json();
    out.token = r.ok
      ? { conta: d.id, apelido: d.nickname, pais: d.site_id, email: d.email,
          tipo: String(env.MP_ACCESS_TOKEN).startsWith('TEST-') ? 'TESTE' : 'produção' }
      : { erro: d.message || 'token recusado' };
  } catch (e) { out.token = { erro: e.message }; }

  // A public key existe e é de produção?
  out.public_key = env.MP_PUBLIC_KEY
    ? { prefixo: String(env.MP_PUBLIC_KEY).slice(0, 8),
        tipo: String(env.MP_PUBLIC_KEY).startsWith('TEST-') ? 'TESTE' : 'produção' }
    : { erro: 'MP_PUBLIC_KEY não cadastrada' };

  // A conta pode cobrar por API? Esta chamada é a mesma que o checkout faz, mas sem cobrar
  // nada: se ela passar, o problema é outro; se ela falhar, é permissão da conta.
  try {
    const r = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
    });
    const d = await r.json();
    out.metodos = r.ok
      ? { ok: true, tem_pix: (d || []).some(m => m.id === 'pix'),
          aceita: (d || []).map(m => `${m.id} (${m.status})`) }
      : { erro: d.message || 'sem permissão' };
  } catch (e) { out.metodos = { erro: e.message }; }

  // ?cobrar=1 → tenta uma cobrança REAL de R$1 em boleto. Ninguém paga, ele vence sozinho.
  // Serve pra provar que a conta pode cobrar direto pela API (que é o que o checkout
  // transparente faz). Se isto passar, o problema do Pix é só o Pix.
  const u = new URL(context.request.url);
  if (u.searchParams.get('cobrar')) {
    const r = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, 'content-type': 'application/json',
                 'X-Idempotency-Key': 'diag-' + Date.now() },
      body: JSON.stringify({
        transaction_amount: 1,
        description: 'Teste de credencial (nao pagar)',
        payment_method_id: 'bolbradesco',
        payer: { email: 'teste@tideline.com.br', first_name: 'Teste', last_name: 'Tideline',
                 identification: { type: 'CPF', number: '19119119100' },
                 address: { zip_code: '28905000', street_name: 'Av Teste', street_number: '1',
                            neighborhood: 'Centro', city: 'Cabo Frio', federal_unit: 'RJ' } },
      }),
    });
    const d = await r.json();
    out.cobranca_direta = r.ok ? { ok: true, status: d.status } : { erro: d.message, causa: d.cause };
  }

  return new Response(JSON.stringify(out, null, 2), {
    headers: { 'content-type': 'application/json' },
  });
}
