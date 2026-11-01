---
name: core-os
description: >-
  Instala o Core OS numa VPS: segundo cérebro em arquivos .md, painel web com senha (árvore de arquivos, canvas e conversas reais do Claude Code), n8n, Evolution API e o fluxo WhatsApp → n8n → Claude Code. Use quando a pessoa disser "instala o Core OS", "monta meu segundo cérebro nesse servidor", "roda o instalador" ou colar o prompt de instalação.
---

# Core OS · instalação guiada

Você está dentro do Claude Code de uma VPS (Ubuntu ou Debian). Seu trabalho é instalar o Core OS do começo ao fim, falando simples, como quem ajuda alguém que nunca mexeu com servidor.

## 1. Perguntar só o necessário (uma mensagem, 3 perguntas)
1. **Seu nome** (vai na constituição do cérebro).
2. **Tem um domínio pra usar?** (ex.: cerebro.seusite.com). Se não tiver, tudo funciona pelo IP. Se tiver, avise: antes de seguir, crie no DNS dois registros A apontando pro IP desta VPS: `cerebro.seusite.com` e `n8n.cerebro.seusite.com`.
3. **Quer escolher a senha do painel?** (mínimo 8 caracteres, sem espaço, aspas, `$`, crase nem barra invertida). Se não quiser, o instalador gera uma forte.

E pergunte se quer os **4 exemplos prontos** (WhatsApp, carrossel, thumbnail, edição de vídeo). Padrão: sim.

## 2. Conferir o Claude Code
Rode `claude --version`. O painel e o WhatsApp usam a assinatura que está logada aqui, então o login tem que estar feito (se você está rodando, está).

## 3. Rodar o instalador
Se você chegou aqui pelo prompt de instalação, o repositório já está em `/root/core-os` (senão: `git clone https://github.com/TorresHostLabs/core-os /root/core-os`). Rode na pasta `skill/`:
```bash
cd /root/core-os/skill && sudo bash instalar.sh --nome "NOME" [--dominio cerebro.seusite.com] [--senha "SENHA"] [--sem-exemplos]
```
Demora de 3 a 6 minutos. Ele mostra 8 passos. Se falhar, leia a mensagem: ela diz o comando de log certo. Conserte e rode de novo, ele continua de onde parou e não apaga nada.

## 4. Entregar
Quando terminar, mostre pra pessoa, nesta ordem:
1. O endereço do painel e a senha (estão no fim da saída e em `/opt/core-os/.env`).
2. O QR do WhatsApp: ela abre WhatsApp > Aparelhos conectados > Conectar aparelho e lê. Se o QR expirar, rode `sudo bash whatsapp-qr.sh`.
3. O endereço do n8n: no primeiro acesso ela cria a conta de dono do n8n. O fluxo "Core OS · WhatsApp → Claude Code" já está lá, ativo.
4. Um teste: no chat "Você" do número conectado, mandar "oi, o que tem no meu cérebro?". Depois, se ela usa outro número pra falar com o cérebro, autorizar esse número no painel.

## Regras
- Nunca mostrar a senha em print ou vídeo sem avisar a pessoa.
- Nunca abrir outras portas além das que o instalador abre.
- Nunca usar o travessão (traço longo) nas respostas.

## WhatsApp: como explicar pra pessoa
- O número que ela conectar no QR é o número do cérebro. Pode ser o WhatsApp normal ou o Business.
- Quem dá ordens: o chat **"Você"** (a conversa do número consigo mesmo) e os números que ela autorizar no painel, em Configurações > WhatsApp > Quem pode dar ordens. Caso comum: o número da empresa fica conectado e ela manda mensagem do pessoal, que entra na lista.
- Grupos e números fora da lista são ignorados. Trocar o número conectado ou a lista não exige mexer no n8n.
- `/nova` (ou `/clear`) começa uma conversa nova. Depois de 6 horas parada, a próxima mensagem já começa outra.
- Toda conversa do WhatsApp aparece no painel, na lista da direita, com o selo verde.
