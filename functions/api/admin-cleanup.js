// Cloudflare Pages Function — apaga contas de TESTE (Auth + profiles)
// POST /api/admin-cleanup   Header: Authorization: Bearer <access_token do admin>
// Body opcional: { dryRun: true } -> só lista, não apaga.
// Segurança: valida o token no Supabase e exige que o e-mail seja o do admin.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const ADMIN_EMAILS = ['hcmsffc@gmail.com'];

// mesmos padrões do painel: synctest, sync.test, qa.trial, qa.test, test<digito>, dummy, @example.
function isTeste(email, nome) {
  const e = String(email || '').toLowerCase();
  const n = String(nome || '').toLowerCase();
  if (/synctest|sync\.test|qa\.trial|qa\.test|\.test\.|test\d|dummy|@example\./.test(e)) return true;
  if (/\bqa\b|teste/.test(n)) return true;
  return false;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Supabase não configurado' }, 500);

    // 1) autentica: quem está chamando?
    const auth = request.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'sem token' }, 401);

    const who = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${token}` },
    });
    if (!who.ok) return json({ error: 'token inválido' }, 401);
    const user = await who.json();
    const email = String(user.email || '').toLowerCase();
    if (!ADMIN_EMAILS.includes(email)) return json({ error: 'sem permissão' }, 403);

    let body = {};
    try { body = await request.json(); } catch {}
    const dryRun = !!body.dryRun;

    // 2) acha os perfis de teste
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?select=id,email,nome`, {
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (!r.ok) return json({ error: 'falha ao ler profiles' }, 502);
    const todos = await r.json();
    const alvos = (todos || []).filter(p => isTeste(p.email, p.nome));

    if (dryRun) return json({ dryRun: true, total: alvos.length, contas: alvos.map(a => a.email) });

    // 3) apaga cada usuário no Auth (o profile cai junto se houver FK on delete cascade;
    //    por segurança, apagamos o profile também).
    let apagados = 0; const erros = [];
    for (const a of alvos) {
      try {
        const del = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${a.id}`, {
          method: 'DELETE',
          headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
        });
        await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(a.id)}`, {
          method: 'DELETE',
          headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, prefer: 'return=minimal' },
        });
        if (del.ok) apagados++; else erros.push(a.email);
      } catch (e) { erros.push(a.email); }
    }
    return json({ ok: true, apagados, erros, total: alvos.length });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}
