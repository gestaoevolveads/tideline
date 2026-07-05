# Tideline — Modelo de Monetização

> Decisões de 05/07/2026. Documento vivo.

## Princípios

- Custo de operação quase fixo (~R$100-200/mês): arquitetura estática + cache de narrações. Todo assinante novo é margem.
- **Cobrança pelo site (Pix/cartão via Mercado Pago ou Stripe), nunca dentro do app** — evita os 15-30% da Apple/Google. O app só faz login.
- O diferencial defensável é o narrador alimentado pelos livros (corpus proprietário que concorrente não vê).

## Preço

| Plano | Valor | Nota |
|---|---|---|
| Mensal | R$19,90 | Justificado pelo stack: alertas + 7 dias + cupons |
| Anual (âncora) | R$149 | "2 meses grátis", sai a R$12,40/mês. Plano empurrado |
| Fundador | R$99/ano vitalício | Primeiros 300 assinantes. Caixa antecipado + prova social |

Argumento central de venda: **a assinatura se paga** — os cupons de parceiros devolvem mais que R$19,90/mês (lógica Amazon Prime).

## Free vs Premium

| | Free | Premium |
|---|---|---|
| Previsão + análise do narrador | 3 dias | 7 dias |
| Dias 4-7 | Borrados com título visível (FOMO) | Abertos |
| Alertas de swell (push/WhatsApp), praias favoritas | ✗ | ✓ |
| Ranking WSL + feed de notícias | ✓ | ✓ |
| Log de sessões | ✓ ilimitado (lock-in, nunca limitar) | ✓ + estatísticas da temporada |
| Session share | 3/mês, templates básicos com marca visível (loop viral) | Ilimitado + templates premium |
| Cupons exclusivos (lojas, cursos, escolas de surf) | ✗ | ✓ |

## Aquisição e conversão

- **Sem 1 mês grátis.** Trial premium de **7 dias, sem cartão** (cobre um fim de semana + uma virada de condição).
- Gatilho de conversão é o mar, não o calendário: quando vem swell bom, push/e-mail contextual "assinantes já receberam o alerta com a janela exata".
- Recuperação de trial expirado: disparo apenas quando surge condição boa na praia favorita do usuário.
- Freemium de nicho converte 3-5% → 1.000 assinantes ≈ 20-30 mil usuários free. Aquisição via Meta Ads (público: interesse surf + geo por praia).

## Projeção (líquido ~R$17/assinante após taxas + Simples)

| Assinantes | Receita líquida/mês | Uso sugerido |
|---|---|---|
| 100 | ~R$1.700 | Cobre infra, forma caixinha |
| 500 | ~R$8.500 | Pro-labore inicial 2 sócios + reinvestimento |
| 1.000 | ~R$17.000 | ~R$4-5k/sócio + verba de tráfego + caixa |
| 3.000 | ~R$51.000 | Negócio consolidado |

## Segunda linha de receita (futuro)

- Parceiros pagando por presença (lojas, escolas, pousadas) nas páginas de praia — audiência qualificada e geolocalizada.
- Afiliação nos cupons.

## Infra do checkout (quando implementar)

- Auth + dados por usuário: Supabase (free até 50k MAU, RLS).
- Pagamento: Mercado Pago (Pix + cartão recorrente) ou Stripe.
- App nas lojas: PWA primeiro, depois Capacitor. Loja é marketing, não canal de cobrança.
