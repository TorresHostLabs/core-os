---
name: wordpress
description: Publica no WordPress do dono pelo painel do Core OS. Transforma uma nota .md do cérebro em post (rascunho, publicado ou agendado), sobe as imagens e a imagem destacada, cria categorias e tags, atualiza post que já existe e lista os últimos posts. Use sempre que o pedido envolver blog, site, WordPress, "posta no blog", "publica esse artigo", "agenda o post pra sexta".
---

# WordPress (publicação pelo painel)

A conexão com o site é feita uma vez pelo dono em **Configurações › WordPress** no painel (endereço do site, usuário e senha de aplicativo). A senha fica só no painel: este script fala com o painel, nunca com o site direto, e você nunca precisa nem deve pedir a senha.

## Comandos
```bash
WP="bash .claude/skills/wordpress/motor/wordpress.sh"
$WP status                                          # está conectado? em qual site?
$WP publicar conteudo/blog/2026-11-05-ia/post.md    # cria como RASCUNHO (padrão)
$WP publicar conteudo/blog/.../post.md publish      # publica na hora
$WP publicar conteudo/blog/.../post.md future "2026-11-07 09:00"   # agenda (horário do site)
$WP atualizar 123 conteudo/blog/.../post.md         # reescreve o post 123
$WP posts 10                                        # últimos 10: id | status | data | título | link
$WP categorias                                      # categorias do site
```

## Como montar o post
Escreva o artigo em `conteudo/blog/AAAA-MM-DD-slug/post.md`, com as imagens na mesma pasta:
```markdown
---
titulo: 5 tarefas que a IA faz por mim todo dia
categorias: [Produtividade, IA]
tags: [automação, claude]
resumo: O que eu deleguei pra IA e quanto tempo isso me devolve por semana.
imagem: capa.jpg
slug: tarefas-ia-todo-dia
---

Texto em markdown. ![Print do painel](print-painel.png)
```
- Sem `titulo` no frontmatter, o primeiro `# Título` vira o título (e sai do corpo).
- Imagens locais (`![](arquivo.png)`, `![[arquivo.png]]`) e a `imagem` (destacada) sobem sozinhas pra biblioteca de mídia. Caminho relativo à pasta do post ou à raiz do cérebro.
- Categorias e tags são por nome: as que não existem são criadas.
- Também aceita `status` e `data` no frontmatter. Arquivo `.html` vai como HTML puro.

## Regras
- **Padrão é rascunho.** Só use `publish` (ou `future`) quando o dono pediu explicitamente pra publicar ou agendar. Na dúvida, salve como rascunho e mande o link de edição.
- No fim, diga ao dono em uma linha o status, o link do post e o link de edição. Guarde o `id` no `pedido.md` da pasta (pra atualizar depois).
- Escreva na voz do dono (`memoria/estilo-de-conteudo.md`). Nunca invente dados, números ou citações.
- Erro "não conectado": peça pro dono conectar em Configurações › WordPress. Erro 401/403: a senha de aplicativo foi revogada ou o usuário não tem permissão; ele refaz a conexão no painel.
- No Codex, o comando acessa a rede local do servidor: aprove quando ele pedir.
