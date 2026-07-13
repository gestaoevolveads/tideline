-- E-book "Guia Ler o Mar": bucket privado + permissão de upload só para o admin.
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez sem quebrar nada.

-- 1) o bucket. PRIVADO: ninguém baixa direto pela URL.
--    Quem entrega o arquivo é a /api/ebook-link, que confere o login no servidor e
--    devolve um link assinado que expira em 5 minutos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ebooks', 'ebooks', false, 52428800, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = 52428800,
      allowed_mime_types = array['application/pdf'];

-- 2) só o admin sobe e troca o arquivo (o painel usa a sessão dele).
drop policy if exists "admin sobe ebook"  on storage.objects;
drop policy if exists "admin troca ebook" on storage.objects;
drop policy if exists "admin ve ebook"    on storage.objects;

create policy "admin sobe ebook" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ebooks' and auth.jwt() ->> 'email' = 'hcmsffc@gmail.com');

create policy "admin troca ebook" on storage.objects
  for update to authenticated
  using (bucket_id = 'ebooks' and auth.jwt() ->> 'email' = 'hcmsffc@gmail.com');

create policy "admin ve ebook" on storage.objects
  for select to authenticated
  using (bucket_id = 'ebooks' and auth.jwt() ->> 'email' = 'hcmsffc@gmail.com');

-- Repare que NÃO existe policy de leitura para o usuário comum, e é de propósito.
-- Ele nunca fala com o Storage: fala com a /api/ebook-link, que usa a service role.
