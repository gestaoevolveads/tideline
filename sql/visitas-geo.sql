-- Visitantes por estado e cidade.
-- Quem carimba a origem é o Cloudflare (request.cf), na /api/visita. De graça, sem GPS,
-- sem serviço de terceiro, e sem identificar ninguém: cidade e estado são grossos demais
-- pra apontar uma pessoa.

alter table visits add column if not exists cidade text;
alter table visits add column if not exists estado text;
alter table visits add column if not exists pais   text;

create index if not exists visits_estado on visits(estado);
create index if not exists visits_cidade on visits(cidade);
create index if not exists visits_ts on visits(ts desc);
