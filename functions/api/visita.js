// Cloudflare Pages Function — registra a visita COM a localização.
//
// Antes a visita ia direto do navegador pro Supabase, e o navegador não sabe onde a pessoa
// está. Pedir a localização por GPS seria invasivo e espantaria gente. Comprar um serviço de
// geolocalização por IP seria pagar por algo que a gente já tem: o Cloudflare, que serve o
// site, JÁ sabe a cidade e o estado de quem acessou, e entrega isso de graça em request.cf.
//
// Então a visita passa a bater aqui, o Cloudflare carimba a origem, e só então vai pro banco.
// Continua ANÔNIMA: nenhum dado de conta, nenhum IP guardado. Cidade e estado são de granularidade
// grosseira e não identificam ninguém.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return json({ ok: false }, 200);   // sem banco, a visita simplesmente não é contada
    }

    const b = await request.json().catch(() => ({}));
    const cf = request.cf || {};

    const linha = {
      path: (b.path || '/').slice(0, 200),
      ref: (b.ref || null),
      sid: (b.sid || null),
      utm_source: b.utm_source || null,
      utm_medium: b.utm_medium || null,
      utm_campaign: b.utm_campaign || null,
      // o carimbo do Cloudflare
      cidade: cf.city || null,
      estado: cf.regionCode || cf.region || null,   // "SP", "RJ", "BA"...
      pais: cf.country || null,                     // "BR"
    };

    await fetch(`${env.SUPABASE_URL}/rest/v1/visits`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(linha),
    });

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false });   // uma visita não contada nunca pode quebrar a página
  }
}

function json(obj) {
  return new Response(JSON.stringify(obj), {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}
