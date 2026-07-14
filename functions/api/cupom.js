// Cloudflare Pages Function — valida um cupom da loja.
//
// A validação vive AQUI, no servidor, e não no app. Se a lista de cupons fosse pro
// navegador, bastava abrir o código-fonte da página pra ler todos eles, inclusive os que
// você mandou pra dez pessoas. O app manda o código e recebe de volta só o desconto.
//
// O desconto que o app mostra é sempre reconferido no checkout antes de cobrar. O app é
// uma vitrine, e vitrine não define preço.
//
// GET /api/cupom?codigo=FUNDADOR&valor=158.94
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

export async function onRequestGet(context) {
  const { request, env } = context;
  const u = new URL(request.url);
  const codigo = (u.searchParams.get('codigo') || '').trim().toUpperCase();
  const valor = Number(u.searchParams.get('valor')) || 0;

  if (!codigo) return json({ erro: 'sem código' }, 400);

  const c = await validarCupom(env, codigo, valor);
  if (c.erro) return json(c, 200);          // 200: cupom inválido não é erro de servidor
  return json(c);
}

// Usada aqui e no checkout. O checkout NÃO confia no desconto que veio do navegador.
export async function validarCupom(env, codigo, valor) {
  const r = await fetch(
    `${env.SUPABASE_URL}/rest/v1/cupons?codigo=eq.${encodeURIComponent(codigo)}&select=*`,
    { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } },
  );
  const lista = r.ok ? await r.json() : [];
  const c = lista[0];

  // A mensagem diz o que aconteceu. "Cupom inválido" pra tudo faz a pessoa tentar de novo
  // achando que digitou errado, e desistir achando que a loja é quebrada.
  if (!c) return { erro: 'Esse cupom não existe.' };
  if (!c.ativo) return { erro: 'Esse cupom não está mais valendo.' };
  if (c.validade && new Date(c.validade) < new Date()) return { erro: 'Esse cupom venceu.' };
  if (c.limite_usos != null && c.usos >= c.limite_usos) return { erro: 'Esse cupom já foi todo usado.' };

  const bruto = c.tipo === 'reais' ? Number(c.desconto) : valor * Number(c.desconto) / 100;
  // Arredonda pra baixo no centavo e nunca deixa o desconto passar do preço da peça.
  const desconto = Math.min(Math.floor(bruto * 100) / 100, valor);

  return {
    codigo: c.codigo,
    desconto,
    tipo: c.tipo,
    rotulo: c.tipo === 'pct' ? `${Number(c.desconto)}% off` : `R$ ${Number(c.desconto).toFixed(2).replace('.', ',')} off`,
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}
