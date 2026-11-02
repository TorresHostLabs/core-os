#!/usr/bin/env bash
# Versões do Core OS e os bancos de codinomes (personagens da DC ou de Star Wars), tudo em VERSOES.md.
# Versão especial (vX.Y.0) leva um protagonista (banco de protagonistas); as de correção, um coadjuvante (banco de codinomes).
# Uso:
#   ./versao.sh proximo [vX.Y.Z]                próximo nome de cada banco (ou só o da versão dada)
#   ./versao.sh banco                           os dois bancos, com o que já foi usado
#   ./versao.sh registrar vX.Y.Z "o que mudou"  acrescenta a versão com o próximo nome do banco certo e marca como usado
#                                               (v1.0 e v0.5 viram v1.0.0 e v0.5.0)
#   ./versao.sh codinome vX.Y.Z                 (usado pelo build) "codinome<TAB>universo<TAB>origem", origem = tabela | banco
#                                               VERSAO_USADOS (um nome por linha) soma nomes já usados fora do arquivo (ex.: títulos de releases)
set -euo pipefail
ARQ=${VERSOES_MD:-$(dirname "$0")/VERSOES.md}
[ -f "$ARQ" ] || { echo "Não achei $ARQ" >&2; exit 1; }

# linhas da tabela de versões: versão<TAB>codinome<TAB>universo
versoes(){ awk -F'|' '/^\| *v[0-9]/ { for (i = 2; i <= 4; i++) gsub(/^ +| +$/, "", $i); print $2 "\t" $3 "\t" $4 }' "$ARQ"; }
# linhas de um banco: ordem<TAB>codinome<TAB>universo<TAB>usado em. comum = "1, 2, 3…"; protagonistas = "P1, P2…"
linhas_banco(){ awk -F'|' -v re="$1" '$0 ~ re { for (i = 2; i <= 5; i++) gsub(/^ +| +$/, "", $i); print $2 "\t" $3 "\t" $4 "\t" $5 }' "$ARQ"; }
comum(){ linhas_banco '^\\| *[0-9]+ *\\|'; }
protagonistas(){ linhas_banco '^\\| *P[0-9]+ *\\|'; }
minusculas(){ tr '[:upper:]' '[:lower:]'; }
erro(){ echo "$1" >&2; exit 1; }
# v1.0.0, v0.5.0 (e v1.0.0-rc1): especial
especial(){ [[ ${1%%-*} =~ ^v[0-9]+\.[0-9]+\.0$ ]]; }
# v1.0 → v1.0.0
normalizar(){ local v=$1; [[ $v =~ ^v[0-9]+\.[0-9]+$ ]] && v="$v.0"; printf '%s' "$v"; }

validar(){
  local ruim prot
  ruim=$( { versoes | cut -f2,3; comum | cut -f2,3; protagonistas | cut -f2,3; } | awk -F'\t' '$2 != "DC" && $2 != "Star Wars" { print $1 " (" $2 ")" }')
  [ -z "$ruim" ] || erro "Universo inválido em VERSOES.md (use DC ou Star Wars): $ruim"
  ruim=$(versoes | cut -f2 | minusculas | sort | uniq -d); [ -z "$ruim" ] || erro "Codinome repetido na tabela de versões: $ruim"
  ruim=$(comum | cut -f2 | minusculas | sort | uniq -d); [ -z "$ruim" ] || erro "Codinome repetido no banco de codinomes: $ruim"
  ruim=$(protagonistas | cut -f2 | minusculas | sort | uniq -d); [ -z "$ruim" ] || erro "Codinome repetido no banco de protagonistas: $ruim"
  ruim=$(comm -12 <(comum | cut -f2 | minusculas | sort -u) <(protagonistas | cut -f2 | minusculas | sort -u)); [ -z "$ruim" ] || erro "Nome nos dois bancos (deixe só no de protagonistas): $ruim"
  [ -z "$(versoes | awk -F'\t' '$2 == ""')" ] || erro "Versão sem codinome na tabela."
  # versão especial com protagonista; versão de correção sem protagonista
  prot=$(protagonistas | cut -f2 | minusculas)
  ruim=$(versoes | awk -F'\t' -v p="$prot" 'BEGIN { n = split(p, a, "\n"); for (i = 1; i <= n; i++) eh[a[i]] = 1 }
    { esp = ($1 ~ /^v[0-9]+\.[0-9]+\.0$/); pro = (tolower($2) in eh)
      if (esp && !pro) print $1 " (" $2 ") é especial e precisa de um nome do banco de protagonistas"
      if (!esp && pro) print $1 " (" $2 ") não é especial e não pode usar um protagonista" }')
  [ -z "$ruim" ] || erro "$ruim"
}

# primeiro do banco da versão que não está na tabela nem em VERSAO_USADOS: codinome<TAB>universo
proximo(){
  local usados banco=comum nome="banco de codinomes"
  especial "$1" && { banco=protagonistas; nome="banco de protagonistas"; }
  usados=$( { versoes | cut -f2; printf '%s\n' "${VERSAO_USADOS:-}"; } | minusculas | sed '/^$/d')
  $banco | awk -F'\t' -v u="$usados" 'BEGIN { n = split(u, a, "\n"); for (i = 1; i <= n; i++) usado[a[i]] = 1 }
    !(tolower($2) in usado) { print $2 "\t" $3; achou = 1; exit } END { if (!achou) exit 1 }' \
    || erro "O $nome acabou: acrescente nomes em VERSOES.md."
}

listar(){ # banco título
  local usados; usados=$(versoes | awk -F'\t' '{ print tolower($2) "\t" $1 }')
  echo "$2"
  $1 | awk -F'\t' -v u="$usados" 'BEGIN { n = split(u, a, "\n"); for (i = 1; i <= n; i++) { split(a[i], p, "\t"); v[p[1]] = p[2] } }
    { k = tolower($2); printf "%4s  %-20s %-10s %s\n", $1, $2, $3, (k in v ? "usado em " v[k] : "livre") }'
}

cmd=${1:-}; shift || true
validar
case "$cmd" in
  proximo)
    if [ -n "${1:-}" ]; then proximo "$(normalizar "$1")" | awk -F'\t' '{ print $1 " (" $2 ")" }'
    else
      printf 'Versão de correção (ex.: v0.0.3): '; proximo v0.0.1 | awk -F'\t' '{ print $1 " (" $2 ")" }'
      printf 'Versão especial (ex.: v0.1.0):    '; proximo v0.1.0 | awk -F'\t' '{ print $1 " (" $2 ")" }'
    fi;;
  banco) listar protagonistas "Banco de protagonistas (versões vX.Y.0)"; echo; listar comum "Banco de codinomes (versões de correção)";;
  codinome)
    tag=${1:?diga a tag, ex.: v0.0.2}; base=${tag%%-*}  # v1.0.0-rc1 usa o codinome de v1.0.0
    linha=$(versoes | awk -F'\t' -v v="$base" '$1 == v')
    if [ -n "$linha" ]; then printf '%s\t%s\ttabela\n' "$(cut -f2 <<<"$linha")" "$(cut -f3 <<<"$linha")"
    else p=$(proximo "$tag") || exit 1; printf '%s\tbanco\n' "$p"; fi;;
  registrar)
    tag=$(normalizar "${1:?diga a versão, ex.: v0.0.2}"); mudou=${2:?diga o que mudou, entre aspas}
    [[ $tag =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || erro "Versão inválida: use vX.Y.Z (ex.: v0.0.2) ou vX.Y (ex.: v1.0)."
    [ -z "$(versoes | awk -F'\t' -v v="$tag" '$1 == v')" ] || erro "$tag já está registrada."
    [[ $mudou != *"|"* ]] || erro "Não use | no texto."
    p=$(proximo "$tag") || exit 1; IFS=$'\t' read -r nome universo <<<"$p"
    tmp=$(mktemp)
    # nova linha logo depois da última versão; no banco, "Usado em" ganha a versão
    awk -v tag="$tag" -v nome="$nome" -v uni="$universo" -v mudou="$mudou" '
      function apara(x) { gsub(/^ +| +$/, "", x); return x }
      { linhas[NR] = $0; if ($0 ~ /^\| *v[0-9]/) ultima = NR }
      END {
        for (i = 1; i <= NR; i++) {
          l = linhas[i]
          if (l ~ /^\| *P?[0-9]+ *\|/) { split(l, c, "|")
            if (tolower(apara(c[3])) == tolower(nome)) l = "| " apara(c[2]) " | " nome " | " apara(c[4]) " | " tag " |" }
          print l
          if (i == ultima) print "| " tag " | " nome " | " uni " | " mudou " |"
        }
      }' "$ARQ" >"$tmp" && mv "$tmp" "$ARQ"
    tipo=""; especial "$tag" && tipo=" (versão especial: protagonista)"
    echo "$tag · $nome ($universo)$tipo registrada em VERSOES.md. Faça o merge na main e crie a release com a tag $tag.";;
  *) sed -n '2,11p' "$0"; exit 1;;
esac
