# Conhecimento Destilado do Tideline — Índice

Destilação do corpus de 38 livros/PDFs (`livros/`) em conhecimento estruturado para alimentar o narrador. Fase 1 do projeto de inteligência (ver `intelligence/architecture.md`).

**Como usar:** estes documentos entram no system prompt do gerador de narrações (com prompt caching). O narrador escreve *a partir* deste conhecimento — nunca o cita. A voz é regida por `persona.md` + `voice-rules.md`; o conhecimento é o que ela sabe.

## Os blocos

1. **[01-ondas-e-previsao.md](01-ondas-e-previsao.md)** — De onde vêm as ondas, os três números (altura/período/direção), vento (Coriolis, terral/maral), maré, os 5 fatores que transformam a onda na praia, energia em kW/m, e o modelo mental de leitura. *O coração da análise.*
2. **[02-geomorfologia-e-praias.md](02-geomorfologia-e-praias.md)** — Anatomia da praia, tipos de fundo, estados morfodinâmicos (dissipativa/refletiva/intermediária), como a onda quebra, corrente de retorno, deriva litorânea, janelas de swell/vento, mudança do pico no tempo, litoral brasileiro.
3. **[03-seguranca-no-mar.md](03-seguranca-no-mar.md)** — 85% dos afogamentos nas correntes de retorno, autossalvamento, quando emitir aviso, bandeiras, gravidade do afogamento, filosofia de prevenção. *Alimenta o campo `aviso`.*
4. **[04-etiqueta-e-tecnica.md](04-etiqueta-e-tecnica.md)** — Regras de prioridade no lineup (drop-in), técnica por nível (iniciante/intermediário/avançado), saúde, cultura do surf BR. Complementa os arquivos `research/`.
5. **[05-lingua-e-giria.md](05-lingua-e-giria.md)** — Registro culto informal, o que evitar (marcas de IA), critério de gíria, expressões idiomáticas do mar, ritmo da fala, como a precisão aparece sem jargão. *O diferencial de voz.*

## Relação com o resto

- **`research/`** — destilados anteriores (v1), focados em manobras, vocabulário e geografia/localismo. Ainda válidos; os blocos acima os referenciam em vez de duplicar.
- **`narrator-knowledge.md`** — o conhecimento que hoje alimenta o script atual. Deve ser substituído/expandido por estes blocos na refatoração do `generate-narrator.js`.
- **`livros/txt/`** — texto bruto extraído dos PDFs (gitignored), fonte para futuras expansões e para gerar perfis individuais das 75 praias.

## Perfis das praias

Feito: **[`data/beaches.json`](../../data/beaches.json)** — 87 praias (subiu das 75 originais) com perfil estruturado por praia: fundo (beach/point/reef/rivermouth), orientação, janela de swell, direção do terral, maré ideal, nível e caráter/localismo. É a **fonte única**: o gerador de narrações lê daqui, o narrador usa como contexto de cada pico, e o painel admin edita este arquivo (ver `business/painel-controle.md`).

- 45 das 87 têm `needsReview: true` (perfil por default regional) — refinar com dado local ao longo do tempo, direto pelo painel.
- Praias tradicionais adicionadas: Titanzinho e Praia do Futuro (CE), Baía Formosa e Ponta Negra (RN), Regência e Setiba (ES), Praia da Vila (Saquarema), Praia Brava e Farol de Santa Marta (SC), Imbituba, Cassino (RS), Itacarezinho (BA), entre outras. E picos mundiais completos (Snapper, Pipeline, Teahupoo, J-Bay...).

## Próximo passo desta trilha

Refatorar o `scripts/generate-narrator.js` para (a) ler as praias de `data/beaches.json` em vez da lista cravada no código, (b) injetar o perfil da praia + os blocos de conhecimento no system prompt, (c) usar o modelo de cache por condição + structured output. Depois, teste real com meia dúzia de praias.
