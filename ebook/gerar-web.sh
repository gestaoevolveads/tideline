#!/bin/bash
# Gera o LEITOR (demo/guia.html) a partir do mesmo ler-o-mar.html que vira PDF.
# Uma fonte só: mudou o texto do e-book, roda isso e o leitor acompanha.
#
# A ideia: no papel, o conteúdo mora em folhas A4. Na tela do celular, folha A4 é uma
# tortura. Então o leitor reaproveita o conteúdo e joga fora a folha: vira um texto
# corrido, com tipografia de leitura, do jeito que se lê qualquer coisa no telefone.
set -e
cd "$(dirname "$0")"
python3 gerar-web.py
echo "leitor gerado em demo/guia.html"
