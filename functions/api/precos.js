// Cloudflare Pages Function — preços vigentes (fonte única de verdade)
// GET /api/precos  ->  { mensal, anual }
// A landing e o checkout LEEM daqui, e o /api/checkout COBRA a partir do mesmo config.
// Assim o preço exibido e o preço cobrado nunca divergem.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

export const PADRAO = { mensal: 19.90, anual: 149.00 };

export async function lerPrecos(env) {
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return { ...PADRAO };
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/config?key=eq.precos&select=value`, {
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (!r.ok) return { ...PADRAO };
    const rows = await r.json();
    const v = (rows && rows[0] && rows[0].value) || {};
    const mensal = Number(v.mensal);
    const anual = Number(v.anual);
    return {
      mensal: (mensal > 0 && mensal < 10000) ? mensal : PADRAO.mensal,
      anual:  (anual  > 0 && anual  < 10000) ? anual  : PADRAO.anual,
    };
  } catch (e) { return { ...PADRAO }; }
}

// textos editáveis da landing (título e subtítulo do topo)
async function lerLanding(env) {
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return {};
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/config?key=eq.landing&select=value`, {
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (!r.ok) return {};
    const rows = await r.json();
    return (rows && rows[0] && rows[0].value) || {};
  } catch (e) { return {}; }
}

export async function onRequestGet(context) {
  const [p, landing] = await Promise.all([lerPrecos(context.env), lerLanding(context.env)]);
  return new Response(JSON.stringify({ ...p, landing }), {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=60' },
  });
}
