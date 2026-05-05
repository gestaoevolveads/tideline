# Arquitetura do Sistema de Inteligência — Tideline

## O problema que este sistema resolve

Textos gerados por IA a cada request são inconsistentes, caros e nunca soam como foram escritos pela mesma pessoa. Templates fixos são baratos mas mecânicos. Este sistema propõe um meio-termo: blocos pré-gerados com inteligência real, selecionados dinamicamente, com IA apenas como validadora — nunca como autora em produção.

---

## Decisões confirmadas nesta sessão

- Livros são infraestrutura **permanente** (não temporária). O RAG fica online para sempre.
- Claude é chamado em **runtime** para montar o texto final (RAG + blocos + persona + condições). Não é só geração de blocos offline.
- Cache compartilhado (Cloudflare KV) garante que cada combinação única seja gerada **uma vez** para todos os usuários.
- **5.760 combinações únicas** (60 praias × 3 ventos × 4 períodos × 8 alturas). Após warm-up do cache, custo de Claude → zero.
- Terminologia de tamanho de onda **a definir** após leitura dos livros. Ver `open-questions.md`.

---

## Três camadas

### Camada 1 — Conhecimento (permanente)
Todos os livros indexados num banco semântico (vector database). Oceanografia, geomorfologia costeira, previsão de ondas, cultura surf brasileira, linguagem portuguesa.

Os livros não são resumidos. Estão completos, indexados, recuperáveis por busca semântica. Nenhuma informação é perdida. O banco cresce conforme novos livros forem adicionados.

**Tecnologia:** Supabase com pgvector ou Cloudflare Vectorize
**Custo de indexação:** único, ~R$1-2 total
**Custo de operação:** zero (leitura do banco é gratuita no free tier)

### Camada 2 — Blocos (permanente, gerados uma vez)
Textos ricos gerados a partir dos livros + persona definida. Cobrem todas as combinações de condição relevantes: vento × período × altura × contexto de praia.

Os blocos são gerados uma vez, validados automaticamente (sem travessão, sem termos não explicados) e congelados. Depois de congelados, não mudam a menos que uma revisão editorial decida atualizar.

**Geração:** IA com system prompt que inclui persona + regras de voz + exemplos de condição + conhecimento dos livros
**Validação:** automática (regex para travessão e outros marcadores de texto IA)
**Volume estimado:** ~500-600 blocos cobrindo todas as combinações
**Custo de geração:** único, ~R$5-15 total
**Custo de operação:** zero

### Camada 3 — Seleção (runtime, sem geração)
Dado um conjunto de condições (praia + vento + período + altura + hora), o sistema seleciona os blocos correspondentes e os concatena. Nenhum texto é gerado. Nenhuma IA é chamada em produção.

O resultado é cacheado: mesma condição, mesma praia, mesmo período do dia = mesmo texto para qualquer usuário.

**Custo por request:** zero (seleção de banco + concatenação)
**Variação:** determinística. Condições idênticas = texto idêntico. Correto por design.

---

## O que acontece quando não há bloco para a combinação

Fallback em cascata:
1. Bloco do bucket mais próximo (período 11s → usa bucket ≥10s)
2. Bloco genérico para o tipo de condição (terral + bom swell)
3. Template simples do código atual

Na prática, os ~500 blocos cobrem todas as combinações reais.

---

## Fluxo de construção (uma vez)

```
1. Indexar livros no banco semântico
2. Para cada combinação de condição:
   a. Recuperar trechos relevantes dos livros
   b. Gerar bloco com: persona + regras + exemplos + trechos dos livros
   c. Validar automaticamente
   d. Salvar bloco no banco
3. Testar seleção com condições reais
4. Congelar
```

---

## Fluxo de produção (sempre)

```
Usuário acessa Tideline
  → condições calculadas (Open-Meteo)
  → condition_key = praia + vento_bucket + periodo_bucket + altura_bucket
  → busca no cache (Cloudflare KV)
  → cache hit: retorna texto
  → cache miss: busca bloco no banco → retorna + salva no cache
```

---

## Infraestrutura necessária

| Componente | Função | Custo |
|---|---|---|
| Supabase (free) | Banco de blocos + vector search | R$0/mês |
| Cloudflare Worker (free) | API proxy + lógica de seleção | R$0/mês |
| Cloudflare KV (free) | Cache de resultados | R$0/mês |
| Gemini/Claude (geração) | Gerar blocos uma vez | ~R$10-15 total |

---

## O que este arquivo não cobre ainda

- Modelo de interpretação das métricas (derivado dos livros, documento separado)
- Perfis culturais de cada praia (60 praias, documento separado)
- Processo detalhado de indexação dos livros
- Schema do banco de blocos

Estes documentos serão criados após a leitura dos livros.

---

## Status

- [x] Persona definida (`persona.md`)
- [x] Regras de voz definidas (`voice-rules.md`)
- [x] Exemplos v1 criados (`examples/`)
- [ ] Livros indexados
- [ ] Modelo de métricas derivado dos livros
- [ ] Blocos gerados
- [ ] Worker construído
- [ ] Sistema em produção
