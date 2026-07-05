# Tideline — Painel de Controle (Admin)

> Especificação do painel administrativo. Objetivo: você e o sócio editarem o app sem tocar em código. Construído sobre Supabase (mesma base do login de usuários) + página `admin` protegida por papel de administrador.

## Princípio

Tudo que muda com frequência vira **dado** (tabela no Supabase ou JSON no repo), não código. O app e o gerador leem esses dados; o painel os edita. Nenhum deploy necessário para mudanças de conteúdo.

## Funcionalidades do painel

### 1. Praias (`beaches.json` / tabela `beaches`)
- **Adicionar praia:** nome, estado, região, lat/lon, tipo de fundo, orientação, janela de swell, direção do terral, maré ideal, nível, caráter/localismo.
- **Editar/remover praia.**
- Fonte da verdade única: o gerador de narrações e o app leem daqui. Hoje as praias estão cravadas no `scripts/generate-narrator.js` — migrar para dado.
- **Prioridade alta:** faltam muitas praias tradicionais. A lista precisa crescer bastante (points do Nordeste, clássicos de todas as regiões).

### 2. Templates de social share
- **Editar os templates** disponíveis para o usuário (os 3 do brand guide: "Noite no Mar", "Espuma", "Profundidade", + variações feed 1080x1080).
- Campos editáveis por template: cores, layout, quais stats aparecem, textos fixos, fundo (incluindo ilustrações da `brand/gallery/`).
- Ativar/desativar template, definir quais são premium.

### 3. Loja / Produtos
- **Adicionar/editar produto** (cursos, produtos físicos/digitais): nome, descrição, preço, imagem, link, ativo/inativo.
- **Editar preços** a qualquer momento.

### 4. Cupons
- Criar/editar cupons de desconto (parceiros: lojas, cursos, escolas de surf).
- Exclusivos para assinantes premium (ver `monetizacao.md`).
- Campos: código, parceiro, desconto, validade, exclusivo-premium (sim/não).

### 5. Assinantes e usuários (dashboard)
- Ver lista de usuários cadastrados.
- Ver assinantes ativos, receita do mês, churn, novos no período.
- Filtrar/buscar usuário.

### 6. Feed e ranking (controle)
- Disparar manualmente atualização do ranking WSL (pós-etapa).
- Ver/moderar o feed de notícias antes de publicar (opcional).

## Arquitetura

- **Auth + papéis:** Supabase Auth. Papel `admin` só para os sócios (Row Level Security garante que só admin acessa as tabelas de gestão).
- **Dados de conteúdo:** tabelas Supabase (produtos, cupons, templates, usuários) + `beaches.json` no repo (lido pelo gerador no GitHub Action).
- **Atalho dia 1:** o próprio painel de tabelas do Supabase já permite editar produtos/cupons de forma tosca enquanto o painel bonito é construído.
- **Página admin:** dentro do próprio Tideline, rota protegida, formulários simples.

## Dependências

Este painel nasce junto com o sistema de login (Supabase). Ordem sugerida: login/contas → tabelas de conteúdo → página admin. Ver `intelligence/architecture.md` e `monetizacao.md`.
