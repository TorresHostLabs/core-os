#!/usr/bin/env bash
# Core OS · entrypoint do painel no Docker. Prepara o cérebro e as preferências na primeira subida e inicia o servidor.
set -euo pipefail

CEREBRO="${CORE_OS_VAULT:-/home/node/cerebro}"
DADOS="${CORE_OS_DATA:-/home/node/dados}"
SRC=/app/cerebro-demo

if [ ! -w "$CEREBRO" ]; then
  echo "ERRO: sem permissão de escrita em $CEREBRO (a pasta do host é de outro usuário)." >&2
  echo "Corrija uma vez, no servidor, com a pasta do CORE_OS_CEREBRO:" >&2
  echo "  docker run --rm -v <pasta-do-cerebro>:/d alpine chown 1000:1000 /d" >&2
  exit 1
fi

# Cérebro: só cria se ainda não existir (atualizar o app nunca sobrescreve o que você escreveu)
if [ ! -f "$CEREBRO/CLAUDE.md" ]; then
  echo "Core OS: criando o cérebro em $CEREBRO"
  cp -a "$SRC/." "$CEREBRO/"
  if [ "${CORE_OS_EXEMPLOS:-1}" = "0" ]; then
    find "$CEREBRO/conteudo" -mindepth 2 -maxdepth 2 -type d -exec rm -rf {} +
    find "$CEREBRO/conteudo" -mindepth 2 -name '*.md' ! -name CLAUDE.md -delete
  fi
  NOME_ESC=$(printf '%s' "${CORE_OS_NOME:-Seu Nome}" | sed 's/[&|\\]/\\&/g')
  grep -rl '{{NOME}}' "$CEREBRO" | xargs -r sed -i "s|{{NOME}}|$NOME_ESC|g"
fi
# a cópia perde a permissão de execução em alguns casos: garante nos motores das skills
find "$CEREBRO/.claude/skills" -path '*/motor/*' -type f \( -name '*.sh' -o -name '*.py' \) -exec chmod +x {} + 2>/dev/null || true

# Motor padrão (só na primeira vez; depois vale o que foi escolhido em Configurações)
mkdir -p "$DADOS"
if [ -n "${CORE_OS_MOTOR:-}" ] && [ ! -f "$DADOS/motores.json" ]; then
  case "$CORE_OS_MOTOR" in
    claude|codex|openai|antigravity)
      printf '{"padrao":"%s","whatsapp":"%s"}\n' "$CORE_OS_MOTOR" "$CORE_OS_MOTOR" >"$DADOS/motores.json";;
    *) echo "Aviso: CORE_OS_MOTOR=\"$CORE_OS_MOTOR\" inválido (use claude, codex, openai ou antigravity); ignorado." >&2;;
  esac
fi

cd /app
exec node server.js
