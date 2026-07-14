// Cloudflare Pages Function — a ponte com a Montink.
//
// O cliente NUNCA vê a Montink. Ele compra dentro do Tideline, paga pelo Mercado Pago (que
// já é nosso), e a Montink só recebe a ordem de produção e envio. Ninguém precisa editar a
// loja deles, e ninguém precisa saber que ela existe.
//
// A chave da Montink vive AQUI, no servidor. Se ela fosse pro navegador, qualquer pessoa
// leria o código-fonte da página e poderia criar pedidos em nome da sua conta.
//
// Rotas:
//   GET  /api/loja?acao=produtos            catálogo (nome, preço, cores, tamanhos, estoque)
//   GET  /api/loja?acao=frete&cep=&qtd=     opções de entrega e prazo
//   POST /api/loja  { pedido }              cria o pedido na Montink (só o webhook chama)
//
// Env: MONTINK_TOKEN

const BASE = 'https://api.montink.com';

async function montink(env, caminho, opts = {}) {
  const r = await fetch(`${BASE}${caminho}`, {
    ...opts,
    headers: {
      // O header é 'Authorizationtoken', tudo junto, sem espaço. Não é padrão nenhum do
      // mercado e não dá pra adivinhar: veio da documentação deles.
      Authorizationtoken: env.MONTINK_TOKEN,
      'content-type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const txt = await r.text();
  try { return JSON.parse(txt); } catch { return { success: false, msg: txt.slice(0, 200) }; }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const u = new URL(request.url);
  const acao = u.searchParams.get('acao');

  if (!env.MONTINK_TOKEN) return json({ erro: 'loja não configurada' }, 500);

  // ── catálogo ────────────────────────────────────────────────────────────────
  if (acao === 'produtos') {
    const lista = await montink(env, '/products');
    if (!lista.success) return json({ erro: 'não consegui ler o catálogo' }, 502);

    // Cada produto precisa de uma segunda chamada pra trazer tamanhos, cores e ESTOQUE.
    // Sem o estoque a gente venderia um tamanho que não existe, e o cliente descobriria
    // isso depois de pagar. Vale a chamada extra.
    const produtos = await Promise.all((lista.produtos || []).map(async (p) => {
      const d = await montink(env, `/product/${p.id}`);
      const dp = Array.isArray(d.dadosProduto) ? d.dadosProduto[0] : d.dadosProduto;
      return {
        id: p.id,
        nome: p.nomeShopify,
        preco: Number(p.preco_final),
        imagens: Object.values(d.variacoesCor || { x: p.image_url }),
        cores: Object.keys(dp?.cores || {}),
        tamanhos: Object.keys(dp?.tamanhos || {}),
        estoque: d.variacoesEstoque || {},        // { "Branco": { "P": 0, "M": 1000, ... } }
        imgPorCor: d.variacoesCor || {},
      };
    }));

    return json({ produtos }, 200, 300);   // 5 min de cache: catálogo não muda a cada clique
  }

  // ── frete ───────────────────────────────────────────────────────────────────
  if (acao === 'frete') {
    const cep = (u.searchParams.get('cep') || '').replace(/\D/g, '');
    const qtd = Math.max(1, Math.min(20, +(u.searchParams.get('qtd') || 1)));
    if (cep.length !== 8) return json({ erro: 'CEP inválido' }, 400);

    const r = await montink(env, `/calculate_shipping/${cep}/${qtd}`);
    if (!r.success) return json({ erro: r.msg || 'não consegui calcular o frete' }, 502);

    return json({
      opcoes: (r.shipping_options || []).map(o => ({
        id: o.delivery_method_id,
        nome: o.name,
        valor: Number(o.value),
        dias: o.business_days,
      })),
    });
  }

  return json({ erro: 'ação desconhecida' }, 400);
}

// ── criar o pedido na Montink ────────────────────────────────────────────────
// Chamado pelo webhook do Mercado Pago DEPOIS que o pagamento é aprovado. Nunca pelo
// navegador: se fosse, alguém poderia criar pedidos sem pagar.
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const b = await request.json();
    if (b.segredo !== env.SUPABASE_SERVICE_ROLE_KEY) return json({ erro: 'não autorizado' }, 401);

    const r = await montink(env, '/create_order', {
      method: 'POST',
      body: JSON.stringify(b.pedido),
    });
    return json(r, r.success ? 200 : 502);
  } catch (e) {
    return json({ erro: e.message }, 500);
  }
}

function json(obj, status = 200, cache = 0) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      ...(cache ? { 'cache-control': `public, max-age=${cache}` } : {}),
    },
  });
}
