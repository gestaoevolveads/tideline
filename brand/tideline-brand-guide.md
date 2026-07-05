# Tideline — Brand Identity Guide

## Sobre o App
Tideline é um app brasileiro de surf: previsão de ondas, log de sessões, ranking WSL e feed de notícias.
Público: surfistas brasileiros, todos os níveis.
Tom: autêntico, técnico mas acessível, apaixonado pelo mar.

## Nome e Tagline
- **Nome:** Tideline
- **Tagline:** Surf. Log. Evolve.
- **Sem slogan alternativo.** Sempre "Tideline", nunca "Tide Line" (duas palavras).

## Paleta de Cores

| Nome    | Hex       | Uso principal                                      |
|---------|-----------|----------------------------------------------------|
| Deep    | #172726   | Fundo principal, backgrounds escuros               |
| Mid     | #243F3D   | Cards, containers secundários                      |
| Muted   | #476664   | Texto secundário, ícones, divisores                |
| Surface | #D3E2DE   | Texto principal sobre fundo escuro, foam das ondas |
| Accent  | #F95831   | CTAs, números em destaque, logo mark, urgência     |

**Regra de ouro:** Accent (#F95831) é escasso e poderoso. Use apenas em 1-2 elementos por composição.

## Tipografia
- **Fonte:** Helvetica Neue (ou substitutos: Inter, SF Pro, Arial)
- **Títulos:** Bold ou Black, letter-spacing positivo (2-6px)
- **Corpo:** Regular ou Medium
- **Labels/tags:** All caps, letter-spacing amplo (3-5px)
- **Números de destaque:** Bold, tamanho grande, sempre em Accent (#F95831)

## Logo
- Wordmark "TIDELINE" em caixa alta, Bold, tracking +6
- Tagline "SURF · LOG · EVOLVE" embaixo, tracking amplo, cor Muted
- Ícone: duas linhas curvas representando ondas, a superior em Accent (#F95831)
- Sobre fundo escuro: wordmark em Surface (#D3E2DE)
- Sobre fundo claro: wordmark em Deep (#172726)
- **Nunca:** logo em fundo que não seja Deep, Mid ou Surface

## Estilo de Ilustração
**Referência:** ver arquivo `tideline-wave-style.svg`

- Flat art com profundidade — não cartoon, não hiper-realista
- Ondas em tons de teal escuro (#243F3D, #476664) com espuma em Surface (#D3E2DE)
- Silhueta do surfista em Deep (#172726), prancha em Accent (#F95831)
- Perspectiva de quem assiste do canal, levemente abaixo da lip
- Spray e foam como elementos de textura, opacidade baixa
- Sem contornos pretos duros — os elementos se definem por contraste de cor
- Sensação: noite/anoitecer no oceano, dramático mas limpo

## Composição Geral
- **Fundos:** sempre escuros (Deep ou Mid) como base
- **Exceção:** Template "Espuma" usa Surface como fundo com texto Dark
- Hierarquia clara: ilustração → título → dados/stats → logo
- Espaço em branco generoso — não poluir
- Bordas arredondadas nos containers (8-16px)
- Sem gradientes complexos — sólidos com opacidade quando necessário

## O que NUNCA fazer
- Não usar mais de 2 cores de texto por composição
- Não usar Accent em textos longos (só numbers e ícones)
- Não usar fontes decorativas ou cursivas
- Não usar verde ou azul vibrante que destoe da paleta
- Não usar ilustrações com estilo cartoon infantil/fofo (o cartum retrô oficial da marca é regido por `tideline-illustration-style.md`)
- Não usar emojis como elementos de design
- Não usar fundos brancos puros (o branco do Tideline é Surface #D3E2DE)

## Templates de Stories — 3 variações

### Template 1 "Noite no Mar"
- Fundo: Deep (#172726) · Cards: Mid · Números: Accent · Texto: Surface

### Template 2 "Espuma"  
- Fundo: Surface (#D3E2DE) · Texto: Deep · Accent nos números e rodapé

### Template 3 "Profundidade"
- Fundo: Muted (#476664) · Cards: Deep · Texto: Surface · Accent escasso

## Conteúdo dos Templates "Minha Temporada 2026"
Cada template exibe:
- Logo Tideline (topo)
- Espaço para foto do usuário (grande, centralizado)
- Grid de stats (2x2): SESSÕES / PRAIA FAVORITA / MAIOR MAR / CONQUISTAS
  (nada de "streak" ou "km" — não fazem sentido pro surf. Usar só o que o diário
  registra: contagem de sessões, pico mais frequentado, maior onda pega, e a
  conquista/badge da temporada)
- Texto: "Minha Temporada 2026" (rodapé)
- Tamanho: 1080x1920px (formato Stories Instagram)

## Arte de Novidades (formato Feed)
- Tamanho: 1080x1080px
- Ilustração de onda com surfista (estilo acima) no terço superior
- Card escuro (Mid #243F3D) com texto:
  - "Aloha! Atenção, usuários:" — pequeno, Accent
  - "Temos novidades!" — grande, bold, Surface
  - "O Tideline atualizou e voce pode conferir agora no app as novidades. Confira ja!" — corpo, Surface opacidade 80%
- Logo pequeno no rodapé
