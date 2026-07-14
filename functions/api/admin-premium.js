// Cloudflare Pages Function — gerencia premium de usuários (SÓ admin).
// POST /api/admin-premium   Header: Authorization: Bearer <access_token do admin>
// Body: { action, ... }
//   'grant'  { email, vitalicio?:bool, dias?:number }   -> torna a conta premium (cortesia)
//   'revoke' { email }                                    -> remove o premium
//   'create' { email, senha, nome?, vitalicio?, dias? }   -> cria conta (teste) já premium
//   'delete' { email }                                    -> exclui a conta (Auth + profile)
// Premium dado aqui é CORTESIA (não pagante): marca profiles.cortesia = true, pra não
// contar como receita no painel. Pagante de verdade só vem do webhook de pagamento.
// Segurança: valida o token no Supabase e exige que o e-mail seja o do admin.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const ADMIN_EMAILS = ['hcmsffc@gmail.com'];
const VITALICIO_UNTIL = '2099-01-01T00:00:00Z';

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Supabase não configurado' }, 500);

    // 1) autentica: só o admin passa
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'sem token' }, 401);
    const who = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${token}` },
    });
    if (!who.ok) return json({ error: 'token inválido' }, 401);
    const admin = await who.json();
    if (!ADMIN_EMAILS.includes(String(admin.email || '').toLowerCase())) return json({ error: 'sem permissão' }, 403);

    let b = {};
    try { b = await request.json(); } catch {}
    const action = b.action;
    const email = String(b.email || '').trim().toLowerCase();

    const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
    const HJ = { ...H, 'content-type': 'application/json' };

    async function findByEmail(em) {
      const r = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(em)}&select=id,email,nome,plano,premium_until`, { headers: H });
      if (!r.ok) return null;
      const a = await r.json();
      return (a && a[0]) || null;
    }
    function patchById(id, patch) {
      return fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: { ...HJ, prefer: 'return=minimal' }, body: JSON.stringify(patch),
      });
    }
    // best-effort: marca cortesia num PATCH isolado; se a coluna não existir ainda,
    // o resto não quebra (o premium já foi aplicado).
    async function marcaCortesia(id, valor) { try { await patchById(id, { cortesia: valor }); } catch {} }
    function untilFrom(src) {
      if (src.vitalicio) return VITALICIO_UNTIL;
      const dias = Number(src.dias) || 0;
      return dias > 0 ? new Date(Date.now() + dias * 86400000).toISOString() : null;
    }

    if (action === 'grant') {
      if (!email) return json({ error: 'email obrigatório' }, 400);
      const p = await findByEmail(email);
      if (!p) return json({ error: 'usuário não encontrado (ele precisa ter uma conta)' }, 404);
      const until = untilFrom(b);
      if (!until) return json({ error: 'escolha vitalício ou um nº de dias' }, 400);
      const plano = b.vitalicio ? 'vitalicio' : 'premium';
      const r = await patchById(p.id, { plano, premium_until: until });
      if (!r.ok) return json({ error: 'falha ao atualizar o perfil' }, 502);
      await marcaCortesia(p.id, true);
      return json({ ok: true, email, plano, premium_until: until, cortesia: true });
    }

    if (action === 'revoke') {
      if (!email) return json({ error: 'email obrigatório' }, 400);
      const p = await findByEmail(email);
      if (!p) return json({ error: 'usuário não encontrado' }, 404);
      const r = await patchById(p.id, { plano: 'free', premium_until: null });
      if (!r.ok) return json({ error: 'falha ao remover o premium' }, 502);
      await marcaCortesia(p.id, false);
      return json({ ok: true, email, plano: 'free' });
    }

    if (action === 'create') {
      if (!email || !b.senha) return json({ error: 'email e senha obrigatórios' }, 400);
      const nome = String(b.nome || 'Teste').trim() || 'Teste';
      const cr = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST', headers: HJ,
        body: JSON.stringify({ email, password: String(b.senha), email_confirm: true, user_metadata: { nome } }),
      });
      const created = await cr.json().catch(() => ({}));
      if (!cr.ok) return json({ error: (created && (created.msg || created.error_description || created.error)) || 'falha ao criar a conta (talvez já exista)' }, 400);
      const id = created.id || (created.user && created.user.id);
      if (!id) return json({ error: 'conta criada, mas sem id de volta' }, 502);
      const until = untilFrom({ vitalicio: b.vitalicio !== false, dias: b.dias }) || VITALICIO_UNTIL;
      const plano = (b.vitalicio === false && Number(b.dias) > 0) ? 'premium' : 'vitalicio';
      const up = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST', headers: { ...HJ, prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ id, email, nome, plano, premium_until: until }),
      });
      if (!up.ok) { const t = await up.text(); return json({ error: 'conta criada, mas falhou marcar premium: ' + t }, 502); }
      await marcaCortesia(id, true);
      return json({ ok: true, email, id, plano, premium_until: until, cortesia: true });
    }

    if (action === 'delete') {
      if (!email) return json({ error: 'email obrigatório' }, 400);
      const p = await findByEmail(email);
      if (!p) return json({ error: 'usuário não encontrado' }, 404);
      await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${p.id}`, { method: 'DELETE', headers: H });
      await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(p.id)}`, { method: 'DELETE', headers: { ...H, prefer: 'return=minimal' } });
      return json({ ok: true, email, deleted: true });
    }

    return json({ error: 'ação desconhecida' }, 400);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}
