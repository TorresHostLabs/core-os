#!/usr/bin/env bash
# Versões do Core OS e o banco de codinomes (personagens da DC ou de Star Wars), tudo em VERSOES.md.
# Uso:
#   ./versao.sh proximo                         próximo codinome livre do banco
#   ./versao.sh banco                           o banco, com o que já foi usado
#   ./versao.sh registrar vX.Y.Z "o que mudou"  acrescenta a versão com o próximo codinome e marca como usado
#   ./versao.sh codinome vX.Y.Z                 (usado pelo build) "codinome<TAB>universo<TAB>origem", origem = tabela | banco
#                                               VERSAO_USADOS (um nome por linha) soma nomes já usados fora do arquivo (ex.: títulos de releases)
set -euo pipefail
ARQ=${VERSOES_MD:-$(dirname "$0")/VERSOES.md}
[ -f "$ARQ" ] || { echo "Não achei $ARQ" >&2; exit 1; }

# linhas da tabela de versões: versão<TAB>codinome<TAB>universo
versoes(){ awk -F'|' '/^\| *v[0-9]/ { for (i = 2; i <= 4; i++) gsub(/^ +| +$/, "", $i); print $2 "\t" $3 "\t" $4 }' "$ARQ"; }
# linhas do banco: ordem<TAB>codinome<TAB>universo<TAB>usado em
banco(){ awk -F'|' '/^\| *[0-9]+ *\|/ { for (i = 2; i <= 5; i++) gsub(/^ +| +$/, "", $i); print $2 "\t" $3 "\t" $4 "\t" $5 }' "$ARQ"; }
minusculas(){ tr '[:upper:]' '[:lower:]'; }
erro(){ echo "$1" >&2; exit 1; }

validar(){
  local ruim
  ruim=$( { versoes | cut -f2,3; banco | cut -f2,3; } | awk -F'\t' '$2 != "DC" && $2 != "Star Wars" { print $1 " (" $2 ")" }')
  [ -z "$ruim" ] || erro "Universo inválido em VERSOES.md (use DC ou Star Wars): $ruim"
  ruim=$(versoes | cut -f2 | minusculas | sort | uniq -d); [ -z "$ruim" ] || erro "Codinome repetido na tabela de versões: $ruim"
  ruim=$(banco | cut -f2 | minusculas | sort | uniq -d); [ -z "$ruim" ] || erro "Codinome repetido no banco: $ruim"
  [ -z "$(versoes | awk -F'\t' '$2 == ""')" ] || erro "Versão sem codinome na tabela."
}

# primeiro do banco que não está na tabela de versões nem em VERSAO_USADOS: codinome<TAB>universo
proximo(){
  local usados
  usados=$( { versoes | cut -f2; printf '%s\n' "${VERSAO_USADOS:-}"; } | minusculas | sed '/^$/d')
  banco | awk -F'\t' -v u="$usados" 'BEGIN { n = split(u, a, "\n"); for (i = 1; i <= n; i++) usado[a[i]] = 1 }
    !(tolower($2) in usado) { print $2 "\t" $3; achou = 1; exit } END { if (!achou) exit 1 }' \
    || erro "O banco de codinomes acabou: acrescente nomes em VERSOES.md."
}

cmd=${1:-}; shift || true
validar
case "$cmd" in
  proximo) proximo | awk -F'\t' '{ print $1 " (" $2 ")" }';;
  banco)
    usados=$(versoes | awk -F'\t' '{ print tolower($2) "\t" $1 }')
    banco | awk -F'\t' -v u="$usados" 'BEGIN { n = split(u, a, "\n"); for (i = 1; i <= n; i++) { split(a[i], p, "\t"); v[p[1]] = p[2] } }
      { k = tolower($2); printf "%3s  %-20s %-10s %s\n", $1, $2, $3, (k in v ? "usado em " v[k] : "livre") }';;
  codinome)
    tag=${1:?diga a tag, ex.: v0.0.2}; base=${tag%%-*}  # v1.0.0-rc1 usa o codinome de v1.0.0
    linha=$(versoes | awk -F'\t' -v v="$base" '$1 == v')
    if [ -n "$linha" ]; then printf '%s\t%s\ttabela\n' "$(cut -f2 <<<"$linha")" "$(cut -f3 <<<"$linha")"
    else p=$(proximo) || exit 1; printf '%s\tbanco\n' "$p"; fi;;
  registrar)
    tag=${1:?diga a versão, ex.: v0.0.2}; mudou=${2:?diga o que mudou, entre aspas}
    [[ $tag =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || erro "Versão inválida: use vX.Y.Z (ex.: v0.0.2)."
    [ -z "$(versoes | awk -F'\t' -v v="$tag" '$1 == v')" ] || erro "$tag já está registrada."
    [[ $mudou != *"|"* ]] || erro "Não use | no texto."
    p=$(proximo) || exit 1; IFS=$'\t' read -r nome universo <<<"$p"
    tmp=$(mktemp)
    # nova linha logo depois da última versão; no banco, "Usado em" ganha a versão
    awk -v tag="$tag" -v nome="$nome" -v uni="$universo" -v mudou="$mudou" '
      function apara(x) { gsub(/^ +| +$/, "", x); return x }
      { linhas[NR] = $0; if ($0 ~ /^\| *v[0-9]/) ultima = NR }
      END {
        for (i = 1; i <= NR; i++) {
          l = linhas[i]
          if (l ~ /^\| *[0-9]+ *\|/) { split(l, c, "|")
            if (tolower(apara(c[3])) == tolower(nome)) l = "| " apara(c[2]) " | " nome " | " apara(c[4]) " | " tag " |" }
          print l
          if (i == ultima) print "| " tag " | " nome " | " uni " | " mudou " |"
        }
      }' "$ARQ" >"$tmp" && mv "$tmp" "$ARQ"
    echo "$tag · $nome ($universo) registrada em VERSOES.md. Faça o merge na main e crie a release com a tag $tag.";;
  *) sed -n '2,9p' "$0"; exit 1;;
esac
