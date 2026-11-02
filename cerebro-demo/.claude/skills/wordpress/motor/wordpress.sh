#!/usr/bin/env bash
# WordPress do cérebro: publica pelo painel do Core OS (a senha do site fica só no painel, nunca aqui).
# Uso:
#   wordpress.sh status                                  site conectado e usuário
#   wordpress.sh publicar <arquivo.md> [status] [data]   status: draft (padrão) | publish | future | pending | private
#   wordpress.sh atualizar <id> <arquivo.md> [status]    reescreve um post que já existe
#   wordpress.sh posts [N] [busca]                       últimos N posts (padrão 10)
#   wordpress.sh categorias                              categorias do site
#   wordpress.sh json '<objeto JSON>'                    pedido completo (titulo, conteudo, categorias, tags, imagem, resumo, slug, data, id)
set -euo pipefail
: "${CORE_OS_PAINEL:?Rode isto numa conversa aberta pelo painel do Core OS (falta CORE_OS_PAINEL).}" "${CORE_OS_AGENTE_TOKEN:?falta CORE_OS_AGENTE_TOKEN}"
cmd=${1:-}; shift || true

chamar(){ # acao json
  local r
  r=$(curl -sS --max-time 600 -X POST "$CORE_OS_PAINEL/api/ponte/wordpress/$1" -H "x-core-os-token: $CORE_OS_AGENTE_TOKEN" \
    -H "Content-Type: application/json" --data-binary "$2" -w '\n%{http_code}')
  local codigo=${r##*$'\n'} corpo=${r%$'\n'*}
  if [ "$codigo" != 200 ]; then echo "Erro: $(jq -r '.erro // .' <<<"$corpo" 2>/dev/null || echo "$corpo")" >&2; exit 1; fi
  printf '%s\n' "$corpo"
}
resultado(){ jq -r '"\(.status | if .=="publish" then "Publicado" elif .=="future" then "Agendado" elif .=="draft" then "Rascunho salvo" else . end) · id \(.id) · \(.titulo)\nVer: \(.link)\nEditar: \(.editar)\(if .imagensEnviadas > 0 then "\nImagens enviadas: \(.imagensEnviadas)" else "" end)"'; }
# o painel resolve o caminho a partir da raiz do cérebro
rel(){ local f=$1; [[ $f == /* ]] && f=$(realpath --relative-to="${CLAUDE_PROJECT_DIR:-$PWD}" "$f"); printf '%s' "$f"; }

case "$cmd" in
  status) chamar status '{}' | jq -r 'if .configurado then "Conectado: \(.url) (usuário \(.usuario))" else "WordPress não conectado. O dono conecta em Configurações › WordPress no painel." end';;
  publicar)
    chamar publicar "$(jq -nc --arg a "$(rel "${1:?diga o arquivo .md}")" --arg s "${2:-}" --arg d "${3:-}" '{arquivo:$a} + (if $s != "" then {status:$s} else {} end) + (if $d != "" then {data:$d} else {} end)')" | resultado;;
  atualizar)
    chamar publicar "$(jq -nc --argjson id "${1:?diga o id}" --arg a "$(rel "${2:?diga o arquivo .md}")" --arg s "${3:-}" '{id:$id, arquivo:$a} + (if $s != "" then {status:$s} else {} end)')" | resultado;;
  posts)
    chamar posts "$(jq -nc --argjson n "${1:-10}" --arg b "${2:-}" '{quantidade:$n} + (if $b != "" then {busca:$b} else {} end)')" \
      | jq -r '.[] | "\(.id) | \(.status) | \(.data[0:16] | sub("T"; " ")) | \(.titulo) | \(.link)"';;
  categorias) chamar categorias '{}' | jq -r '.[] | "\(.nome) (\(.posts) posts)"';;
  json) chamar publicar "${1:?passe o JSON}" | resultado;;
  *) sed -n '2,9p' "$0"; exit 1;;
esac
