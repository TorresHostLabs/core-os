# Versões do Core OS

Cada versão tem um **codinome**: o nome de um personagem da **DC** ou de **Star Wars**, sem repetir.
A tag continua sendo o número (`v0.0.1`); o codinome vai no título da release e numa etiqueta da imagem Docker.

**Pra lançar uma versão:**
1. Acrescente uma linha na tabela abaixo (versão, codinome, universo e o que mudou) e faça o merge na `main`.
2. Crie a tag a partir da `main`: GitHub › Releases › *Draft a new release*, tag `vX.Y.Z`, título `vX.Y.Z · Codinome`.

O workflow da imagem confere a tabela antes de construir: tag sem linha aqui, universo diferente de `DC` ou `Star Wars`, ou codinome repetido fazem o build falhar, e nada é publicado.

| Versão | Codinome | Universo | O que mudou |
|---|---|---|---|
| v0.0.1 | Lois Lane | DC | Integração com WordPress: notas do cérebro viram posts no seu site |
