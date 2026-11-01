#!/usr/bin/env bash
# Core OS · imprime um .env pronto para o Dokploy, com segredos gerados por openssl.
# Não grava nada: redirecione se quiser guardar (fora do repositório).
# Uso: ./gerar-env.sh --nome "Seu Nome" --ip 203.0.113.10 [--painel-porta 3100] [--n8n-porta 5678]
#      ./gerar-env.sh --nome "Seu Nome" --dominio cerebro.exemplo.com
# Opções: --sem-exemplos  --motor codex|claude|openai|antigravity  --openai-key CHAVE
set -euo pipefail

NOME=""; IP=""; DOMINIO=""; EXEMPLOS=1; MOTOR=codex; OPENAI=""; PP=3100; NP=5678
while [ $# -gt 0 ]; do
  case "$1" in
    --nome) NOME="${2:-}"; shift 2;;
    --ip) IP="${2:-}"; shift 2;;
    --dominio) DOMINIO="${2:-}"; shift 2;;
    --sem-exemplos) EXEMPLOS=0; shift;;
    --motor) MOTOR="${2:-}"; shift 2;;
    --openai-key) OPENAI="${2:-}"; shift 2;;
    --painel-porta) PP="${2:-}"; shift 2;;
    --n8n-porta) NP="${2:-}"; shift 2;;
    *) echo "Opção desconhecida: $1" >&2; exit 1;;
  esac
done
falha() { echo "Erro: $*" >&2; exit 1; }
command -v openssl >/dev/null || falha "openssl não encontrado."
[ -n "$NOME" ] || falha "Faltou --nome."
case "$NOME" in *\"*|*\'*|*\$*|*\`*|*\\*|*$'\n'*) falha "O nome não pode ter aspas, \$, crase nem barra invertida.";; esac
[ -n "$IP" ] || [ -n "$DOMINIO" ] || falha "Informe --ip ou --dominio."
[ -z "$IP" ] || [ -z "$DOMINIO" ] || falha "Use só um: --ip ou --dominio."
case "$MOTOR" in claude|codex|openai|antigravity) ;; *) falha "Motor inválido: $MOTOR";; esac
case "$OPENAI" in *[[:space:]]*|*\"*|*\'*|*\$*|*\`*|*\\*) falha "Chave da OpenAI com caractere inválido.";; esac

if [ -n "$DOMINIO" ]; then
  N8N_HOST="n8n.$DOMINIO"; PROTO=https; PUB="https://n8n.$DOMINIO/"; SEC=true
else
  N8N_HOST="$IP"; PROTO=http; PUB="http://$IP:$NP/"; SEC=false
fi
SENHA=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)

cat <<ENV
CORE_OS_NOME="$NOME"
CORE_OS_EXEMPLOS=$EXEMPLOS
CORE_OS_MOTOR=$MOTOR
CORE_OS_PASSWORD=$SENHA
CORE_OS_HOOK_TOKEN=$(openssl rand -hex 24)
EVO_KEY=$(openssl rand -hex 24)
POSTGRES_PASSWORD=$(openssl rand -hex 24)
N8N_ENCRYPTION_KEY=$(openssl rand -hex 24)
N8N_HOST=$N8N_HOST
N8N_PROTOCOL=$PROTO
N8N_PUBLIC_URL=$PUB
N8N_SECURE_COOKIE=$SEC
OPENAI_API_KEY=$OPENAI
CORE_OS_CEREBRO=
CORE_OS_PAINEL_PORTA=$PP
N8N_PORTA=$NP
ENV
