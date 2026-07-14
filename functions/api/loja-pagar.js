// Cloudflare Pages Function — o pagamento acontece AQUI, sem sair do Tideline.
//
// Usa a API NOVA do Mercado Pago (Orders, POST /v1/orders), e não a antiga (/v1/payments).
// Isso não é preferência: a conta simplesmente não é autorizada na antiga (ela responde
// 401 "Unauthorized use of live credentials" em qualquer meio, inclusive boleto) e É
// autorizada na nova. O Mercado Pago está migrando, e as aplicações novas nascem só na nova.
//
// O cartão: o número NÃO passa por este servidor. O SDK do Mercado Pago, dentro do celular
// da pessoa, cifra o cartão e devolve um token de uso único. É esse token que chega aqui.
// A gente nunca vê, nunca guarda, e não teria como guardar o cartão de ninguém.
//
// O Pix: o Mercado Pago devolve o QR Code e o copia-e-cola, e a gente desenha na tela. A
// pessoa paga no banco dela e a aprovação chega pelo webhook, talvez meia hora depois.
//
// O preço é recalculado aqui, do zero, do catálogo da Montink. O que vem do navegador é
// palpite: qualquer pessoa abre o console e manda preco: 1. Quem define preço é o servidor.
//
// O pedido nasce no NOSSO banco antes da cobrança, com status 'aguardando'. Quando o
// dinheiro entra, o webhook acha a linha pela referência e manda pra produção. Assim nada
// depende de um campo que o Mercado Pago carrega pra gente.
//
// Env: MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MONTINK_TOKEN

import { validarCupom } from './cupom.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!env.MP_ACCESS_TOKEN) return json({ erro: 'pagamento não configurado' }, 500);
    const b = await request.json();

    const faltando = ['produto_id', 'cor', 'tamanho', 'frete_id', 'frete_valor',
                      'cliente_nome', 'cliente_email', 'cliente_doc', 'cliente_fone',
                      'cep', 'rua', 'numero', 'bairro', 'cidade', 'uf']
      .filter(c => !b[c]);
    if (faltando.length) return json({ erro: `falta ${faltando[0]}` }, 400);

    // ── o preço, calculado do zero, do jeito que só o servidor pode ──────────
    const produto = await lerProduto(env, b.produto_id);
    if (!produto) return json({ erro: 'produto não encontrado' }, 400);

    let desconto = 0, cupom = '';
    if (b.cupom) {
      const c = await validarCupom(env, String(b.cupom).trim().toUpperCase(), produto.preco);
      if (!c.erro) { desconto = c.desconto; cupom = c.codigo; }
    }
    const frete = Number(b.frete_valor) || 0;
    const total = Math.round((Math.max(0.5, produto.preco - desconto) + frete) * 100) / 100;
    const ref = 'TL-' + Date.now();

    const doc = String(b.cliente_doc).replace(/\D/g, '');
    const nome = String(b.cliente_nome).trim();

    // O pedido, no formato que a Montink documenta.
    //
    // Três coisas que eu estava mandando errado, e que só apareceram lendo a coleção deles:
    //   payment_method: eu mandava "mercadopago", que não é um valor que eles conhecem.
    //                   Agora vai o meio real ("pix" ou "credit_card").
    //   price:          eles documentam o preço em CADA linha do pedido, e eu não mandava.
    //                   Se eles conferirem o valor por aí, o pedido seria recusado.
    //   sku:            eles documentam, mas a API deles não devolve SKU em lugar nenhum
    //                   (não está no catálogo nem no detalhe do produto). Então é opcional,
    //                   e a gente omite em vez de inventar um.
    const precoPeca = Math.round(Math.max(0.5, produto.preco - desconto) * 100) / 100;
    const pedidoMontink = {
      customer_name: nome,
      customer_email: b.cliente_email,
      customer_document: doc,
      customer_phone: b.cliente_fone,
      payment_method: b.metodo === 'pix' ? 'pix' : 'credit_card',
      value_total: total,
      external_order_id: ref,
      shipping_id: Number(b.frete_id),
      address: {
        zipcode: String(b.cep).replace(/\D/g, ''),
        street: b.rua, number: String(b.numero), neighborhood: b.bairro,
        city: b.cidade, state: b.uf, complement: b.complemento || '',
      },
      products: [{
        product_id: Number(b.produto_id),
        quantity: 1,
        var1: b.tamanho,          // a Montink espera o tamanho em var1
        var2: b.cor,              // e a cor em var2
        var3: null,
        price: precoPeca,
      }],
    };

    // ── o pedido nasce aqui, ANTES do dinheiro ──────────────────────────────
    // Ele fica 'aguardando'. Nada vai pra produção enquanto o pagamento não entrar. Se a
    // pessoa desistir na tela do Pix, sobra uma linha aguardando, e nenhuma camisa impressa.
    await sbInsert(env, 'pedidos', {
      ref,
      cliente_nome: nome, cliente_email: b.cliente_email,
      cliente_fone: b.cliente_fone, cliente_doc: doc,
      produto_id: String(b.produto_id), produto_nome: produto.nome,
      cor: b.cor, tamanho: b.tamanho,
      preco: produto.preco, frete, desconto, cupom: cupom || null, total,
      endereco: pedidoMontink.address,
      payload: { montink: pedidoMontink, fbp: b.fbp || '', fbc: b.fbc || '' },
      montink_status: 'aguardando',
    });

    // ── a cobrança ──────────────────────────────────────────────────────────
    const valor = total.toFixed(2);
    const pagamento = b.metodo === 'pix'
      ? { amount: valor, payment_method: { id: 'pix', type: 'bank_transfer' } }
      : {
          amount: valor,
          payment_method: {
            id: b.payment_method_id,
            type: 'credit_card',
            token: b.token,
            installments: Number(b.installments) || 1,
          },
        };

    if (b.metodo !== 'pix' && !b.token) return json({ erro: 'faltou o cartão' }, 400);

    const ordem = {
      type: 'online',
      processing_mode: 'automatic',
      total_amount: valor,
      external_reference: ref,
      description: `${produto.nome} · ${b.cor} · ${b.tamanho}`,
      payer: {
        email: b.cliente_email,
        first_name: nome.split(' ')[0],
        last_name: nome.split(' ').slice(1).join(' ') || nome.split(' ')[0],
        identification: { type: 'CPF', number: doc },
      },
      transactions: { payments: [pagamento] },
    };

    // A chave de idempotência impede a cobrança dupla quando a pessoa toca duas vezes no
    // botão ou a rede repete a chamada. Sem ela, dois toques viram duas cobranças.
    const r = await fetch('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
        'content-type': 'application/json',
        'X-Idempotency-Key': ref,
      },
      body: JSON.stringify(ordem),
    });
    const d = await r.json();

    if (!r.ok) {
      await sbPatch(env, `pedidos?ref=eq.${ref}`, { montink_status: 'erro', montink_resposta: d });
      return json({ erro: humanizar(d), detalhe: d.message || '' }, 400);
    }

    const pag = (d.transactions && d.transactions.payments && d.transactions.payments[0]) || {};
    const pm = pag.payment_method || {};
    await sbPatch(env, `pedidos?ref=eq.${ref}`, { mp_order: d.id, mp_id: pag.id || null });

    // Pix: devolve o QR pra tela. A camisa não vai pra produção agora: quem manda é o
    // webhook, quando o dinheiro cair de verdade.
    if (b.metodo === 'pix') {
      return json({
        status: 'pix', ref, total, desconto, cupom, id: d.id,
        qr: pm.qr_code_base64 || '', copia_cola: pm.qr_code || '',
        link: pm.ticket_url || '',
      });
    }

    // Cartão. 'processed' com 'accredited' é o aprovado. O webhook também vai chegar, e é
    // ELE que cria o pedido na Montink: um caminho só, senão a mesma camisa sai duas vezes.
    const aprovado = d.status === 'processed' && (d.status_detail || '').includes('accredited');
    const analisando = d.status === 'action_required' || d.status === 'processing'
                    || pag.status === 'pending' || pag.status === 'authorized';

    if (!aprovado && !analisando) {
      await sbPatch(env, `pedidos?ref=eq.${ref}`, { montink_status: 'erro',
        montink_resposta: { recusado: pag.status_detail || d.status_detail } });
    }

    return json({
      status: aprovado ? 'approved' : analisando ? 'in_process' : 'rejected',
      motivo: aprovado || analisando ? '' : recusa(pag.status_detail || d.status_detail),
      ref, total, desconto, cupom, id: d.id,
    });
  } catch (e) {
    return json({ erro: e.message }, 500);
  }
}

// ── "o Pix já caiu?" ─────────────────────────────────────────────────────────
// A tela pergunta isso de cinco em cinco segundos. Sem ela, a pessoa paga no banco, volta
// pro Tideline e continua olhando um QR Code, sem saber se deu certo.
//
// Isto NÃO libera nada e NÃO manda nada pra produção: só olha e responde. Quem manda a
// camisa pra Montink é o webhook, no servidor, que ninguém consegue falsificar.
export async function onRequestGet(context) {
  const { request, env } = context;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ erro: 'sem id' }, 400);

  const r = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(id)}`, {
    headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
  });
  if (!r.ok) return json({ status: 'desconhecido' });
  const d = await r.json();
  const pago = d.status === 'processed' && (d.status_detail || '').includes('accredited');
  return json({
    status: pago ? 'approved' : d.status,
    ref: d.external_reference || '',
    total: Number(d.total_amount) || 0,
  });
}

// ── o catálogo, lido da Montink, que é a única fonte de verdade do preço ─────
async function lerProduto(env, id) {
  const r = await fetch('https://api.montink.com/products', {
    headers: { Authorizationtoken: env.MONTINK_TOKEN, 'content-type': 'application/json' },
  });
  const lista = await r.json().catch(() => ({}));
  const p = (lista.produtos || []).find(x => String(x.id) === String(id));
  return p ? { id: p.id, nome: p.nomeShopify, preco: Number(p.preco_final) } : null;
}

// O Mercado Pago devolve a recusa em código. Mostrar "cc_rejected_bad_filled_security_code"
// pra alguém que só quer comprar uma camisa é o mesmo que não dizer nada.
function recusa(detalhe) {
  const mapa = {
    cc_rejected_bad_filled_card_number: 'O número do cartão parece errado. Confira e tente de novo.',
    cc_rejected_bad_filled_date: 'A validade do cartão parece errada.',
    cc_rejected_bad_filled_security_code: 'O código de segurança (os 3 números do verso) não confere.',
    cc_rejected_bad_filled_other: 'Algum dado do cartão não confere. Confira e tente de novo.',
    cc_rejected_insufficient_amount: 'O cartão não tem limite pra esse valor.',
    cc_rejected_high_risk: 'O banco não autorizou essa compra. Tente outro cartão ou pague no Pix.',
    cc_rejected_max_attempts: 'Tentativas demais nesse cartão. Espere um pouco ou use outro.',
    cc_rejected_call_for_authorize: 'Seu banco precisa autorizar essa compra. Ligue pra ele ou use o Pix.',
    cc_rejected_card_disabled: 'Esse cartão está desativado. Fale com o banco ou use outro.',
    cc_rejected_duplicated_payment: 'Essa compra já foi feita. Confira seu e-mail antes de tentar de novo.',
  };
  return mapa[detalhe] || 'O pagamento não passou. Tente outro cartão ou pague no Pix.';
}

function humanizar(d) {
  const m = String(d.message || '');
  if (m.includes('token')) return 'O cartão expirou aqui na tela. Digite os dados de novo.';
  if (m.includes('amount')) return 'Deu um problema com o valor. Recarregue a página.';
  return 'Não consegui processar o pagamento agora. Tente de novo em instantes.';
}

// ── banco ────────────────────────────────────────────────────────────────────
async function sbInsert(env, tabela, linha) {
  await fetch(`${env.SUPABASE_URL}/rest/v1/${tabela}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: env.SUPABASE_SERVICE_ROLE_KEY,
               authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, prefer: 'return=minimal' },
    body: JSON.stringify(linha),
  });
}
async function sbPatch(env, q, patch) {
  await fetch(`${env.SUPABASE_URL}/rest/v1/${q}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', apikey: env.SUPABASE_SERVICE_ROLE_KEY,
               authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}
