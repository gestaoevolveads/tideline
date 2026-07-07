/* ────────────────────────────────────────────────────────────
   Tideline — Configuração do Supabase (modo ao vivo do painel)

   A chave publishable (sb_publishable_...) é PÚBLICA por design — pode ficar
   no código. Quem protege os dados é o RLS (políticas no banco). A escrita
   exige login de admin (Supabase Auth).
   ──────────────────────────────────────────────────────────── */
window.TIDELINE_CONFIG = {
  SUPABASE_URL: 'https://efgqgfnijhkuvincxfst.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_dlDItMsVmfNLo1jhADYv3A_k2dV4m6i',
};
