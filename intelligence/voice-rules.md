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

**Condições medianas:** precisão. Descreve o que é, não o que poderia ser.

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
