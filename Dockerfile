# syntax=docker/dockerfile:1
# Core OS · imagem do painel. Construída pelo GitHub Actions (.github/workflows/imagem.yml) e publicada no GHCR:
# o servidor (Dokploy) só puxa a imagem pronta, sem compilar nada.
#
# Contrato com o compose do Dokploy (valores padrão, todos sobrescrevíveis por variável de ambiente):
#   usuário node (uid 1000) · porta 3000 · cérebro em /home/node/cerebro · dados em /home/node/dados · Codex em /home/node/.codex
#   Evolution em http://evolution:8080, instância "cerebro"

# 1) dependências do painel (imagem completa: tem as ferramentas de compilação se o node-pty precisar)
FROM node:22-bookworm AS deps
WORKDIR /app/painel
COPY painel/package.json painel/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# 2) imagem final, enxuta
FROM node:22-bookworm-slim
ARG INSTALAR_CODEX=1
ARG CODEX_VERSION=0.166.0
# bash/curl/jq/git/python3/ffmpeg: o que as skills do cérebro usam (WhatsApp, vídeo); tar: backup do cérebro
RUN apt-get update \
 && apt-get install -y --no-install-recommends bash curl ca-certificates jq git ffmpeg python3 tar procps \
 && rm -rf /var/lib/apt/lists/*
# Codex CLI (OpenAI): um dos motores do painel. INSTALAR_CODEX=0 deixa a imagem menor
RUN if [ "$INSTALAR_CODEX" = "1" ]; then npm install -g --no-audit --no-fund "@openai/codex@${CODEX_VERSION}" && npm cache clean --force; fi

ENV NODE_ENV=production \
    CORE_OS_HOST=0.0.0.0 \
    CORE_OS_PORT=3000 \
    CORE_OS_VAULT=/home/node/cerebro \
    CORE_OS_DATA=/home/node/dados \
    EVO_URL=http://evolution:8080 \
    EVO_INSTANCE=cerebro

WORKDIR /app/painel
COPY --from=deps /app/painel/node_modules ./node_modules
COPY painel/ ./
# cérebro de demonstração: só é copiado pra dentro do volume se a pasta do cérebro estiver vazia
COPY cerebro-demo/ /opt/cerebro-semente/
COPY docker/entrypoint.sh /usr/local/bin/core-os-entrypoint
# pastas criadas aqui, com dono node: volumes nomeados novos herdam esse dono
RUN chmod 0755 /usr/local/bin/core-os-entrypoint \
 && mkdir -p /home/node/cerebro /home/node/dados /home/node/.codex \
 && chown -R node:node /home/node /app

LABEL org.opencontainers.image.source="https://github.com/TorresHostLabs/core-os" \
      org.opencontainers.image.description="Core OS: painel do segundo cérebro (Node, sem build no servidor)"

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.CORE_OS_PORT||3000)+'/api/eu').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["core-os-entrypoint"]
CMD ["node", "server.js"]
