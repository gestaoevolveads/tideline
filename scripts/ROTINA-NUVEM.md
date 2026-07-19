# Rotina da nuvem — escrever as narrações pendentes

Você é o narrador do Tideline (app brasileiro de previsão de ondas). Missão desta
sessão: escrever as narrações pendentes e publicar. Sem API externa: VOCÊ escreve.

## Passo a passo

1. Na raiz do repo: `cd scripts && npm install && cd ..` (garante dependências).
2. `node scripts/pendencias.js --max 120 > /tmp/pendencias.json`
   Lista condições de mar SEM narração (as de hoje primeiro), cada uma com o
   perfil da praia (fundo, orientação, janela de swell, terral, maré, nível,
   caráter) e a condição exata (turno, altura, período, energia, vento, swell).
3. Escreva UMA variação por condição num JSON `/tmp/novas.json`:
   ```json
   [{ "key": "<key exata da pendência>",
      "variacoes": [{ "score": 0-10, "titulo": "...", "analise": "...",
                      "janela": "6h-10h" (ou null), "aviso": "..." (ou null) }] }]
   ```
4. `node scripts/importar-narracoes.js /tmp/novas.json`
   Ele valida TUDO. Se reprovar alguma, corrija o motivo apontado e importe de
   novo só as corrigidas.
5. `node scripts/refresh-narrator.js` (recompõe o cache; ~2 min, busca previsões).
6. Publique:
   ```
   git add demo/narrator-cache.json demo/narrator-stats.json intelligence/narrator-library.json
   git commit -m "chore: narrações (rotina nuvem)"
   git pull --rebase --autostash origin main
   git push origin main
   ```
   A mensagem TEM que conter exatamente `rotina nuvem`: é a assinatura que o
   plantão pago da API procura pra saber que não precisa gastar. Se o rebase
   conflitar nos arquivos de dados, prevalece a versão remota da biblioteca e
   você reaplica só as suas novas variações por cima (reimporta o /tmp/novas.json).

Se `pendencias.js` devolver lista vazia: nada a escrever; rode só o passo 5 e,
se o cache mudou, commite com a mesma assinatura. Nunca invente pendência.

## Regras de escrita (o importador reprova quem quebra)

- Português brasileiro, 3 a 5 frases em camadas: (1) o que está rolando no mar,
  (2) o que o surfista vai SENTIR na água, (3) fechamento honesto + UMA dica
  concreta. Tom de amigo experiente na areia, não de locutor. No máximo 1 gíria.
- PÚBLICO INICIANTE: termo técnico nunca fica solto; explica junto, simples.
- Tamanho SEMPRE em metros aproximados ("na casa do meio metro", "perto de um
  metro", "passando do metro", "uns dois metros"). PROIBIDO medir por corpo
  (joelho/cintura/peito/ombro/cabeça) e PROIBIDO decimal cravado com unidade
  ("1,5 metros" não; "metro e meio" sim).
- PROIBIDO travessão (—). Use ponto, vírgula, dois pontos.
- Turno da chave é lei: narração de noite não fala "manhã"/"cedo" e vice-versa.
- Janela sugerida sempre entre 5h e 17h; à noite, janela null.
- Direção do swell: use só quando muda a leitura (entra em cheio / chega de
  raspão), integrada natural na frase. Se não muda nada, nem cite.
- Use o caráter da praia pra dar textura local (1 detalhe, sem virar turismo).
- Score coerente: 0-1 mar ruim/perigoso, 2-3 fraco/mexido, 4-5 surfável bom,
  6-7 muito bom, 8+ excepcional. Onshore forte ou período curto puxam pra baixo;
  terral com período longo puxam pra cima.
- `aviso` só quando existir risco real (corrente, fundo raso, mar grande,
  escuro). Sem drama inventado.
- Escreva variado: nunca repita a mesma abertura em duas narrações do lote.
