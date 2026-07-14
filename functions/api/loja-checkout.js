// Cloudflare Pages Function — checkout da loja (produto físico).
//
// Cria a preferência no Mercado Pago com o produto E o frete, e guarda TODO o pedido na
// metadata. É essa metadata que o webhook vai ler depois pra criar a ordem na Montink.
//
// Por que o pedido só nasce na Montink DEPOIS do pagamento aprovado: se a gente criasse
// antes, toda desistência de carrinho viraria uma camisa impressa e não paga.
//
// Env: MP_ACCESS_TOKEN

import { validarCupom } from './cupom.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!env.MP_ACCESS_TOKEN) return json({ erro: 'pagamento não configurado' }, 500);
    const b = await request.json();

    const obrigatorios = ['produto_id', 'nome', 'preco', 'cor', 'tamanho', 'frete_id', 'frete_valor',
                          'cliente_nome', 'cliente_email', 'cliente_doc', 'cliente_fone',
                          'cep', 'rua', 'numero', 'bairro', 'cidade', 'uf'];
    for (const c of obrigatorios) {
      if (!b[c]) return json({ erro: `falta ${c}` }, 400);
    }

    // O desconto é recalculado AQUI. O que veio do navegador é palpite: qualquer pessoa
    // abre o console e manda desconto: 158. Quem define preço é o servidor.
    let desconto = 0, cupom = '';
    if (b.cupom) {
      const c = await validarCupom(env, String(b.cupom).trim().toUpperCase(), Number(b.preco));
      if (!c.erro) { desconto = c.desconto; cupom = c.codigo; }
    }

    const precoFinal = Math.max(0.5, Number(b.preco) - desconto);   // o MP não aceita item a R$0
    const total = precoFinal + Number(b.frete_valor);
    const ref = 'TL-' + Date.now();

    const pref = {
      items: [{
        title: `${b.nome} · ${b.cor} · ${b.tamanho}`,
        quantity: 1,
        unit_price: Number(precoFinal.toFixed(2)),
        currency_id: 'BRL',
      }],
      // o frete vai separado: o cliente vê exatamente o que está pagando de entrega
      shipments: { cost: Number(b.frete_valor), mode: 'not_specified' },
      payer: {
        name: b.cliente_nome,
        email: b.cliente_email,
        identification: { type: 'CPF', number: String(b.cliente_doc).replace(/\D/g, '') },
      },
      external_reference: ref,
      back_urls: {
        success: 'https://tideline.com.br/app.html?compra=ok',
        failure: 'https://tideline.com.br/comprar.html?erro=1',
        pending: 'https://tideline.com.br/app.html?compra=pendente',
      },
      auto_return: 'approved',
      notification_url: 'https://tideline.com.br/api/mp-webhook',
      statement_descriptor: 'TIDELINE',
      metadata: {
        tipo: 'loja',
        ref,
        total,
        cupom,
        desconto,
        produto_nome: b.nome,
        cor: b.cor,
        tamanho: b.tamanho,
        preco: Number(b.preco),
        frete: Number(b.frete_valor),
        pedido: {
          customer_name: b.cliente_nome,
          customer_email: b.cliente_email,
          customer_document: String(b.cliente_doc).replace(/\D/g, ''),
          customer_phone: b.cliente_fone,
          payment_method: 'mercadopago',
          value_total: total,
          external_order_id: ref,
          shipping_id: Number(b.frete_id),
          address: {
            zipcode: String(b.cep).replace(/\D/g, ''),
            street: b.rua,
            number: String(b.numero),
            neighborhood: b.bairro,
            city: b.cidade,
            state: b.uf,
            complement: b.complemento || '',
          },
          products: [{
            product_id: Number(b.produto_id),
            quantity: 1,
            var1: b.tamanho,       // a Montink espera tamanho em var1
            var2: b.cor,           // e cor em var2
            var3: null,
          }],
        },
      },
    };

    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify(pref),
    });
    const d = await r.json();
    if (!r.ok) return json({ erro: d.message || 'falha ao criar o pagamento' }, 502);

    return json({ url: d.init_point, ref, total, desconto, cupom });
  } catch (e) {
    return json({ erro: e.message }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}
