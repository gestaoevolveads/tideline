#!/bin/bash
# Gera o PDF do e-book a partir do ler-o-mar.html.
#
# Por que não imprimir o HTML direto: o ler-o-mar.html é um FRAGMENTO (não tem <head>),
# porque quem monta o documento em volta dele é o publicador do Artifact. Impresso solto,
# o Chrome não sabe que o arquivo é UTF-8, chuta latin-1, e todos os acentos viram lixo
# ("previsão" vira "previsÃ£o"). Aqui a gente embrulha o fragmento num documento de
# verdade, com o charset declarado, e só então imprime.
set -e
cd "$(dirname "$0")"
TMP="$(mktemp -d)/ebook.html"

{
  printf '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Guia Ler o Mar — Tideline</title>\n</head>\n<body>\n'
  cat ler-o-mar.html
  printf '\n</body>\n</html>\n'
} > "$TMP"

SAIDA="${1:-$HOME/Desktop/Ler-o-Mar-Tideline.pdf}"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$SAIDA" --virtual-time-budget=20000 "file://$TMP" 2>/dev/null

echo "PDF gerado em: $SAIDA"
