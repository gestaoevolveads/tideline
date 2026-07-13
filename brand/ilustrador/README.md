# Estúdio de Ilustração do Tideline

Gera ilustrações no traço oficial da marca, no tamanho exato do Instagram, a partir de uma frase.

```bash
node brand/ilustrador/server.js
# abre http://localhost:4270
```

A chave da fal fica em `~/.fal_key` e nunca sai do servidor. O navegador não a vê.
Se quiser o Diretor de Arte ligado, ponha a chave da Anthropic em `~/.anthropic_key`.

## Como ele acerta o traço

Não é o prompt que segura o estilo. É a **referência**. Toda geração vai com até quatro
ilustrações aprovadas anexadas, e o modelo copia a mão delas. Sem referência, o resultado
sai genérico por mais bem escrito que esteja o texto. Foi assim que os desenhos do e-book
saíram no estilo certo depois de várias tentativas ruins.

As referências canônicas vivem em `refs/`. Quando você gerar algo excelente, clique em
**"Usar de base"** na galeria: aquele desenho vira referência das próximas gerações e o
estilo vai ficando cada vez mais seu. Vale promover os melhores para `refs/` de vez.

## O que já aprendemos na marra (está tudo codificado)

**Nunca escreva rótulo em CAIXA ALTA no prompt.** O modelo desenha a palavra literalmente
dentro da imagem. Já saiu um desenho com "DARK SMOOTH CHANNEL" escrito no meio do mar.
Por isso o prompt proíbe texto de forma agressiva.

**Diagrama didático não sai de texto.** Se você quer ensinar geometria (uma corrente de
retorno, a onda envergando na ponta), descrever em palavras não funciona: o modelo erra o
arranjo. Rabisque a composição no papel ou no Preview, fotografe e jogue no campo
**Croqui**. Ele entra como última imagem e o prompt manda seguir a composição dela e o
traço das outras. Foi o que finalmente funcionou.

**O Gemini carimba uma estrelinha** no canto inferior direito de tudo que o Nano Banana
gera. Cortar não resolve, o carimbo fica uns 8% para dentro. O `limpar-marca.py` reconstrói
o fundo por baixo dele e roda sozinho a cada geração. Duas ilustrações do e-book chegaram
a ser publicadas carimbadas antes de a gente perceber.

**Menos referência parecida vale mais que muita referência diferente.** Quatro imagens do
mesmo traço ensinam melhor do que oito de traços variados.

## Os arquivos

| | |
|---|---|
| `server.js` | O servidor. Guarda a chave, chama a fal, salva, limpa a marca, enquadra. |
| `estilo.js` | O `tideline-illustration-style.md` virado prompt executável. Mexa aqui se o estilo mudar. |
| `ui.html` | A interface. |
| `limpar-marca.py` | Apaga o carimbo do Gemini. |
| `refs/` | As referências de traço. O coração da coisa. |
| `saidas/` | Tudo que você gerou, no tamanho final. |

## Formatos

Quadrado 1080×1080, retrato 1080×1350, paisagem 1920×1080, story 1080×1920. O modelo
devolve na proporção certa e o servidor recorta no pixel exato.

## Motores

**Nano Banana** é o padrão porque foi o que desenhou o e-book e é o que mais respeita a
referência. **FLUX Kontext Max** está ligado e é uma alternativa mais nítida, mas tende a
deixar o traço limpo demais, o que tira justamente a mão humana que a gente quer.
