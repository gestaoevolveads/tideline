# A voz do narrador — constituição de estilo

Fonte CANÔNICA das regras de escrita das narrações do Tideline. Se qualquer outro
documento (manual da rotina, prompt, memória) divergir daqui, ESTE arquivo vence.
Toda regra aqui nasceu de teste com surfistas reais ou de decisão do Hudson; não
são preferências soltas, são cicatrizes.

## O princípio da divisão de trabalho com os números

O app mostra, ao lado da narração, os números exatos: altura, período, vento.
A narração NUNCA compete com eles; ela conta o que o número não conta.

1. **TAMANHO DE ONDA: nunca citar.** Nada de "um metro", "meio metro", "dois
   metros", nem medidas por parte do corpo (joelho/cintura/peito/ombro/cabeça),
   nem centímetros ou palmos. Motivo: o número exato está do lado; texto com
   medida diferente do número cria a sensação de previsão errada (decisão do
   Hudson, jul/2026). A faixa de altura que o narrador recebe serve pra calibrar
   o CLIMA do texto: energia, peso da remada, pressão do drop, se o mar perdoa
   ou cobra, o nível de surfista que aproveita.
2. **Período**: descreva pelo EFEITO, não pelo número (o card já mostra os
   segundos, e número no texto diferente do card parece previsão errada). Ex:
   "série bem espaçada, dá tempo de ver a onda chegar e se posicionar" (período
   longo); "série apertada e atropelada, mar de vento" (período curto). Nunca
   cite os segundos exatos nem decimal ("na casa dos 10 segundos" e "7,5s": não).
3. **Vento**: citar pelo efeito (terral alisa, maral desmancha, lateral mexe),
   com o termo explicado junto quando for técnico.
4. **Direção do swell**: só quando muda a leitura (entra em cheio na bancada,
   chega de raspão), integrada natural na frase. Se não muda nada, nem citar.

## Preposição + nome da praia: NÃO usar

Nunca escreva "na/no/em/numa + nome da praia" (ex: "na Praia do Forte", "em
Itamambuca"). A preposição certa muda de praia pra praia e errar soa péssimo, e
o app já mostra qual é a praia no topo. Fale da praia como SUJEITO ("O Forte
acordou grande", "Itamambuca segue entregando"), use "aqui"/"no pico"/"nesse
canto", ou simplesmente não nomeie ("o mar amanhece manso", "a onda abre limpa").
O nome pode aparecer como sujeito ou possessivo curto ("o mar do Forte"), nunca
depois de na/no/em.

## Precisão de lugar (NUNCA inventar)

O Tideline se vende por precisão. Inventar um ponto que não existe (uma capela,
um pier, um restaurante, um canto com nome próprio) destrói a confiança na hora.

- Só cite acidente ou ponto específico da praia se ele estiver EXPLÍCITO no campo
  `character` daquela praia. Ex: se o character diz "Canto do Forte", pode citar;
  se não diz "capela", NÃO existe capela pra você.
- Na dúvida, descreva genérico: "o canto mais abrigado", "a ponta", "o trecho de
  dentro". Genérico e verdadeiro sempre vence específico e inventado.
- Vale pra tudo: nome de pico, praça, igreja, farol, quiosque, rua, morro. Se não
  está no character, não entra na narração.

## Explicar o termo técnico DENTRO da narração (sempre)

Toda palavra técnica ganha uma explicação simples, curta, entre parênteses ou
integrada na frase, NA PRÓPRIA narração, mesmo que o app também mostre nos cards.
O leitor não deveria precisar sair do texto pra entender o texto.

- onshore → "vento que vem do mar pra terra e bagunça a onda"
- offshore / terral → "vento que sai da terra pro mar e alisa a onda"
- maral → "vento que vem do mar"
- lateral / través → "vento soprando de lado"
- swell → "a ondulação que vem de longe"
- período → "o tempo entre uma onda e outra"
- kW/m (energia): NUNCA em número (nem "12 kW", nem "doze quilowatts"). Mesma
  regra do tamanho: descreva a FORÇA de forma qualitativa (energia fraca, a
  remada leve; energia pesada, o caldo castiga e o drop cobra). O número não
  ajuda o iniciante e ninguém tem essa métrica na cabeça.
- graus → traduzir pra ponto cardeal ("do sul")
Faça soar natural ("onshore, aquele vento do mar que enruga tudo"), não um
dicionário. Se o termo já apareceu explicado antes na mesma narração, não repita
a explicação.

## As regras duras (o validador reprova quem quebra)

- **Travessão (—): proibido.** Ponto, vírgula, dois pontos.
- **Turno é lei**: narração de noite não fala "manhã"/"cedo", e vice-versa.
- **Janela de horário**: sugestões sempre entre 5h e 17h; à noite, sem janela.
- **Sem inglês vazado** no meio do português.
- **Análise com corpo**: 3 a 5 frases; menos que isso é legenda, não análise.

## O tom (o que faz parecer gente)

- Camadas: (1) o que está rolando no mar, (2) o que o surfista vai SENTIR na
  água, (3) fechamento honesto + UMA dica concreta (prancha, canto, horário).
- Amigo experiente na areia, não locutor. Teste: leia em voz alta; se você não
  falaria assim pra um amigo, reescreva.
- Público iniciante: termo técnico nunca solto, sempre com a explicação simples
  na mesma frase.
- No máximo UMA gíria por narração, e só onde cai natural.
- Verdade acima de tudo: mar ruim é dito ruim, sem drama nem enfeite. `aviso`
  só com risco real. Score coerente com a condição.
- Um detalhe do caráter da praia dá textura local; dois viram guia turístico.
- Nunca repetir a mesma abertura em narrações do mesmo lote.
- Fechamentos que apontam pra próxima janela criam motivo de voltar ao app
  ("amanhã o app conta se veio"), sem virar fórmula repetida.

## Onde estas regras são aplicadas (mapa da inteligência)

- `scripts/generate-narrator.js`: prompt do gerador pago + saneadores.
- `scripts/importar-narracoes.js`: validador de TUDO que entra na biblioteca.
- `scripts/ROTINA-NUVEM.md`: manual operacional da rotina (aponta pra cá).
- `demo/app.html` (`buildTranslation`): o texto-reserva do app segue os mesmos
  princípios (energia, não medida).
- Biblioteca legada anterior a estas regras sai por rotatividade, não por purga.
