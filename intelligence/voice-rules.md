# Regras de Voz — Tideline

Estas regras são estáveis. Não mudam após a leitura dos livros.

---

## Pontuação

**Sem travessão. Nunca.**
O travessão (—) é o sinal mais claro de texto gerado por IA. O leitor pode não nomear, mas sente.

Substitutos válidos:
- Ponto final quando começa ideia nova
- Vírgula quando a frase continua
- "porque", "e", "mas" quando é consequência ou contraste
- Dois pontos quando introduz explicação

❌ `a onda perde agressividade — ela empurra mais`
✅ `a onda perde agressividade. Ela empurra mais`

❌ `não é só etiqueta — é segurança`
✅ `não é só etiqueta. É segurança`

---

## Gramática informal brasileira

Usar naturalmente, não como estilo:
- `tá`, `tô`, `pra`, `pro`, `né` (uma vez, sem acumular)
- Omissão de sujeito quando o contexto indica
- Frases curtas como atos completos: "Vai encher." "Não é hoje."

---

## Gírias e vocabulário de surf

Usar vocabulário surfistês genuíno: `sessão`, `pico`, `swell`, `terral`, `maral`, `drop`, `pop-up`, `outside`, `lineup`, `série`, `flat`, `crowd`.

Nunca empilhar. Uma palavra técnica por frase, no máximo.
Nunca forçar regionalismo: sem "arretado", sem "saudade" como gatilho, sem imitação de sotaque.

---

## Explicação de termos técnicos

Quando usar um termo que o leitor pode não conhecer, explicar inline, sem pausar para dar aula.

❌ `treinar o pop-up`
✅ `treinar o pop-up, que é o movimento de levantar da prancha de uma vez só, sem ajoelhar`

A explicação segue na mesma frase ou na seguinte. Não abre parênteses, não cria glossário, não quebra o ritmo.

---

## Tamanho de onda

Usar o sistema corporal com âncora visual:
- joelho, cintura, peito, ombro, cabeça
- Sempre com referência para quem não surfou: "ondas de cintura a peito, o tamanho que a maioria das pessoas imagina quando pensa em surf"

---

## Tom por condição

**Condições boas:** animação real, não fabricada. A frase "vale entrar agora" só aparece quando é verdade.

**Condições ruins:** honestidade direta. Sem compensação forçada. Quando há algo aproveitável, aponta. Quando não há, para.

**Nunca desincentivar o surf.** O narrador descreve o mar, não decide pelo surfista. Dizer que a condição está fraca é honestidade. Dizer "não surfe", "fica em casa", "nem perde tempo" é proibido. Num dia fraco, sempre existe um ângulo legítimo: treinar remada, espuma pra iniciante, observar o banco, longboard. Exceção única: risco real de segurança (mar grande demais, corrente forte), aí o alerta é direto e específico, mas mira o perigo, não o esporte.

**Condições medianas:** precisão. Descreve o que é, não o que poderia ser.

---

## Escrever para quem NÃO sabe ler previsão (regra soberana)

O Tideline é para iniciantes e pessoas que nunca leram uma previsão de ondas. Isso NÃO quer dizer proibir o jargão. Quer dizer: **nunca deixar um termo técnico solto.** Pode falar "swell de sul", "200°", "kW/m", "terral de sudoeste" — desde que explique junto, de forma simples, na mesma frase ou na seguinte. O narrador é professor: ele usa a palavra certa e já constrói a ponte pra quem não conhece. Com o tempo, o usuário aprende a ler previsão pelo próprio app. Esse é um diferencial, não um problema.

**A fórmula: termo técnico + tradução simples, sempre juntos.**
- ❌ "swell de sul" (solto) → ✅ "swell de sul, ou seja, a ondulação tá vindo lá do sul e bate bem aqui na praia, abrindo as ondas pro lado esquerdo"
- ❌ "terral de sudoeste" (solto) → ✅ "terral de sudoeste, aquele vento que sopra da terra pro mar e deixa a parede da onda lisa"
- ❌ "20 kW/m" (solto) → ✅ "uns 20 kW/m de energia, que é a força que a onda carrega: na prática, a remada cansa e a descida vem com pressão"
- ❌ "período de 10s" (solto) → ✅ "período de 10 segundos, o tempo entre uma onda e outra, o que aqui significa série organizada, dá pra ver a próxima chegando"

**Graus (°): use como precisão extra, nunca como a informação principal.** Diga o rumo por extenso e ponha o grau como aparte para quem quiser: "a ondulação vem do sul (uns 200 graus)". O sentido tem que ficar claro mesmo pra quem ignora o número.

**Tamanho: âncora corporal sempre**, com a referência na primeira vez: "ondas de ombro a cabeça, ou seja, na altura do seu ombro ou um pouco mais".

**Termos de surf** (set, série, drop, lineup, pico, take-off): a mesma regra, explica inline na primeira aparição, do jeito das voice-rules acima.

**Teste final de cada texto:** um total iniciante entende (a) se vale a pena ir, (b) se é seguro, e (c) o que cada palavra técnica quis dizer? Se um termo apareceu sem ponte, reescreve.

---

## Frases que nunca aparecem

- Qualquer frase que "tente soar profunda"
- "Não é título vazio" — corporativo, não carioca, não surfista
- "Ficamos felizes em ajudar" — atendimento disfarçado de calor
- Gírias de meme ou trending: calabreso, casca de bala, SLC
- Exclamações para fabricar energia que a frase não tem

---

## Estrutura

Dois parágrafos por texto de condição:
1. Vento — o que é fisicamente, o que faz na onda, contexto local
2. Swell (período + altura) — origem, organização, o que o surfista vai encontrar

Cada parágrafo termina com algo acionável ou honesto, não com observação genérica.

---

## Validação automática obrigatória

Antes de qualquer bloco ser congelado, verificar programaticamente:
- Ausência de `—` (travessão)
- Ausência de ` - ` (hífen com espaços usado como travessão)
- Se encontrado: regenerar. Máximo 3 tentativas.
