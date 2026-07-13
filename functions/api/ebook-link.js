// Cloudflare Pages Function — libera o e-book para quem tem conta.
// POST /api/ebook-link   Header: Authorization: Bearer <access_token do usuário>
// O guia é um presente de boas-vindas, não um prêmio de assinatura: reciprocidade só
// funciona ANTES do pedido. Quem está no teste de 14 dias baixa igual. O que ele protege
// é a criação de conta, que é a conversão que interessa.
// O arquivo continua num bucket PRIVADO e o link assinado expira em 5 minutos, então
// ninguém repassa por fora.
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

    // 2) basta ter conta. A validação de sessão acima já garante que é gente de verdade.

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
