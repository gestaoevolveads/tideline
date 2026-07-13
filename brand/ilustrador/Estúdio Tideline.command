#!/bin/bash
# Clique duas vezes neste arquivo. Ele liga o estúdio e abre no navegador.
# Para desligar, feche esta janela do Terminal.
cd "$(dirname "$0")"

if [ ! -f "$HOME/.fal_key" ] && [ -z "$FAL_KEY" ]; then
  echo ""
  echo "  Falta a chave da fal.ai."
  echo "  Rode uma vez, no Terminal:"
  echo "    echo 'SUA_CHAVE' > ~/.fal_key && chmod 600 ~/.fal_key"
  echo ""
  read -n 1 -s -r -p "  aperte qualquer tecla para fechar"
  exit 1
fi

# se já tem alguém na porta, só abre o navegador
if lsof -ti :4270 > /dev/null 2>&1; then
  echo "  O estúdio já estava no ar."
  open "http://localhost:4270"
  read -n 1 -s -r -p "  aperte qualquer tecla para fechar esta janela"
  exit 0
fi

echo ""
echo "  Ligando o Estúdio de Ilustração do Tideline..."
node server.js &
SERVIDOR=$!

# espera o servidor responder antes de abrir a tela
for i in {1..30}; do
  if curl -s -o /dev/null "http://localhost:4270/api/config"; then break; fi
  sleep 0.3
done

open "http://localhost:4270"
echo ""
echo "  Pronto. Feche esta janela quando quiser desligar."
echo ""

trap "kill $SERVIDOR 2>/dev/null" EXIT
wait $SERVIDOR
