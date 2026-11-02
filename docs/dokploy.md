# Core OS no Dokploy (imagem pronta do GitHub Actions)

O servidor **não compila nada**: o GitHub Actions constrói a imagem do painel e a publica no GHCR; o Dokploy só puxa a imagem pronta.

Imagem: `ghcr.io/torreshostlabs/core-os` (tags `v1.2.3`, `1.2.3` e `latest`, que aponta para a última versão estável).

## Quando a imagem é construída
A imagem **só é criada ao publicar uma versão**: uma tag `vMAJOR.MINOR.PATCH` (ex.: `v1.0.0`; sufixos como `v1.1.0-rc1` valem e **não** movem o `latest`). Nenhum push na `main` e nenhum disparo manual cria imagem. Workflow: `.github/workflows/imagem.yml`.

**Cada versão tem um codinome**, um personagem da DC ou de Star Wars, **já reservado pra ela** em [`VERSOES.md`](../VERSOES.md): as **versões especiais** (`vX.Y.0`, como `v0.5.0` e `v1.0.0`) levam um **protagonista**; as de correção, um coadjuvante. `./versao.sh qual v1.0.0` diz quem recebe cada versão e `./versao.sh previsao` lista as próximas. Antes da tag, rode `./versao.sh registrar v1.0.0 "o que mudou"` e faça o merge na `main`; se esquecer, o build usa o nome reservado e avisa no resumo do run. Versão sem nome reservado, reserva inconsistente ou universo diferente de `DC`/`Star Wars` fazem o build falhar sem publicar nada. O build renomeia a release pra `v1.0.0 · Codinome` e põe o codinome na etiqueta `io.coreos.codinome` da imagem.

Para lançar uma versão, de uma das duas formas:
```bash
git tag v1.0.0 && git push origin v1.0.0
```
ou no GitHub: **Releases › Draft a new release**, criando a tag `v1.0.0` (acompanhe o build na aba **Actions**).

Antes de publicar, o workflow sobe o container e confere que o painel responde, que o login funciona e que o Codex CLI está presente. As camadas que não mudaram vêm do cache.

## Passo a passo
1. **Publicar a primeira versão** (veja acima, ex.: `v1.0.0`) para a imagem existir no GHCR. Sem uma tag, não há imagem.
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
4. **Atualizar**: *Redeploy* no Dokploy. Só as camadas que mudaram são baixadas (uma mudança de código costuma ser alguns MB). Para travar numa versão, use uma tag fixa (`v1.0.0` ou `1.0.0`) em vez de `latest`.

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
