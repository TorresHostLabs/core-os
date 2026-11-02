# Versões do Core OS

Cada versão tem um **codinome**: o nome de um personagem da **DC** ou de **Star Wars**, sem repetir.
As **versões especiais**, as que terminam em `.0` (`v0.1.0`, `v0.5.0`, `v1.0.0`, `v1.1.0`…), levam o nome de um **protagonista**, tirado do banco de protagonistas. As de correção (`v0.0.2`, `v0.1.3`…) usam o banco de codinomes, só com coadjuvantes.
A tag continua sendo o número (`v0.0.1`); o codinome vai no título da release e numa etiqueta da imagem Docker.

## Como lançar uma versão
1. Registre a versão (pega o próximo nome do banco certo e marca como usado):
   ```bash
   ./versao.sh registrar v0.0.2 "O que mudou nesta versão"
   ```
   Pra uma versão especial, o mesmo comando: `./versao.sh registrar v0.1.0 "…"` pega o próximo protagonista. `v1.0` e `v0.5` também valem e viram `v1.0.0` e `v0.5.0` (a tag precisa ter os três números, senão o build não roda).
   Faça o merge dessa mudança na `main`.
2. Crie a release a partir da `main`: GitHub › Releases › *Draft a new release*, tag `v0.0.2`.

Esqueceu o passo 1? O build usa o próximo nome livre do banco certo (que ainda não está na tabela de versões nem no título de outra release), renomeia a release pra `vX.Y.Z · Codinome` e avisa no resumo do run pra registrar aqui depois.

O build falha sem publicar nada se: o universo não for `DC` ou `Star Wars`, um nome se repetir (na tabela, num banco ou nos dois bancos), uma versão especial na tabela não tiver nome de protagonista (ou uma de correção tiver), ou o banco acabar.

Outros comandos: `./versao.sh proximo` (o próximo nome de cada banco) e `./versao.sh banco` (os dois bancos, com o que já foi usado).

## Versões

| Versão | Codinome | Universo | O que mudou |
|---|---|---|---|
| v0.0.1 | Lois Lane | DC | Integração com WordPress: notas do cérebro viram posts no seu site |
| v0.0.2 | Obi-Wan Kenobi | Star Wars | Banco de codinomes (40 personagens), versao.sh e release renomeada com o codinome pelo build |

## Banco de protagonistas

Pras versões especiais (`vX.Y.0`), na ordem. Pra reservar um nome pra uma versão marcante (ex.: a `v1.0.0`), é só pôr ele na posição certa da fila. "Usado em" é preenchido pelo `./versao.sh registrar`.

| Ordem | Codinome | Universo | Usado em |
|---|---|---|---|
| P1 | Luke Skywalker | Star Wars | |
| P2 | Clark Kent | DC | |
| P3 | Leia Organa | Star Wars | |
| P4 | Bruce Wayne | DC | |
| P5 | Han Solo | Star Wars | |
| P6 | Diana Prince | DC | |
| P7 | Darth Vader | Star Wars | |
| P8 | Barry Allen | DC | |
| P9 | Rey | Star Wars | |
| P10 | Hal Jordan | DC | |
| P11 | Finn | Star Wars | |
| P12 | Arthur Curry | DC | |
| P13 | Din Djarin | Star Wars | |
| P14 | Kara Zor-El | DC | |
| P15 | Ahsoka Tano | Star Wars | |
| P16 | Oliver Queen | DC | |
| P17 | Cassian Andor | Star Wars | |
| P18 | Billy Batson | DC | |
| P19 | Jyn Erso | Star Wars | |
| P20 | J'onn J'onzz | DC | |
| P21 | Anakin Skywalker | Star Wars | |
| P22 | R2-D2 | Star Wars | |

## Banco de codinomes

Pras versões de correção, só coadjuvantes, na ordem. Pra trocar a ordem ou acrescentar nomes, é só editar a tabela (sem repetir, e sem nomes do banco de protagonistas). "Usado em" é preenchido pelo `./versao.sh registrar`.

| Ordem | Codinome | Universo | Usado em |
|---|---|---|---|
| 1 | Obi-Wan Kenobi | Star Wars | v0.0.2 |
| 2 | Barbara Gordon | DC |  |
| 3 | Lucius Fox | DC |  |
| 4 | Wicket | Star Wars | |
| 5 | Zatanna | DC |  |
| 6 | Alfred Pennyworth | DC |  |
| 7 | Yoda | Star Wars |  |
| 8 | Chewbacca | Star Wars |  |
| 9 | Padmé Amidala | Star Wars |  |
| 10 | John Constantine | DC |  |
| 11 | Selina Kyle | DC |  |
| 12 | Victor Stone | DC |  |
| 13 | Lando Calrissian | Star Wars |  |
| 14 | Mace Windu | Star Wars |  |
| 15 | Qui-Gon Jinn | Star Wars |  |
| 16 | Dick Grayson | DC |  |
| 17 | Grogu | Star Wars |  |
| 18 | Dinah Lance | DC |  |
| 19 | Bo-Katan Kryze | Star Wars |  |
| 20 | Wedge Antilles | Star Wars |  |
| 21 | Poe Dameron | Star Wars |  |
| 22 | Raven | DC |  |
| 23 | C-3PO | Star Wars |  |
| 24 | James Gordon | DC |  |
| 25 | BB-8 | Star Wars |  |
| 26 | Jimmy Olsen | DC |  |
| 27 | Hera Syndulla | Star Wars |  |
| 28 | Perry White | DC |  |
| 29 | Sabine Wren | Star Wars |  |
| 30 | Martha Kent | DC |  |
| 31 | Rose Tico | Star Wars |  |
| 32 | Iris West | DC |  |
| 33 | Maz Kanata | Star Wars |  |
| 34 | Cisco Ramon | DC |  |
| 35 | K-2SO | Star Wars |  |
| 36 | Mera | DC |  |
| 37 | Ackbar | Star Wars |  |
| 38 | Etta Candy | DC |  |
| 39 | Steve Trevor | DC |  |
| 40 | Renee Montoya | DC |  |
