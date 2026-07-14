// Cloudflare Pages Function — cria o checkout no Mercado Pago
// POST /api/checkout  body: { plan: 'anual' | 'mensal', userId, email }
// Env (Cloudflare Pages): MP_ACCESS_TOKEN
// Retorna { init_point } — a URL do checkout MP (Pix/cartão) pra redirecionar.

import { lerPrecos } from './precos.js';

const PLANOS = {
  anual:  { titulo: 'Tideline Premium — Anual',  valor: 149.00, tipo: 'once'      },
  mensal: { titulo: 'Tideline Premium — Mensal', valor: 19.90,  tipo: 'recurring' },
};

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = new URL(request.url).origin;
  try {
    const { plan, userId, email, ref, fbp, fbc } = await request.json();
    const p = PLANOS[plan];
    if (!p) return json({ error: 'plano inválido' }, 400);
    if (!env.MP_ACCESS_TOKEN) return json({ error: 'MP não configurado' }, 500);

    // Preço vem do config (fonte única de verdade). Se falhar, cai no padrão.
    // É o MESMO valor que a landing e o /assinar exibem, entao nunca diverge.
    const precos = await lerPrecos(env);
    const precoFinal = (plan === 'anual') ? precos.anual : precos.mensal;

    // O id do evento nasce AQUI, e vai pros dois lados: pro navegador (na URL de volta) e
    // pro servidor (na metadata). É esse id igual dos dois lados que faz o Meta entender que
    // a compra do Pixel e a compra da Conversions API são a MESMA, e contar uma vez só.
    const eid = 'TL-A-' + Date.now();
    const back = `${origin}/app.html?assinatura=ok&v=${precoFinal}&plan=${encodeURIComponent(plan)}&eid=${eid}`;
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
          transaction_amount: precoFinal, currency_id: 'BRL',
        },
        status: 'pending',
      };
    } else {
      // Pagamento único (anual) → preference (Pix + cartão)
      url = 'https://api.mercadopago.com/checkout/preferences';
      body = {
        items: [{ title: p.titulo, quantity: 1, unit_price: precoFinal, currency_id: 'BRL' }],
        payer: email ? { email } : undefined,
        external_reference: extRef,
        back_urls: { success: back, pending: back, failure: `${origin}/assinar.html` },
        auto_return: 'approved',
        notification_url: `${origin}/api/mp-webhook`,
        // fbp e fbc são os cookies do Pixel. Sem eles, a Conversions API tem muito mais
        // dificuldade de casar a venda com o clique no anúncio que a trouxe.
        metadata: { user_id: userId || '', plan, ref: (ref || '').toUpperCase(), eid,
                    email: email || '', fbp: fbp || '', fbc: fbc || '' },
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


// deploy bump 1783537421
