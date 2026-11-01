# Core OS

Segundo cérebro rodando numa VPS: arquivos .md no padrão do segundo cérebro v3, painel web com senha (árvore, canvas com o terminal do Claude Code, subagentes e mídias, conversas em sanfona com a nota de status), n8n, Evolution API e o fluxo WhatsApp → n8n → Claude Code.

## Pastas
| Pasta | O que é |
|---|---|
| `painel/` | Servidor Node (express + ws + node-pty) e a interface em `public/` (sem build) |
| `cerebro-demo/` | O cérebro que o instalador copia: regras, 5 skills limpas e 4 exemplos prontos |
| `skill/` | A skill `core-os`: `SKILL.md`, `instalar.sh`, `whatsapp-qr.sh`, `stack/` (compose + fluxo do n8n) |
| `dokploy/` | Instalação como app Compose no Dokploy: `docker-compose.yml`, `Dockerfile.painel`, `entrypoint.sh`, `gerar-env.sh`, `configurar.sh`, `.env.example` |
| `montar-pacote.sh` | Gera `dist/core-os.tar.gz` (skill + painel + cérebro) |
| `.teste/` | Cérebro e dados de teste local (não vai no pacote) |

## Rodar o painel local (teste)
```bash
cd painel && npm install
CORE_OS_ENV=/nao-existe CORE_OS_VAULT=../.teste/cerebro CORE_OS_DATA=../.teste/dados CORE_OS_PASSWORD=teste123 CORE_OS_PORT=3917 node server.js
```

## Instalar numa VPS
Abra o Claude Code na VPS e cole:

> Clona o repositório https://github.com/TorresHostLabs/core-os em /root/core-os, lê o /root/core-os/skill/SKILL.md e instala o Core OS neste servidor seguindo ele.

Ou à mão: `git clone https://github.com/TorresHostLabs/core-os /root/core-os && cd /root/core-os/skill && sudo bash instalar.sh --nome "Seu Nome"`.

## Instalar no Dokploy
Alternativa ao `instalar.sh` para quem já tem o [Dokploy](https://dokploy.com) no servidor. O Dokploy já usa as portas 80/443 (Traefik) e 3000, então aqui tudo roda em containers (painel, n8n, Evolution, Postgres, Redis), sem Caddy, sem ufw e sem systemd. O motor padrão é o Codex (OpenAI). Os arquivos ficam em `dokploy/`.

1. No Dokploy: **Create Service > Compose**, provider **GitHub**, repositório `TorresHostLabs/core-os`, branch `main`, **Compose Path** `./dokploy/docker-compose.yml`.
2. Gere o `.env` (não grava nada no repositório) e cole em **Environment**:
   ```bash
   ./dokploy/gerar-env.sh --nome "Seu Nome" --ip IP_DO_SERVIDOR
   # ou, com domínio: ./dokploy/gerar-env.sh --nome "Seu Nome" --dominio cerebro.seudominio.com
   ```
   Para o Codex usar chave da API, preencha `OPENAI_API_KEY` (ou faça `codex login --device-auth` depois). Todas as variáveis estão em `dokploy/.env.example`. A senha do painel tem no mínimo 8 caracteres e não pode ter espaço, aspas, `$`, crase nem barra invertida.
3. Clique em **Deploy** (o primeiro build baixa o Codex e demora).
4. Se o painel reclamar de permissão na pasta do cérebro (a pasta do host é criada pelo Dokploy como root), corrija uma vez e faça Deploy de novo:
   ```bash
   docker run --rm -v /etc/dokploy/compose/NOME-DO-APP/files/cerebro:/d alpine chown 1000:1000 /d
   ```
5. No servidor, num clone do repositório e com um usuário do grupo docker (sem sudo), rode uma vez:
   ```bash
   git clone https://github.com/TorresHostLabs/core-os && cd core-os
   ./dokploy/configurar.sh --url http://IP_DO_SERVIDOR:3100
   ```
   Ele importa e ativa o fluxo no n8n e cria a instância "cerebro" na Evolution com o webhook. Se houver mais de um app Compose rodando, passe `--projeto NOME`.
6. Abra o painel, vá em **Configurações > WhatsApp** e leia o QR (WhatsApp > Aparelhos conectados). Abra o n8n e crie a sua conta no primeiro acesso.

Portas do host: `CORE_OS_PAINEL_PORTA` (3100) e `N8N_PORTA` (5678). Com domínio, remova as `ports` do compose e use **Domains** do Dokploy (painel na porta 3000, n8n na porta 5678).

O cérebro fica em `CORE_OS_CEREBRO` (padrão `../../files/cerebro`, a pasta persistente do Dokploy) e só é criado se ainda não existir. **Para atualizar:** Deploy de novo no Dokploy; cérebro, conversas e WhatsApp são mantidos.

**Limitação conhecida:** dentro do Docker o sandbox do Codex (bubblewrap) não consegue criar namespaces. Por isso, nas conversas pelo terminal do painel, o Codex pede aprovação a cada comando. O `--sandbox` padrão do `motores.js` não foi alterado. O motor "OpenAI (API)" não tem esse problema.

## Como funciona
- Cada conversa do painel é um `claude --session-id <id>` real num terminal (node-pty), na pasta do cérebro, com prompt de sistema apontando a nota `sessoes/<id>.md`.
- O painel lê o registro do Claude Code (`~/.claude/projects/<pasta>/<id>.jsonl` e `<id>/subagents/*.meta.json`) pra mostrar a última ação e os subagentes.
- Motor **OpenAI (API)** (`painel/openai.js`): agente próprio que chama a API da OpenAI (Chat Completions) em ciclo de ferramentas (listar, ler, buscar, escrever, editar), todas presas à pasta do cérebro; `.git`, `.claude/hooks` e `.env` não são graváveis. Sem terminal: a conversa é um chat no painel; também serve WhatsApp e agendamentos. Chave por `OPENAI_API_KEY` no `.env` ou pela tela (Configurações › OpenAI), testada antes de guardar. Modelo escolhido por você (lista da sua conta), limites de passos, de saída e diário de tokens, e contagem de uso. Comando de shell vem **desligado**; ligar dá ao agente o mesmo poder do painel. `OPENAI_BASE_URL` aponta pra outro endpoint compatível.
- Agendamentos (dock › relógio): tarefas com horário (todo dia, dias da semana ou a cada N tempo, fuso de Brasília) rodam sozinhas com `claude -p`, uma por vez, e viram conversas `Agendado · nome` no painel; opcionalmente o resultado vai pro WhatsApp. Ficam em `dados/agendamentos.json`. Execução atrasada em mais de 2h (painel fora do ar) é pulada.
- Backup (dock › disco): `.tar.gz` da pasta do cérebro (sem `node_modules` e `.trash`). "Baixar agora" gera em streaming direto pro seu computador; "Criar backup no servidor" e o automático diário guardam em `dados/backups/` e mantêm só os N mais recentes. Restaurar é manual (`tar -xzf`).
- Arquivo de mídia novo em `conteudo/` vira card da conversa que estava ativa.
- WhatsApp: Evolution (webhook) → n8n (só conversas individuais) → painel confere quem pode dar ordens (`dados/whatsapp-acesso.json`) → `POST /api/ponte/whatsapp` com token → `claude -p` → resposta pela Evolution.
- Senhas em `/opt/core-os/.env` (600/640). Painel e n8n atrás do Caddy; HTTPS automático com domínio.

## Pegadinhas
- Painel aberto a partir de outra sessão do Claude Code: as variáveis `CLAUDE_CODE_*` herdadas fazem o filho não gravar histórico. O `envLimpo()` do server.js remove.
- Portal do Maestri em segundo plano congela animação e o desenho do xterm (só no teste; navegador normal funciona).

## Privacidade
Sem telemetria: o painel não envia nada a terceiros; n8n (diagnósticos, avisos de versão, templates), Evolution (`TELEMETRY_ENABLED`) e o Claude Code aberto pelo painel (`DISABLE_TELEMETRY`, `DISABLE_ERROR_REPORTING`) sobem com isso desligado, e o instalador descobre o IP localmente. As únicas conexões externas são as que você usa de propósito: Anthropic/OpenAI/Google (os motores), WhatsApp (Evolution), e os downloads do instalador (Docker, NodeSource, claude.ai).

## Créditos
Adaptado por [TorresHostLabs](https://github.com/TorresHostLabs) a partir do projeto original **Core OS**, de Felipe Tâmbara ([felipefernandees/core-os](https://github.com/felipefernandees/core-os)). Licença do original: própria (Felipe Tâmbara). Dependências: MIT (express, ws, xterm, node-pty prebuilt, marked).
