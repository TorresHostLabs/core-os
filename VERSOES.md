# Versões do Core OS

Cada versão tem um **codinome**: o nome de um personagem da **DC** ou de **Star Wars**, sem repetir.
A tag continua sendo o número (`v0.0.1`); o codinome vai no título da release e numa etiqueta da imagem Docker.

## Como lançar uma versão
1. Registre a versão (pega o próximo codinome do banco e marca como usado):
   ```bash
   ./versao.sh registrar v0.0.2 "O que mudou nesta versão"
   ```
   Faça o merge dessa mudança na `main`.
2. Crie a release a partir da `main`: GitHub › Releases › *Draft a new release*, tag `v0.0.2`.

Esqueceu o passo 1? O build usa o próximo codinome livre do banco (que ainda não está na tabela de versões nem no título de outra release), renomeia a release pra `vX.Y.Z · Codinome` e avisa no resumo do run pra registrar aqui depois.

O build falha sem publicar nada se: o universo não for `DC` ou `Star Wars`, um codinome se repetir na tabela de versões ou no banco, ou o banco acabar.

Outros comandos: `./versao.sh proximo` (mostra o próximo codinome) e `./versao.sh banco` (o banco com o que já foi usado).

## Versões

| Versão | Codinome | Universo | O que mudou |
|---|---|---|---|
| v0.0.1 | Lois Lane | DC | Integração com WordPress: notas do cérebro viram posts no seu site |

## Banco de codinomes

A fila dos próximos nomes, na ordem. Pra trocar a ordem ou acrescentar nomes, é só editar a tabela (sem repetir). "Usado em" é preenchido pelo `./versao.sh registrar`.

| Ordem | Codinome | Universo | Usado em |
|---|---|---|---|
| 1 | Obi-Wan Kenobi | Star Wars | |
| 2 | Barbara Gordon | DC | |
| 3 | Ahsoka Tano | Star Wars | |
| 4 | Lucius Fox | DC | |
| 5 | R2-D2 | Star Wars | |
| 6 | Zatanna | DC | |
| 7 | Leia Organa | Star Wars | |
| 8 | Alfred Pennyworth | DC | |
| 9 | Yoda | Star Wars | |
| 10 | Diana Prince | DC | |
| 11 | Chewbacca | Star Wars | |
| 12 | Barry Allen | DC | |
| 13 | Padmé Amidala | Star Wars | |
| 14 | John Constantine | DC | |
| 15 | Din Djarin | Star Wars | |
| 16 | Selina Kyle | DC | |
| 17 | Han Solo | Star Wars | |
| 18 | Victor Stone | DC | |
| 19 | Lando Calrissian | Star Wars | |
| 20 | Arthur Curry | DC | |
