# Versões do Core OS

Cada versão tem um **codinome**: o nome de um personagem da **DC** ou de **Star Wars**, sem repetir, e **cada nome já tem a sua versão reservada** nos bancos abaixo. Você sabe hoje qual personagem cada release vai receber.

- **Versões especiais** (as que terminam em `.0`: `v0.1.0`, `v0.5.0`, `v1.0.0`…) levam um **protagonista**, do banco de protagonistas.
- **Versões de correção** (`v0.0.3`, `v0.1.2`…) levam um **coadjuvante**, do banco de codinomes.

A tag continua sendo o número (`v0.1.0`); o codinome vai no título da release e numa etiqueta da imagem Docker.

## Como lançar uma versão
1. Registre a versão (usa o nome reservado pra ela):
   ```bash
   ./versao.sh registrar v0.0.3 "O que mudou nesta versão"
   ```
   `v1.0` e `v0.5` também valem e viram `v1.0.0` e `v0.5.0` (a tag precisa ter os três números, senão o build não roda). Faça o merge dessa mudança na `main`.
2. Crie a release a partir da `main`: GitHub › Releases › *Draft a new release*, tag `v0.0.3`. O título pode ficar só com o número: o build renomeia pra `v0.0.3 · Codinome`.

Esqueceu o passo 1? O build usa o nome reservado pra versão do mesmo jeito e avisa no resumo do run pra registrar aqui depois.

**Trocar uma reserva:** é só editar a coluna "Versão" nos bancos (ex.: pôr a `v1.0.0` no Darth Vader e a `v0.7.0` no Hal Jordan). Versão sem nome reservado (ex.: uma `v0.1.5`) faz o build falhar até você reservar um nome pra ela.

O build falha sem publicar nada se: o universo não for `DC` ou `Star Wars`; um nome ou uma versão se repetir; uma versão especial estiver reservada pra um coadjuvante (ou uma de correção pra um protagonista); a versão registrada na tabela tiver um nome diferente do reservado; ou a versão não tiver nome reservado.

Outros comandos: `./versao.sh qual v1.0.0` (quem recebe essa versão), `./versao.sh previsao` (as próximas versões e os nomes, na ordem) e `./versao.sh banco` (os dois bancos, com o que já foi lançado).

## Versões

| Versão | Codinome | Universo | O que mudou |
|---|---|---|---|
| v0.0.1 | Lois Lane | DC | Integração com WordPress: notas do cérebro viram posts no seu site |
| v0.0.2 | Obi-Wan Kenobi | Star Wars | Banco de codinomes (40 personagens), versao.sh e release renomeada com o codinome pelo build |

## Banco de protagonistas

Versões especiais (`vX.Y.0`). A coluna "Versão" é a reserva.

| Ordem | Codinome | Universo | Versão |
|---|---|---|---|
| P1 | Luke Skywalker | Star Wars | v0.1.0 |
| P2 | Clark Kent | DC | v0.2.0 |
| P3 | Leia Organa | Star Wars | v0.3.0 |
| P4 | Bruce Wayne | DC | v0.4.0 |
| P5 | Han Solo | Star Wars | v0.5.0 |
| P6 | Diana Prince | DC | v0.6.0 |
| P7 | Darth Vader | Star Wars | v0.7.0 |
| P8 | Barry Allen | DC | v0.8.0 |
| P9 | Rey | Star Wars | v0.9.0 |
| P10 | Hal Jordan | DC | v1.0.0 |
| P11 | Finn | Star Wars | v1.1.0 |
| P12 | Arthur Curry | DC | v1.2.0 |
| P13 | Kara Zor-El | DC | v1.3.0 |
| P14 | Ahsoka Tano | Star Wars | v1.4.0 |
| P15 | Oliver Queen | DC | v1.5.0 |
| P16 | Cassian Andor | Star Wars | v1.6.0 |
| P17 | Billy Batson | DC | v1.7.0 |
| P18 | Jyn Erso | Star Wars | v1.8.0 |
| P19 | J'onn J'onzz | DC | v1.9.0 |
| P20 | Anakin Skywalker | Star Wars | v2.0.0 |
| P21 | R2-D2 | Star Wars | v2.1.0 |
| P22 | Chewbacca | Star Wars | v2.2.0 |
| P23 | Yoda | Star Wars | v2.3.0 |

## Banco de codinomes

Versões de correção, só coadjuvantes. A coluna "Versão" é a reserva: 3 correções pra fechar a `v0.0.x` e depois 4 por versão especial (`v0.1.1` a `v0.1.4`, `v0.2.1` a `v0.2.4`…).

| Ordem | Codinome | Universo | Versão |
|---|---|---|---|
| 1 | Obi-Wan Kenobi | Star Wars | v0.0.2 |
| 2 | Barbara Gordon | DC | v0.0.3 |
| 3 | Lucius Fox | DC | v0.0.4 |
| 4 | Wicket | Star Wars | v0.0.5 |
| 5 | Zatanna | DC | v0.1.1 |
| 6 | Alfred Pennyworth | DC | v0.1.2 |
| 7 | Bodhi Rook | Star Wars | v0.1.3 |
| 8 | Nien Nunb | Star Wars | v0.1.4 |
| 9 | Padmé Amidala | Star Wars | v0.2.1 |
| 10 | John Constantine | DC | v0.2.2 |
| 11 | Selina Kyle | DC | v0.2.3 |
| 12 | Victor Stone | DC | v0.2.4 |
| 13 | Lando Calrissian | Star Wars | v0.3.1 |
| 14 | Mace Windu | Star Wars | v0.3.2 |
| 15 | Qui-Gon Jinn | Star Wars | v0.3.3 |
| 16 | Dick Grayson | DC | v0.3.4 |
| 17 | Grogu | Star Wars | v0.4.1 |
| 18 | Dinah Lance | DC | v0.4.2 |
| 19 | Bo-Katan Kryze | Star Wars | v0.4.3 |
| 20 | Wedge Antilles | Star Wars | v0.4.4 |
| 21 | Poe Dameron | Star Wars | v0.5.1 |
| 22 | Raven | DC | v0.5.2 |
| 23 | C-3PO | Star Wars | v0.5.3 |
| 24 | James Gordon | DC | v0.5.4 |
| 25 | BB-8 | Star Wars | v0.6.1 |
| 26 | Jimmy Olsen | DC | v0.6.2 |
| 27 | Hera Syndulla | Star Wars | v0.6.3 |
| 28 | Perry White | DC | v0.6.4 |
| 29 | Sabine Wren | Star Wars | v0.7.1 |
| 30 | Martha Kent | DC | v0.7.2 |
| 31 | Rose Tico | Star Wars | v0.7.3 |
| 32 | Iris West | DC | v0.7.4 |
| 33 | Maz Kanata | Star Wars | v0.8.1 |
| 34 | Cisco Ramon | DC | v0.8.2 |
| 35 | K-2SO | Star Wars | v0.8.3 |
| 36 | Mera | DC | v0.8.4 |
| 37 | Ackbar | Star Wars | v0.9.1 |
| 38 | Etta Candy | DC | v0.9.2 |
| 39 | Steve Trevor | DC | v0.9.3 |
| 40 | Renee Montoya | DC | v0.9.4 |
| 41 | Din Djarin | Star Wars | v1.0.1 |
