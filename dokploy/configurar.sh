#!/usr/bin/env bash
# Core OS · configuração pós-deploy no Dokploy. Rode UMA vez depois do primeiro Deploy,
# num clone deste repositório no servidor, por um usuário do grupo docker (sem sudo).
# Uso: ./configurar.sh [--projeto NOME_DO_PROJETO_COMPOSE] [--url http://IP:3100]
# Pode rodar de novo: importa o fluxo de novo e mantém a instância do WhatsApp.
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ATIVAR="$AQUI/../skill/stack/ativar-fluxo.py"
PROJETO=""; URL=""
while [ $# -gt 0 ]; do
  case "$1" in
    --projeto) PROJETO="${2:-}"; shift 2;;
    --url) URL="${2:-}"; shift 2;;
    *) echo "Opção desconhecida: $1" >&2; exit 1;;
  esac
done

passo() { printf '\n\033[1;34m▸ %s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
aviso() { printf '  \033[33m!\033[0m %s\n' "$*"; }
falha() { printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

command -v docker >/dev/null || falha "docker não encontrado."
docker info >/dev/null 2>&1 || falha "Sem acesso ao Docker. O usuário precisa estar no grupo docker."
[ -f "$ATIVAR" ] || falha "Não achei $ATIVAR. Rode a partir de um clone completo do repositório."

# acha o container de um serviço pelo label do Compose
acha() {
  local filtros=(--filter "label=com.docker.compose.service=$1")
  [ -z "$PROJETO" ] || filtros+=(--filter "label=com.docker.compose.project=$PROJETO")
  local ids; ids=$(docker ps -q "${filtros[@]}")
  [ -n "$ids" ] || falha "Container do serviço \"$1\" não está rodando. O deploy terminou?"
  [ "$(printf '%s\n' "$ids" | wc -l)" -eq 1 ] || falha "Mais de um container \"$1\" (outro app Compose?). Use --projeto com o nome do projeto (docker ps --format '{{.Names}}')."
  printf '%s' "$ids"
}

passo "Containers"
N8N=$(acha n8n); PAINEL=$(acha painel); EVO=$(acha evolution)
ok "n8n, painel e evolution encontrados"

passo "1/5 · Importar o fluxo do WhatsApp no n8n"
docker exec "$N8N" n8n import:workflow --input=/fluxos/whatsapp-claude.json >/dev/null 2>&1 \
  || falha "Não consegui importar o fluxo. Veja: docker logs $N8N"
ok "fluxo importado"

passo "2/5 · Publicar a versão do fluxo"
VOLUME_N8N=$(docker inspect "$N8N" -f '{{range .Mounts}}{{if eq .Destination "/home/node/.n8n"}}{{.Name}}{{end}}{{end}}')
[ -n "$VOLUME_N8N" ] || falha "Não achei o volume do n8n."
# o script vem por stdin e o banco é lido dentro de um container temporário (sem root no host)
docker run --rm -i --user 1000 -v "$VOLUME_N8N:/n8n" python:3-alpine \
  python3 - /n8n/database.sqlite coreOsWhatsapp01 <"$ATIVAR" >/dev/null \
  || falha "Não consegui publicar o fluxo no banco do n8n."
ok "versão publicada"

passo "3/5 · Ativar o fluxo e reiniciar o n8n"
docker exec "$N8N" n8n update:workflow --id=coreOsWhatsapp01 --active=true >/dev/null 2>&1 \
  || falha "Não consegui ativar o fluxo. Veja: docker logs $N8N"
INICIO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
docker restart "$N8N" >/dev/null
# o /healthz responde antes dos fluxos ativarem: espera a linha "Activated workflow" no log
ATIVO=0
for _ in $(seq 1 60); do
  if docker logs --since "$INICIO" "$N8N" 2>&1 | grep -q "Activated workflow"; then ATIVO=1; break; fi
  sleep 2
done
[ "$ATIVO" -eq 1 ] || falha "O n8n reiniciou mas o fluxo não ativou em 2 minutos. Veja: docker logs $N8N"
ok "n8n no ar com o fluxo ativo"

passo "4/5 · Instância do WhatsApp na Evolution API"
# pela rede interna, de dentro do painel (tem curl, jq e EVO_KEY)
docker exec -i "$PAINEL" bash -s <<'REMOTO' || falha "Não consegui configurar a Evolution API. Veja: docker logs $EVO"
set -euo pipefail
EVO_URL=http://evolution:8080
evo() { curl -fsS -H "apikey: $EVO_KEY" -H 'Content-Type: application/json' "$@"; }
for _ in $(seq 1 60); do curl -fs -o /dev/null "$EVO_URL" && break; sleep 2; done
curl -fsS -o /dev/null "$EVO_URL"
if ! evo "$EVO_URL/instance/fetchInstances" | jq -e '.[] | select(.name=="cerebro")' >/dev/null 2>&1; then
  evo -X POST "$EVO_URL/instance/create" -d '{"instanceName":"cerebro","integration":"WHATSAPP-BAILEYS","qrcode":true}' >/dev/null
fi
evo -X POST "$EVO_URL/webhook/set/cerebro" -d '{"webhook":{"enabled":true,"url":"http://n8n:5678/webhook/core-os-whatsapp","byEvents":false,"base64":false,"events":["MESSAGES_UPSERT"]}}' >/dev/null
evo -X POST "$EVO_URL/settings/set/cerebro" -d '{"rejectCall":false,"msgCall":"","groupsIgnore":true,"alwaysOnline":false,"readMessages":false,"readStatus":false,"syncFullHistory":false}' >/dev/null
REMOTO
ok "instância \"cerebro\" pronta, webhook apontando pro n8n"

passo "5/5 · Pronto"
if [ -z "$URL" ]; then
  PORTA=$(docker port "$PAINEL" 3000/tcp 2>/dev/null | head -1 | sed 's/.*://' || true)
  if [ -n "$PORTA" ]; then URL="http://<IP-do-servidor>:$PORTA"; else URL="(o domínio configurado em Domains no Dokploy)"; fi
fi
printf '\n  Painel: %s\n  Senha:  a CORE_OS_PASSWORD do .env do app no Dokploy\n' "$URL"
printf '\n  Próximos passos:\n  1. Entre no painel e abra Configurações > WhatsApp para ler o QR\n     (celular: WhatsApp > Aparelhos conectados > Conectar aparelho).\n  2. Abra o n8n e crie a sua conta no primeiro acesso.\n\n'
