# Core OS no Dokploy (imagem pronta do GitHub Actions)

O servidor **não compila nada**: o GitHub Actions constrói a imagem do painel e a publica no GHCR; o Dokploy só puxa a imagem pronta.

Imagem: `ghcr.io/torreshostlabs/core-os` (tags `latest`, `sha-<commit>` e `v*`).

## Quando a imagem é construída
Workflow `.github/workflows/imagem.yml`. Para economizar minutos, ele **só roda**:
- num push na `main` que mude `painel/`, `cerebro-demo/`, `Dockerfile` ou `docker/`;
- ao criar uma tag `v*`;
- manualmente (aba **Actions** › "Imagem do painel" › **Run workflow**). Rodando numa branch, publica só a tag `sha-…`, nunca `latest`.

Antes de publicar, o workflow sobe o container e confere que o painel responde, que o login funciona e que o Codex CLI está presente. As camadas que não mudaram vêm do cache.

## Passo a passo
1. **Rodar o workflow uma vez** (ou fazer o merge na `main`) para a imagem existir.
2. **Visibilidade do pacote.** O GHCR cria o pacote como *privado*. Escolha uma opção:
   - tornar público: GitHub › seu perfil/organização › **Packages** › `core-os` › *Package settings* › *Change visibility*; ou
   - manter privado e cadastrar um registry no Dokploy (`ghcr.io`, seu usuário e um token com `read:packages`).
3. **No compose do Dokploy**, troque o serviço `painel` (o resto continua igual):

```yaml
  painel:
    image: ghcr.io/torreshostlabs/core-os:latest   # em vez de core-os-painel:local
    pull_policy: always                            # em vez de "never": baixa a versão nova a cada deploy
    restart: unless-stopped
    depends_on: [evolution, n8n]
    ports: ["3100:3000"]
    environment:
      CORE_OS_PASSWORD: ${CORE_OS_PASSWORD}
      CORE_OS_HOOK_TOKEN: ${CORE_OS_HOOK_TOKEN}
      EVO_KEY: ${EVO_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY:-}
    volumes:
      - /home/torres/cerebro:/home/node/cerebro
      - painel-dados:/home/node/dados
      - codex:/home/node/.codex
```
4. **Atualizar**: *Redeploy* no Dokploy. Só as camadas que mudaram são baixadas (uma mudança de código costuma ser alguns MB). Para travar numa versão, use uma tag fixa (`sha-abc1234` ou `v1.0.0`) em vez de `latest`.

## O que a imagem já traz (não precisa de variável)
Usuário `node` (uid 1000), porta `3000`, cérebro em `/home/node/cerebro`, dados em `/home/node/dados`, Codex em `/home/node/.codex`, `EVO_URL=http://evolution:8080`, `EVO_INSTANCE=cerebro`. Tudo pode ser sobrescrito por variável de ambiente.

## Variáveis
| Variável | Para quê |
|---|---|
| `CORE_OS_PASSWORD` | Senha do painel. **Defina**; sem ela é gerada uma aleatória e mostrada nos logs |
| `OPENAI_API_KEY` | Habilita o motor **OpenAI (API)** e já **autentica o Codex CLI** com essa chave no início do container |
| `OPENAI_MODEL` | Modelo inicial do motor OpenAI (API); também dá para escolher na tela |
| `CORE_OS_HOOK_TOKEN`, `EVO_KEY` | WhatsApp (ponte n8n e Evolution) |
| `CORE_OS_TRUST_PROXY` | Veja abaixo |

### Codex com a chave da OpenAI
A variável `OPENAI_API_KEY` **sozinha não loga o Codex** (ele guarda a credencial em `~/.codex`, que é o volume `codex`). Por isso o container roda `codex login --with-api-key` no início quando a variável existe, e regrava se você trocar a chave. Se você já logou o Codex com uma conta ChatGPT, esse login é respeitado e não é sobrescrito.

### Motor padrão
Se o motor preferido não existe no container (o Claude Code não vem na imagem), o painel usa o primeiro disponível, nesta ordem: Claude Code, Codex, OpenAI (API), Antigravity. Dá para fixar outro em Configurações › Motor de IA.

### Domínio pelo Traefik do Dokploy
Se você acessar o painel por um domínio (Traefik na frente) em vez de `IP:3100`, defina `CORE_OS_TRUST_PROXY=1` e **não publique a porta 3100 direto**. Sem isso, todo mundo chega com o IP do Traefik: 5 senhas erradas de qualquer pessoa travam o login de todos, e o cookie não sai com `Secure`. Acessando direto por `IP:3100`, deixe sem a variável.

## Permissões da pasta do cérebro
A pasta montada em `/home/node/cerebro` precisa ser gravável pelo uid **1000** (o usuário `node` do container). Se estiver vazia, o container copia o cérebro de demonstração para ela; se já tiver conteúdo, **nunca mexe**.

## Build manual (sem o Actions)
```bash
docker build -t core-os-painel:local .                       # com Codex CLI
docker build --build-arg INSTALAR_CODEX=0 -t core-os-painel:local .   # sem Codex (imagem bem menor)
```
