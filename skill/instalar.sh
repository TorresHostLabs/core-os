#!/usr/bin/env bash
# Core OS · instalador. Sobe o segundo cérebro numa VPS Ubuntu/Debian limpa:
# n8n + Evolution API (Docker), painel web com senha, cérebro em arquivos .md e o fluxo WhatsApp → n8n → Claude Code.
# Pode rodar de novo quantas vezes quiser: o que já existe é mantido (senhas, cérebro, conversas).
#
# Uso: sudo bash instalar.sh --nome "Seu Nome" --whatsapp 5511999998888 [--dominio cerebro.seudominio.com] [--sem-exemplos]
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# funciona do zip (cerebro/ e painel/ ao lado) e do git clone (../cerebro-demo e ../painel)
CEREBRO_SRC="$AQUI/cerebro"; [ -d "$CEREBRO_SRC" ] || CEREBRO_SRC="$AQUI/../cerebro-demo"
PAINEL_SRC="$AQUI/painel"; [ -d "$PAINEL_SRC" ] || PAINEL_SRC="$AQUI/../painel"
BASE=/opt/core-os
ENV_FILE=$BASE/.env
N8N_IMAGE_PADRAO="n8nio/n8n:1.123.4"
EVOLUTION_IMAGE_PADRAO="evoapicloud/evolution-api:v2.3.6"

NOME=""; WHATS=""; DOMINIO=""; EXEMPLOS=1; SENHA=""
while [ $# -gt 0 ]; do
  case "$1" in
    --nome) NOME="$2"; shift 2;;
    --whatsapp) WHATS="$(echo "$2" | tr -cd '0-9')"; shift 2;;
    --dominio) DOMINIO="$2"; shift 2;;
    --sem-exemplos) EXEMPLOS=0; shift;;
    --senha) SENHA="$2"; shift 2;;
    *) echo "Opção desconhecida: $1"; exit 1;;
  esac
done

passo() { printf '\n\033[1;34m▸ %s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
aviso() { printf '  \033[33m!\033[0m %s\n' "$*"; }
falha() { printf '\n\033[31m✗ %s\033[0m\n' "$*"; exit 1; }
segredo() { openssl rand -hex "${1:-24}"; }

[ "$(id -u)" -eq 0 ] || falha "Rode como root (sudo bash instalar.sh ...)."
[ -n "$NOME" ] || falha "Faltou --nome."
# --whatsapp é opcional: o dono do cérebro é quem conectar o número no QR (detectado sozinho)
[ -z "$WHATS" ] || [ ${#WHATS} -ge 12 ] || falha "Número de WhatsApp curto demais: use 55 + DDD + número."
if [ -n "$SENHA" ]; then
  [ ${#SENHA} -ge 8 ] || falha "Senha curta demais: use pelo menos 8 caracteres."
  case "$SENHA" in *[[:space:]]*|*\"*|*\'*|*\$*|*\`*|*\\*) falha "A senha não pode ter espaço, aspas, \$, \` nem barra invertida.";; esac
fi
. /etc/os-release; case "$ID" in ubuntu|debian) ;; *) falha "Sistema $ID não suportado (use Ubuntu ou Debian).";; esac

# Quem usa o Claude Code nesta máquina é o dono do cérebro e do painel.
DONO_SO="${SUDO_USER:-root}"
CASA="$(getent passwd "$DONO_SO" | cut -d: -f6)"
CEREBRO="$CASA/cerebro"

passo "1/8 · Pacotes do sistema"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates jq git openssl ufw ffmpeg qrencode python3 build-essential >/dev/null
ok "curl, jq, git, ffmpeg, qrencode, ufw"

passo "2/8 · Docker"
if ! command -v docker >/dev/null; then curl -fsSL https://get.docker.com | sh >/dev/null; fi
systemctl enable --now docker >/dev/null 2>&1
docker compose version >/dev/null || falha "Docker Compose não ficou disponível."
ok "$(docker --version | cut -d, -f1)"

passo "3/8 · Node.js"
NODE_MAJOR=$(node -v 2>/dev/null | sed 's/v\([0-9]*\).*/\1/' || echo 0)
if [ "${NODE_MAJOR:-0}" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
ok "Node $(node -v)"
CLAUDE_BIN="$(sudo -u "$DONO_SO" -i bash -lc 'command -v claude' 2>/dev/null || true)"
[ -n "$CLAUDE_BIN" ] || falha "Não achei o Claude Code pra $DONO_SO. Instale (curl -fsSL https://claude.ai/install.sh | bash) e rode de novo."
ok "Claude Code em $CLAUDE_BIN"

passo "4/8 · Senhas e configuração ($ENV_FILE)"
mkdir -p "$BASE"
touch "$ENV_FILE"; chmod 600 "$ENV_FILE"
pega() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- || true; }
poe() { local v; v=$(printf '%s' "$2" | sed -e 's/[\\&|]/\\&/g'); if grep -qE "^$1=" "$ENV_FILE"; then sed -i "s|^$1=.*|$1=$v|" "$ENV_FILE"; else printf '%s=%s\n' "$1" "$2" >>"$ENV_FILE"; fi; }
garante() { [ -n "$(pega "$1")" ] || poe "$1" "$2"; }
if [ -n "$SENHA" ]; then poe CORE_OS_PASSWORD "$SENHA"; else garante CORE_OS_PASSWORD "$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)"; fi
garante CORE_OS_HOOK_TOKEN "$(segredo 24)"
garante EVO_KEY "$(segredo 24)"
garante POSTGRES_PASSWORD "$(segredo 18)"
garante N8N_ENCRYPTION_KEY "$(segredo 24)"
garante N8N_IMAGE "$N8N_IMAGE_PADRAO"
garante EVOLUTION_IMAGE "$EVOLUTION_IMAGE_PADRAO"
poe CORE_OS_PORT 3000
poe CORE_OS_HOST 0.0.0.0
poe CORE_OS_VAULT "$CEREBRO"
poe CORE_OS_DATA "$BASE/dados"
poe CLAUDE_BIN "$CLAUDE_BIN"
poe EVO_URL http://127.0.0.1:8080
poe EVO_INSTANCE cerebro
[ -n "$WHATS" ] && poe WHATS_DONO "$WHATS"
# IP detectado localmente (sem consultar serviço de terceiros): interface usada pela rota padrão
IP="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<NF;i++) if($i=="src"){print $(i+1); exit}}')"
[ -n "$IP" ] || IP="$(hostname -I | awk '{print $1}')"
if [ -n "$DOMINIO" ]; then
  poe N8N_HOST "n8n.$DOMINIO"; poe N8N_PROTOCOL https; poe N8N_PUBLIC_URL "https://n8n.$DOMINIO/"; poe N8N_SECURE_COOKIE true
  URL_PAINEL="https://$DOMINIO"; URL_N8N="https://n8n.$DOMINIO"
else
  poe N8N_HOST "$IP"; poe N8N_PROTOCOL http; poe N8N_PUBLIC_URL "http://$IP:5678/"; poe N8N_SECURE_COOKIE false
  URL_PAINEL="http://$IP"; URL_N8N="http://$IP:5678"
fi
ok "segredos gerados (ficam só neste arquivo, permissão 600)"

passo "5/8 · Cérebro em $CEREBRO"
if [ ! -f "$CEREBRO/CLAUDE.md" ]; then
  mkdir -p "$CEREBRO"
  cp -a "$CEREBRO_SRC/." "$CEREBRO/"
  if [ "$EXEMPLOS" -eq 0 ]; then
    find "$CEREBRO/conteudo" -mindepth 2 -maxdepth 2 -type d -exec rm -rf {} +
    find "$CEREBRO/conteudo" -mindepth 2 -name '*.md' ! -name CLAUDE.md -delete
  fi
  NOME_ESC=$(printf '%s' "$NOME" | sed 's/[&|]/\\&/g')
  grep -rl '{{NOME}}' "$CEREBRO" | xargs -r sed -i "s|{{NOME}}|$NOME_ESC|g"
  chown -R "$DONO_SO":"$DONO_SO" "$CEREBRO"
  ok "estrutura criada$( [ "$EXEMPLOS" -eq 1 ] && echo ' com os 4 exemplos prontos')"
else
  ok "já existia, mantido como está"
fi

# zip baixado pelo navegador perde a permissão de execução dos motores das skills
find "$CEREBRO/.claude/skills" -path '*/motor/*' -type f \( -name '*.sh' -o -name '*.py' \) -exec chmod +x {} + 2>/dev/null || true

passo "6/8 · n8n + Evolution API"
mkdir -p "$BASE/stack"
cp -a "$AQUI/stack/." "$BASE/stack/"
ln -sf "$ENV_FILE" "$BASE/stack/.env"
(cd "$BASE/stack" && docker compose pull -q && docker compose up -d) >/dev/null
for i in $(seq 1 60); do curl -fs -o /dev/null http://127.0.0.1:8080 && break; sleep 2; done
curl -fsS -o /dev/null http://127.0.0.1:8080 || falha "Evolution API não respondeu. Veja: docker compose -f $BASE/stack/docker-compose.yml logs evolution"
for i in $(seq 1 60); do curl -fs -o /dev/null http://127.0.0.1:5679/healthz && break; sleep 2; done
ok "containers no ar"
# fluxo do WhatsApp no n8n (importa uma vez e ativa)
# importa sempre: reinstalar também atualiza o fluxo
docker compose -f "$BASE/stack/docker-compose.yml" exec -T n8n n8n import:workflow --input=/fluxos/whatsapp-claude.json >/tmp/core-os-n8n.log 2>&1 \
  || falha "Não consegui importar o fluxo no n8n. Veja: /tmp/core-os-n8n.log"
# o import do n8n 1.x não cria a versão publicada; sem ela a ativação falha
N8N_DB="$(docker volume inspect core-os_n8n -f '{{.Mountpoint}}')/database.sqlite"
python3 "$BASE/stack/ativar-fluxo.py" "$N8N_DB" coreOsWhatsapp01 >/dev/null || falha "Não achei o fluxo no banco do n8n."
docker compose -f "$BASE/stack/docker-compose.yml" exec -T n8n n8n update:workflow --id=coreOsWhatsapp01 --active=true >/tmp/core-os-n8n.log 2>&1 \
  || falha "Não consegui ativar o fluxo no n8n. Veja: /tmp/core-os-n8n.log"
docker compose -f "$BASE/stack/docker-compose.yml" restart n8n >/dev/null
for i in $(seq 1 60); do curl -fs -o /dev/null http://127.0.0.1:5679/healthz && break; sleep 2; done
ok "fluxo WhatsApp → Claude Code importado e ativo"
# instância do WhatsApp com webhook pro n8n
EVO_KEY=$(pega EVO_KEY)
evo() { curl -fsS -H "apikey: $EVO_KEY" -H 'Content-Type: application/json' "$@"; }
if ! evo http://127.0.0.1:8080/instance/fetchInstances | jq -e '.[] | select(.name=="cerebro")' >/dev/null 2>&1; then
  evo -X POST http://127.0.0.1:8080/instance/create -d '{"instanceName":"cerebro","integration":"WHATSAPP-BAILEYS","qrcode":true}' >/dev/null
fi
evo -X POST http://127.0.0.1:8080/webhook/set/cerebro -d '{"webhook":{"enabled":true,"url":"http://n8n:5678/webhook/core-os-whatsapp","byEvents":false,"base64":false,"events":["MESSAGES_UPSERT"]}}' >/dev/null
evo -X POST http://127.0.0.1:8080/settings/set/cerebro -d '{"rejectCall":false,"msgCall":"","groupsIgnore":true,"alwaysOnline":false,"readMessages":false,"readStatus":false,"syncFullHistory":false}' >/dev/null
ok "instância \"cerebro\" pronta, webhook apontando pro n8n"

passo "7/8 · Painel"
rm -rf "$BASE/painel.novo"; cp -a "$PAINEL_SRC" "$BASE/painel.novo"
rm -rf "$BASE/painel.novo/node_modules" "$BASE/painel.novo/data"
(cd "$BASE/painel.novo" && npm install --omit=dev --no-audit --no-fund -s) >/dev/null
rm -rf "$BASE/painel"; mv "$BASE/painel.novo" "$BASE/painel"
mkdir -p "$BASE/dados"; chown -R "$DONO_SO":"$DONO_SO" "$BASE/dados"
chgrp "$DONO_SO" "$ENV_FILE"; chmod 640 "$ENV_FILE"
cat >/etc/systemd/system/core-os-painel.service <<UNIT
[Unit]
Description=Core OS · painel do segundo cérebro
After=network-online.target docker.service

[Service]
User=$DONO_SO
WorkingDirectory=$BASE/painel
Environment=CORE_OS_ENV=$ENV_FILE
Environment=HOME=$CASA
Environment=PATH=$(dirname "$CLAUDE_BIN"):/usr/local/bin:/usr/bin:/bin
ExecStart=$(command -v node) server.js
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable core-os-painel >/dev/null 2>&1
systemctl restart core-os-painel
for i in $(seq 1 20); do curl -fs -o /dev/null http://127.0.0.1:3000/api/eu && break; sleep 1; done
curl -fsS -o /dev/null http://127.0.0.1:3000/api/eu || falha "Painel não subiu. Veja: journalctl -u core-os-painel -n 50"
ok "serviço core-os-painel ativo (volta sozinho se o servidor reiniciar)"

passo "8/8 · Acesso pela internet (Caddy) e firewall"
mkdir -p "$BASE/caddy"
if [ -n "$DOMINIO" ]; then
  cat >"$BASE/caddy/Caddyfile" <<CADDY
$DOMINIO {
  reverse_proxy 127.0.0.1:3000
}
n8n.$DOMINIO {
  reverse_proxy 127.0.0.1:5679
}
CADDY
else
  cat >"$BASE/caddy/Caddyfile" <<CADDY
:80 {
  reverse_proxy 127.0.0.1:3000
}
:5678 {
  reverse_proxy 127.0.0.1:5679
}
CADDY
fi
docker rm -f core-os-caddy >/dev/null 2>&1 || true
docker run -d --name core-os-caddy --restart unless-stopped --network host \
  -v "$BASE/caddy/Caddyfile:/etc/caddy/Caddyfile:ro" -v core-os-caddy-data:/data caddy:2.10-alpine >/dev/null
# Não apaga regra que já existe (VPS reaproveitada): só acrescenta. A porta do SSH é lida do sshd.
SSH_PORTA=$(ss -tlnpH 2>/dev/null | awk '/sshd/ {sub(/.*:/,"",$4); print $4; exit}'); SSH_PORTA=${SSH_PORTA:-22}
ufw allow "$SSH_PORTA"/tcp >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
ufw default deny incoming >/dev/null; ufw default allow outgoing >/dev/null
[ -z "$DOMINIO" ] && ufw allow 5678/tcp >/dev/null
ufw allow from 172.16.0.0/12 to any port 3000 proto tcp >/dev/null   # o n8n (Docker) fala com o painel
ufw --force enable >/dev/null
ok "portas abertas: $SSH_PORTA (SSH), 80/443 (painel)$( [ -z "$DOMINIO" ] && echo ', 5678 (n8n)')"

printf '\n\033[1;32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m\n'
printf '\033[1m  Core OS instalado.\033[0m\n\n'
printf '  Painel:  %s\n  Senha:   %s\n  n8n:     %s  (crie sua conta no primeiro acesso)\n  Cérebro: %s\n' "$URL_PAINEL" "$(pega CORE_OS_PASSWORD)" "$URL_N8N" "$CEREBRO"
printf '\n  Senhas guardadas em %s\n' "$ENV_FILE"
printf '\033[1;32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m\n'

ESTADO=$(evo http://127.0.0.1:8080/instance/connectionState/cerebro | jq -r '.instance.state // .state // empty')
if [ "$ESTADO" != "open" ]; then
  printf '\n  Último passo: conectar o WhatsApp.\n  No celular: WhatsApp > Aparelhos conectados > Conectar aparelho, e leia o QR abaixo.\n\n'
  CODE=$(evo http://127.0.0.1:8080/instance/connect/cerebro | jq -r '.code // empty')
  [ -n "$CODE" ] && qrencode -t ANSIUTF8 "$CODE" || aviso "Não consegui gerar o QR agora. Rode: sudo bash $AQUI/whatsapp-qr.sh"
else
  ok "WhatsApp já conectado"
fi
