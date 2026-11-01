#!/bin/sh
# Core OS · entrada do container: prepara as pastas e sobe o painel. Roda como o usuário node (sem root).
set -e
VAULT="${CORE_OS_VAULT:-/home/node/cerebro}"
DADOS="${CORE_OS_DATA:-/home/node/dados}"
mkdir -p "$VAULT" "$DADOS" 2>/dev/null || true

# Cérebro vazio (primeira subida): copia o de demonstração. Pasta que já tem conteúdo nunca é tocada.
if [ -d "$VAULT" ] && [ -z "$(ls -A "$VAULT" 2>/dev/null)" ]; then
  if [ -w "$VAULT" ]; then
    echo "[core-os] cérebro vazio em $VAULT: copiando o cérebro de demonstração"
    cp -a /opt/cerebro-semente/. "$VAULT"/
  else
    echo "[core-os] AVISO: $VAULT está vazio, mas o usuário $(id -un) (uid $(id -u)) não pode escrever nele. Ajuste o dono da pasta no servidor." >&2
  fi
fi

# Codex CLI: a variável OPENAI_API_KEY sozinha NÃO loga o Codex (ele guarda a credencial em ~/.codex, que é um volume).
# Com a chave definida, loga com ela, e regrava a cada início (troca de chave vale). Login com conta ChatGPT já feito é respeitado.
if [ -n "$OPENAI_API_KEY" ] && command -v codex >/dev/null 2>&1; then
  if codex login status 2>&1 | grep -qi chatgpt; then
    echo "[core-os] Codex já está logado com uma conta ChatGPT: mantendo. A OPENAI_API_KEY continua valendo pro motor OpenAI (API)."
  elif printenv OPENAI_API_KEY | codex login --with-api-key >/dev/null 2>&1; then
    echo "[core-os] Codex autenticado com a OPENAI_API_KEY"
  else
    echo "[core-os] AVISO: não consegui autenticar o Codex com a OPENAI_API_KEY (rode: codex login --with-api-key)" >&2
  fi
fi

if [ -z "$CORE_OS_PASSWORD" ]; then
  echo "[core-os] AVISO: CORE_OS_PASSWORD não definida: o painel vai gerar uma senha aleatória e mostrá-la nestes logs." >&2
fi
exec "$@"
