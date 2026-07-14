// Conversions API do Meta: a venda contada pelo SERVIDOR.
//
// Por que isso existe:
//   O Pixel do navegador só conta a compra se a pessoa VOLTAR pro site depois de pagar.
//   Com Pix e boleto, ela não volta: gera o código, fecha o navegador, paga no app do banco
//   meia hora depois. O dinheiro entra, a camisa é produzida, e o Meta nunca fica sabendo da
//   venda. No Brasil isso é metade das compras. O resultado é um ROAS falso, menor do que a
//   realidade, e um algoritmo otimizando com dados furados.
//
//   Aqui a compra é enviada do servidor, no instante em que o Mercado Pago confirma que o
//   dinheiro entrou. Não depende de navegador, nem de Pix, nem de bloqueador de anúncio.
//
// A dedução (dedup):
//   O navegador também manda o Purchase, quando a pessoa volta. Os dois usam o MESMO
//   event_id (a referência do pedido). O Meta reconhece que é o mesmo acontecimento e conta
//   uma vez só. Sem isso, um pedido de R$158 apareceria como R$316.
//
// Os dados do cliente vão com HASH (SHA-256), como o Meta exige. Ninguém do outro lado lê
// o e-mail nem o CPF: eles servem só pra casar a venda com a pessoa que viu o anúncio.
//
// Env: META_PIXEL_ID, META_CAPI_TOKEN   (sem eles, esta função não faz nada e não quebra)

const API = 'https://graph.facebook.com/v21.0';

async function sha256(txt) {
  const dados = new TextEncoder().encode(txt);
  const hash = await crypto.subtle.digest('SHA-256', dados);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// O Meta exige o dado normalizado ANTES do hash: minúsculo, sem espaço, sem pontuação.
// Um "Hudson@Gmail.com " e um "hudson@gmail.com" viram hashes diferentes, e a venda deixa
// de casar com a pessoa que clicou no anúncio.
const limpar = s => String(s || '').trim().toLowerCase();
const soDigitos = s => String(s || '').replace(/\D/g, '');

export async function purchaseCapi(env, p) {
  if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN) return { pulou: 'sem credencial do Meta' };

  const user = {};
  if (p.email) user.em = [await sha256(limpar(p.email))];
  if (p.telefone) {
    // telefone com o país na frente, sem sinal nenhum: 5521999998888
    const t = soDigitos(p.telefone);
    user.ph = [await sha256(t.startsWith('55') ? t : '55' + t)];
  }
  if (p.nome) {
    const partes = limpar(p.nome).split(/\s+/);
    user.fn = [await sha256(partes[0])];
    if (partes.length > 1) user.ln = [await sha256(partes[partes.length - 1])];
  }
  if (p.cidade) user.ct = [await sha256(limpar(p.cidade).replace(/\s/g, ''))];
  if (p.uf) user.st = [await sha256(limpar(p.uf))];
  if (p.cep) user.zp = [await sha256(soDigitos(p.cep))];
  user.country = [await sha256('br')];

  // _fbp e _fbc são os cookies do Pixel. Quando existem (a pessoa veio de um anúncio), eles
  // são o que MAIS ajuda o Meta a casar a venda com o clique. Não vão com hash, por regra.
  if (p.fbp) user.fbp = p.fbp;
  if (p.fbc) user.fbc = p.fbc;

  const evento = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: p.ref,                        // o mesmo id do navegador: é isso que dedupa
    action_source: 'website',
    event_source_url: 'https://tideline.com.br/app.html',
    user_data: user,
    custom_data: {
      currency: 'BRL',
      value: Number(p.valor) || 0,
      content_type: 'product',
      content_ids: [String(p.produtoId || '')],
      content_name: p.produtoNome || '',
      order_id: p.ref,
      ...(p.cupom ? { coupon: p.cupom } : {}),
    },
  };

  const r = await fetch(`${API}/${env.META_PIXEL_ID}/events?access_token=${env.META_CAPI_TOKEN}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data: [evento] }),
  });
  const resp = await r.json().catch(() => ({}));
  return r.ok ? { ok: true, resp } : { erro: resp };
}
