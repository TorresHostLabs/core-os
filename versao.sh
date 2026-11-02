#!/usr/bin/env bash
# Versões do Core OS e os bancos de codinomes (personagens da DC ou de Star Wars), tudo em VERSOES.md.
# Cada nome tem a sua versão reservada. Versão especial (vX.Y.0) é de um protagonista; as de correção, de um coadjuvante.
# Versão de 4 números (vX.Y.Z.W) herda o nome da vX.Y.Z.
# Uso:
#   ./versao.sh qual vX.Y.Z                     quem recebe essa versão
#   ./versao.sh previsao [N]                    as próximas N versões reservadas e ainda não lançadas (padrão 10)
#   ./versao.sh banco                           os dois bancos, com o que já foi lançado
#   ./versao.sh registrar vX.Y.Z "o que mudou"  acrescenta a versão na tabela com o nome reservado (v1.0 vira v1.0.0;
#                                               vX.Y.Z.W usa o nome da vX.Y.Z)
#   ./versao.sh codinome vX.Y.Z                 (usado pelo build) "codinome<TAB>universo<TAB>origem", origem = tabela | reserva
set -euo pipefail
ARQ=${VERSOES_MD:-$(dirname "$0")/VERSOES.md}
[ -f "$ARQ" ] || { echo "Não achei $ARQ" >&2; exit 1; }

# tabela de versões: versão<TAB>codinome<TAB>universo
versoes(){ awk -F'|' '/^\| *v[0-9]/ { for (i = 2; i <= 4; i++) gsub(/^ +| +$/, "", $i); print $2 "\t" $3 "\t" $4 }' "$ARQ"; }
# bancos: ordem<TAB>codinome<TAB>universo<TAB>versão reservada. comum = "1, 2, 3…"; protagonistas = "P1, P2…"
linhas_banco(){ awk -F'|' -v re="$1" '$0 ~ re { for (i = 2; i <= 5; i++) gsub(/^ +| +$/, "", $i); print $2 "\t" $3 "\t" $4 "\t" $5 }' "$ARQ"; }
comum(){ linhas_banco '^\\| *[0-9]+ *\\|'; }
protagonistas(){ linhas_banco '^\\| *P[0-9]+ *\\|'; }
reservas(){ { protagonistas; comum; } | awk -F'\t' '{ print $4 "\t" $2 "\t" $3 }'; }  # versão<TAB>codinome<TAB>universo
minusculas(){ tr '[:upper:]' '[:lower:]'; }
erro(){ echo "$1" >&2; exit 1; }
base3(){ printf '%s' "${1%%-*}" | cut -d. -f1-3; }  # v0.0.3.1 e v0.0.3-rc1 → v0.0.3
especial(){ [[ $(base3 "$1") =~ ^v[0-9]+\.[0-9]+\.0$ ]]; }
normalizar(){ local v=$1; [[ $v =~ ^v[0-9]+\.[0-9]+$ ]] && v="$v.0"; printf '%s' "$v"; }
reservado(){ reservas | awk -F'\t' -v v="$1" '$1 == v { print $2 "\t" $3 }'; }  # codinome<TAB>universo

validar(){
  local ruim
  ruim=$( { versoes | cut -f2,3; comum | cut -f2,3; protagonistas | cut -f2,3; } | awk -F'\t' '$2 != "DC" && $2 != "Star Wars" { print $1 " (" $2 ")" }')
  [ -z "$ruim" ] || erro "Universo inválido em VERSOES.md (use DC ou Star Wars): $ruim"
  ruim=$(versoes | awk -F'\t' '$1 !~ /^v[0-9]+\.[0-9]+\.[0-9]+(\.[0-9]+)?$/ { print $1 }'); [ -z "$ruim" ] || erro "Versão inválida na tabela (use vX.Y.Z ou vX.Y.Z.W): $ruim"
  # o mesmo nome só pode aparecer em versões da mesma vX.Y.Z (v0.0.3 e v0.0.3.1)
  ruim=$(versoes | awk -F'\t' '{ split($1, p, "."); b = p[1] "." p[2] "." p[3]; k = tolower($2); if (k in base && base[k] != b) print $2; base[k] = b }' | sort -u)
  [ -z "$ruim" ] || erro "Codinome repetido na tabela de versões: $ruim"
  # vX.Y.Z.W com o mesmo nome da vX.Y.Z
  ruim=$(versoes | awk -F'\t' '{ n[$1] = $2; l[NR] = $1 } END { for (i = 1; i <= NR; i++) { v = l[i]; if (split(v, p, ".") == 4) { b = p[1] "." p[2] "." p[3]; if ((b in n) && tolower(n[b]) != tolower(n[v])) print v " (" n[v] ") precisa do mesmo nome da " b " (" n[b] ")" } } }')
  [ -z "$ruim" ] || erro "$ruim"
  ruim=$( { comum; protagonistas; } | cut -f2 | minusculas | sort | uniq -d); [ -z "$ruim" ] || erro "Codinome repetido nos bancos: $ruim"
  ruim=$(reservas | awk -F'\t' '$1 !~ /^v[0-9]+\.[0-9]+\.[0-9]+$/ { print $2 " (\"" $1 "\")" }'); [ -z "$ruim" ] || erro "Versão reservada inválida (use vX.Y.Z): $ruim"
  ruim=$(reservas | cut -f1 | sort | uniq -d); [ -z "$ruim" ] || erro "Versão reservada pra mais de um nome: $ruim"
  ruim=$(protagonistas | awk -F'\t' '$4 !~ /\.0$/ { print $2 " (" $4 ")" }'); [ -z "$ruim" ] || erro "Protagonista reservado pra versão de correção (use vX.Y.0): $ruim"
  ruim=$(comum | awk -F'\t' '$4 ~ /\.0$/ { print $2 " (" $4 ")" }'); [ -z "$ruim" ] || erro "Versão especial reservada pra coadjuvante (precisa de um protagonista): $ruim"
  [ -z "$(versoes | awk -F'\t' '$2 == ""')" ] || erro "Versão sem codinome na tabela."
  # o que já foi lançado bate com a reserva
  ruim=$(versoes | while IFS=$'\t' read -r v n _; do
    r=$(reservado "$(base3 "$v")" | cut -f1); [ -z "$r" ] || [ "$(minusculas <<<"$r")" = "$(minusculas <<<"$n")" ] || echo "$v está com $n na tabela, mas foi reservada pra $r"
  done); [ -z "$ruim" ] || erro "$ruim"
  ruim=$(versoes | awk -F'\t' '{ print tolower($2) "\t" $1 }' | while IFS=$'\t' read -r n v; do
    r=$(reservas | awk -F'\t' -v n="$n" 'tolower($2) == n { print $1 }'); [ -z "$r" ] || [ "$r" = "$(base3 "$v")" ] || echo "$v usa um nome reservado pra $r"
  done); [ -z "$ruim" ] || erro "$ruim"
}

# nome de uma versão (v0.0.3.1 e v0.0.3-rc1 usam o da v0.0.3): codinome<TAB>universo<TAB>origem
codinome(){
  local base linha; base=$(base3 "$1")
  linha=$(versoes | awk -F'\t' -v v="$base" '$1 == v')
  if [ -n "$linha" ]; then printf '%s\t%s\ttabela\n' "$(cut -f2 <<<"$linha")" "$(cut -f3 <<<"$linha")"; return; fi
  linha=$(reservado "$base")
  [ -n "$linha" ] || erro "Nenhum nome reservado pra $base. Reserve em VERSOES.md: ponha $base na coluna \"Versão\" de um $(especial "$base" && echo protagonista || echo coadjuvante) livre."
  printf '%s\treserva\n' "$linha"
}

cmd=${1:-}; shift || true
validar
case "$cmd" in
  qual)
    v=$(normalizar "${1:?diga a versão, ex.: v1.0.0}"); r=$(codinome "$v") || exit 1
    IFS=$'\t' read -r n u o <<<"$r"
    lancada=$(versoes | awk -F'\t' -v v="$v" '$1 == v')
    echo "$v · $n ($u)$([ -n "$lancada" ] && echo ' · já lançada' || true)";;
  previsao)
    lancadas=$(versoes | cut -f1)
    reservas | awk -F'\t' -v l="$lancadas" 'BEGIN { n = split(l, a, "\n"); for (i = 1; i <= n; i++) feita[a[i]] = 1 } !($1 in feita)' \
      | sort -V | head -n "${1:-10}" \
      | awk -F'\t' '{ printf "%-8s %-20s %-10s %s\n", $1, $2, $3, ($1 ~ /\.0$/ ? "especial" : "") }';;
  banco)
    lancadas=$(versoes | cut -f1)
    for b in protagonistas comum; do
      [ $b = protagonistas ] && echo "Banco de protagonistas (versões vX.Y.0)" || { echo; echo "Banco de codinomes (versões de correção)"; }
      $b | awk -F'\t' -v l="$lancadas" 'BEGIN { n = split(l, a, "\n"); for (i = 1; i <= n; i++) feita[a[i]] = 1 }
        { printf "%4s  %-20s %-10s %-8s %s\n", $1, $2, $3, $4, ($4 in feita ? "lançada" : "reservada") }'
    done;;
  codinome) codinome "${1:?diga a tag, ex.: v0.0.3}";;
  registrar)
    tag=$(normalizar "${1:?diga a versão, ex.: v0.0.3}"); mudou=${2:?diga o que mudou, entre aspas}
    [[ $tag =~ ^v[0-9]+\.[0-9]+\.[0-9]+(\.[0-9]+)?$ ]] || erro "Versão inválida: use vX.Y.Z (ex.: v0.0.3), vX.Y.Z.W (ex.: v0.0.3.1) ou vX.Y (ex.: v1.0)."
    [ -z "$(versoes | awk -F'\t' -v v="$tag" '$1 == v')" ] || erro "$tag já está registrada."
    [[ $mudou != *"|"* ]] || erro "Não use | no texto."
    r=$(codinome "$tag") || exit 1; IFS=$'\t' read -r nome universo _ <<<"$r"
    tmp=$(mktemp)
    awk -v linha="| $tag | $nome | $universo | $mudou |" '{ l[NR] = $0; if ($0 ~ /^\| *v[0-9]/) u = NR } END { for (i = 1; i <= NR; i++) { print l[i]; if (i == u) print linha } }' "$ARQ" >"$tmp" && mv "$tmp" "$ARQ"
    tipo=""; especial "$tag" && tipo=" (versão especial)"; [ "$tag" = "$(base3 "$tag")" ] || tipo="$tipo (herda o nome da $(base3 "$tag"))"
    echo "$tag · $nome ($universo)$tipo registrada em VERSOES.md. Faça o merge na main e crie a release com a tag $tag.";;
  *) sed -n '2,12p' "$0"; exit 1;;
esac
