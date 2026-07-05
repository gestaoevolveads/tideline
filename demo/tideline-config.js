/* ────────────────────────────────────────────────────────────
   Tideline — Configuração do Supabase (modo ao vivo do painel)

   COMO ATIVAR (uma vez só, amanhã):
   1. Crie um projeto grátis em https://supabase.com
   2. No projeto: Settings → API → copie "Project URL" e a chave "anon public"
   3. Cole abaixo, salve e faça commit UMA vez (esse é o único deploy).
   4. Rode o schema (SUPABASE.md) e clique em "Publicar no Supabase" no painel.

   Depois disso: editar no painel atualiza o app AO VIVO, sem deploy.
   Enquanto estiver vazio, o app funciona normal lendo os arquivos JSON.
   ──────────────────────────────────────────────────────────── */
window.TIDELINE_CONFIG = {
  SUPABASE_URL: '',        // ex: https://xxxxxxxx.supabase.co
  SUPABASE_ANON_KEY: '',   // a chave "anon public" (pode ser pública, é segura)
};
