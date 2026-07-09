// Cloudflare Pages Function — status da oferta de fundador (SEM expor o número de vagas)
// GET /api/founder-status?u=USERID  →  { open, youAreFounder, price }
// open = ainda há vaga de fundador E esse usuário pode pegá-la (não é fundador ainda)
// Usado pela landing e pelo assinar.html pra mostrar preço e a linha de escassez.
// Degradação segura: qualquer falha → open:false, price:149.

const FOUNDER_LIMIT = 300;

export async function onRequestGet(context) {
  const { request, env } = context;
  const u = new URL(request.url).searchParams.get('u') || '';
  let youAreFounder = false, open = false;
  try {
    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      if (u) {
        const prof = await sbGet(env, `profiles?id=eq.${encodeURIComponent(u)}&select=founder`);
        if (prof !== null) youAreFounder = !!(prof[0] && prof[0].founder === true);
        else return json({ open: false, youAreFounder: false, price: 149 }); // coluna ausente
      }
      const count = await sbCount(env, 'profiles?founder=eq.true');
      if (count >= 0) open = count < FOUNDER_LIMIT && !youAreFounder;
    }
  } catch (e) {}
  return json({ open, youAreFounder, price: open ? 99 : 149 });
}

export async function onRequestOptions() {
  return new Response(null, { headers: cors() });
}

async function sbGet(env, q) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${q}`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } });
  return r.ok ? r.json() : null;
}
async function sbCount(env, q) {
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${q}&select=id`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, Prefer: 'count=exact', Range: '0-0' } });
    if (!r.ok) return -1;
    const cr = r.headers.get('content-range');
    if (cr && cr.includes('/')) { const n = parseInt(cr.split('/')[1], 10); return isNaN(n) ? -1 : n; }
    return -1;
  } catch (e) { return -1; }
}
function cors() { return { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS' }; }
function json(obj) { return new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json', ...cors() } }); }
