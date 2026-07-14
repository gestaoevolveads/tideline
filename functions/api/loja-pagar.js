// Cloudflare Pages Function — o pagamento acontece AQUI, sem sair do Tideline.
//
// O que mudou e por quê:
//   Antes, a gente criava uma "preferência" e jogava a pessoa pro site do Mercado Pago. No
//   celular isso abre o APP do Mercado Pago, e a pessoa some do Tideline no exato momento em
//   que ia pagar. Toda troca de ambiente na hora do pagamento derruba conversão, e essa é a
//   pior de todas, porque a pessoa cai num app de outra marca.
//
//   Agora o cartão é digitado dentro do Tideline. O número do cartão NÃO passa por este
//   servidor: o SDK do Mercado Pago, no navegador, transforma o cartão num token de uso
//   único, e é esse token que chega aqui. A gente nunca vê, nunca guarda e nunca poderia
//   guardar o cartão de ninguém. É isso que faz um checkout transparente ser seguro.
//
//   No Pix, o Mercado Pago devolve o QR Code e o copia-e-cola, e a gente mostra na própria
//   tela. A pessoa paga no banco dela e a aprovação chega pelo webhook.
//
// O preço é recalculado aqui, do zero. O que vem do navegador é palpite: qualquer pessoa abre
// o console e manda preco: 1. Quem define preço é o servidor.
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
    const pedidoMontink = {
      customer_name: b.cliente_nome,
      customer_email: b.cliente_email,
      customer_document: doc,
      customer_phone: b.cliente_fone,
      payment_method: 'mercadopago',
      value_total: total,
      external_order_id: ref,
      shipping_id: Number(b.frete_id),
      address: {
        zipcode: String(b.cep).replace(/\D/g, ''),
        street: b.rua, number: String(b.numero), neighborhood: b.bairro,
        city: b.cidade, state: b.uf, complement: b.complemento || '',
      },
      products: [{ product_id: Number(b.produto_id), quantity: 1,
                   var1: b.tamanho, var2: b.cor, var3: null }],
    };

    // A metadata é o que o webhook vai ler quando o Pix for pago (talvez meia hora depois,
    // com a pessoa longe daqui). Ela precisa carregar o pedido inteiro.
    const metadata = {
      tipo: 'loja', ref, total, cupom, desconto,
      produto_nome: produto.nome, cor: b.cor, tamanho: b.tamanho,
      preco: produto.preco, frete,
      fbp: b.fbp || '', fbc: b.fbc || '',
      pedido: pedidoMontink,
    };

    // ── o pagamento ─────────────────────────────────────────────────────────
    const pagamento = {
      transaction_amount: total,
      description: `${produto.nome} · ${b.cor} · ${b.tamanho}`,
      external_reference: ref,
      notification_url: 'https://tideline.com.br/api/mp-webhook',
      statement_descriptor: 'TIDELINE',
      metadata,
      payer: {
        email: b.cliente_email,
        first_name: String(b.cliente_nome).split(' ')[0],
        last_name: String(b.cliente_nome).split(' ').slice(1).join(' ') || undefined,
        identification: { type: 'CPF', number: doc },
      },
    };

    if (b.metodo === 'pix') {
      pagamento.payment_method_id = 'pix';
    } else {
      // cartão: o token veio do SDK, no navegador. O número do cartão nunca passou por aqui.
      if (!b.token) return json({ erro: 'faltou o cartão' }, 400);
      Object.assign(pagamento, {
        token: b.token,
        payment_method_id: b.payment_method_id,
        installments: Number(b.installments) || 1,
        issuer_id: b.issuer_id,
      });
    }

    // A chave de idempotência impede a cobrança dupla quando a pessoa toca duas vezes no
    // botão ou a rede repete a chamada. Sem ela, dois toques viram duas cobranças.
    const r = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
        'content-type': 'application/json',
        'X-Idempotency-Key': ref,
      },
      body: JSON.stringify(pagamento),
    });
    const d = await r.json();

    if (!r.ok) {
      // "Unauthorized use of live credentials" quer dizer que a conta ainda não pode cobrar
      // direto pela API (o Checkout Transparente não foi liberado no painel do Mercado Pago).
      // Isso não é erro do cliente e ele não tem nada a ver com isso: em vez de mostrar uma
      // tela de erro e perder a venda, a gente cai no caminho antigo (a preferência do
      // Mercado Pago) sem ele perceber. A hora que a conta for liberada, isto aqui para de
      // acontecer sozinho e o cliente passa a pagar dentro do Tideline.
      if (String(d.message || '').includes('Unauthorized use of live credentials')) {
        const pref = await criarPreferencia(env, { b, produto, desconto, cupom, frete, total, ref,
                                                   pedidoMontink, metadata });
        if (pref) return json({ status: 'redirecionar', url: pref, ref, total, desconto, cupom });
      }
      return json({ erro: humanizar(d), detalhe: d.message || '' }, 400);
    }

    // Pix: devolve o QR pra tela. A aprovação chega depois, pelo webhook, e é ele que manda
    // a camisa pra produção. Aqui ninguém produz nada ainda.
    if (b.metodo === 'pix') {
      const tx = (d.point_of_interaction && d.point_of_interaction.transaction_data) || {};
      return json({
        status: 'pix', ref, total, desconto, cupom, id: d.id,
        qr: tx.qr_code_base64 || '', copia_cola: tx.qr_code || '',
        expira: d.date_of_expiration || '',
      });
    }

    // Cartão aprovado: o webhook também vai chegar, e é ele que cria o pedido na Montink.
    // Não crio aqui pra não haver dois caminhos criando a mesma coisa e produzindo duas
    // camisas. Um caminho só, e é o que o dinheiro percorre.
    return json({
      status: d.status,                         // approved | in_process | rejected
      detalhe: d.status_detail || '',
      motivo: d.status === 'rejected' ? recusa(d.status_detail) : '',
      ref, total, desconto, cupom, id: d.id,
    });
  } catch (e) {
    return json({ erro: e.message }, 500);
  }
}

// ── a rede de segurança ──────────────────────────────────────────────────────
// A preferência é o caminho antigo: o Mercado Pago hospeda a tela de pagamento. É pior de
// experiência (tira a pessoa do app), mas é melhor do que não vender. Ela só é usada quando
// a conta recusa a cobrança direta.
async function criarPreferencia(env, { b, produto, desconto, frete, total, ref, metadata }) {
  const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      items: [{
        title: `${produto.nome} · ${b.cor} · ${b.tamanho}`,
        quantity: 1,
        unit_price: Number(Math.max(0.5, produto.preco - desconto).toFixed(2)),
        currency_id: 'BRL',
      }],
      shipments: { cost: frete, mode: 'not_specified' },
      payer: {
        name: b.cliente_nome, email: b.cliente_email,
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
      metadata,                          // o webhook precisa dela pra criar o pedido na Montink
    }),
  });
  const d = await r.json();
  return r.ok ? d.init_point : null;
}

// ── "o Pix já caiu?" ─────────────────────────────────────────────────────────
// A tela pergunta isso de cinco em cinco segundos. Sem ela, a pessoa paga no banco, volta
// pro Tideline e continua olhando um QR Code, sem saber se deu certo. A confirmação tem que
// aparecer na mesma tela em que ela estava.
//
// Isto aqui NÃO libera nada e NÃO manda nada pra produção: só olha e responde. Quem manda a
// camisa pra Montink é o webhook, no servidor, que ninguém consegue falsificar.
export async function onRequestGet(context) {
  const { request, env } = context;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ erro: 'sem id' }, 400);

  const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(id)}`, {
    headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
  });
  if (!r.ok) return json({ status: 'desconhecido' });
  const d = await r.json();
  return json({
    status: d.status,
    ref: (d.metadata && d.metadata.ref) || d.external_reference || '',
    total: Number(d.transaction_amount) || 0,
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

// O Mercado Pago devolve erro em código. Mostrar "cc_rejected_bad_filled_security_code" pra
// alguém que só quer comprar uma camisa é o mesmo que não dizer nada.
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
  if (m.includes('Invalid card token')) return 'O cartão expirou aqui na tela. Digite de novo.';
  if (m.includes('amount')) return 'Deu um problema com o valor. Recarregue a página.';
  return 'Não consegui processar o pagamento agora. Tente de novo em instantes.';
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}
