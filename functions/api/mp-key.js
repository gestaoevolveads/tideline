// A chave PÚBLICA do Mercado Pago, entregue pro navegador.
//
// Ela é pública por natureza: serve só pra cifrar o cartão dentro do celular da pessoa, e
// não abre nada na conta. A chave que abre (o access token) fica no servidor e nunca sai
// daqui. Ainda assim, ela vem por esta rota em vez de ficar escrita no HTML, pra você poder
// trocar a credencial no Cloudflare sem precisar mexer no código e fazer deploy de novo.
//
// Env: MP_PUBLIC_KEY

export async function onRequestGet(context) {
  const { env } = context;
  return new Response(JSON.stringify({ chave: env.MP_PUBLIC_KEY || '' }), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=3600',   // não muda: não precisa perguntar toda hora
    },
  });
}
