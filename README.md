# Core OS

Segundo cérebro rodando numa VPS: arquivos .md no padrão do segundo cérebro v3, painel web com senha (árvore, canvas com o terminal do Claude Code, subagentes e mídias, conversas em sanfona com a nota de status), n8n, Evolution API e o fluxo WhatsApp → n8n → Claude Code.

## Pastas
| Pasta | O que é |
|---|---|
| `painel/` | Servidor Node (express + ws + node-pty) e a interface em `public/` (sem build) |
| `cerebro-demo/` | O cérebro que o instalador copia: regras, 5 skills limpas e 4 exemplos prontos |
| `skill/` | A skill `core-os`: `SKILL.md`, `instalar.sh`, `whatsapp-qr.sh`, `stack/` (compose + fluxo do n8n) |
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

## Como funciona
- Cada conversa do painel é um `claude --session-id <id>` real num terminal (node-pty), na pasta do cérebro, com prompt de sistema apontando a nota `sessoes/<id>.md`.
- O painel lê o registro do Claude Code (`~/.claude/projects/<pasta>/<id>.jsonl` e `<id>/subagents/*.meta.json`) pra mostrar a última ação e os subagentes.
- Agendamentos (dock › relógio): tarefas com horário (todo dia, dias da semana ou a cada N tempo, fuso de Brasília) rodam sozinhas com `claude -p`, uma por vez, e viram conversas `Agendado · nome` no painel; opcionalmente o resultado vai pro WhatsApp. Ficam em `dados/agendamentos.json`. Execução atrasada em mais de 2h (painel fora do ar) é pulada.
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
