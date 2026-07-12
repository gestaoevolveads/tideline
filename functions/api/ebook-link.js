// Cloudflare Pages Function — libera o e-book só para assinante premium.
// POST /api/ebook-link   Header: Authorization: Bearer <access_token do usuário>
// Confere no servidor se a pessoa é premium/vitalício e devolve um LINK ASSINADO
// (expira em 5 min). O arquivo fica num bucket PRIVADO — não dá pra repassar o link.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Supabase não configurado' }, 500);

    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'faça login para baixar' }, 401);

    // 1) quem é?
    const who = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${token}` },
    });
    if (!who.ok) return json({ error: 'sessão inválida, entre de novo' }, 401);
    const user = await who.json();

    // 2) é premium? (checagem no SERVIDOR — não dá pra burlar pelo navegador)
    const pr = await sb(env, `profiles?id=eq.${encodeURIComponent(user.id)}&select=plano,premium_until`);
    const p = (pr && pr[0]) || {};
    const ativo = (p.premium_until && new Date(p.premium_until).getTime() > Date.now()) || p.plano === 'vitalicio';
    if (!ativo) return json({ error: 'o guia é um bônus de assinante. Assine para baixar.' }, 403);

    // 3) qual é o e-book publicado?
    const cf = await sb(env, 'config?key=eq.ebook&select=value');
    const cv = ((cf && cf[0]) || {}).value || {};
    if (!cv.path) return json({ error: 'o guia ainda não foi publicado' }, 404);

    // 4) link assinado (5 minutos)
    const sg = await fetch(`${env.SUPABASE_URL}/storage/v1/object/sign/ebooks/${encodeURIComponent(cv.path)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ expiresIn: 300 }),
    });
    if (!sg.ok) return json({ error: 'falha ao gerar o link' }, 502);
    const s = await sg.json();
    return json({ url: `${env.SUPABASE_URL}/storage/v1${s.signedURL}`, titulo: cv.titulo || 'Guia Ler o Mar' });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

async function sb(env, q) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${q}`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  return r.ok ? r.json() : null;
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}
