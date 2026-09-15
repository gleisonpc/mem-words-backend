#!/usr/bin/env bash
#
# Diagnóstico de produção do mem-words-backend.
#
#   ./smoke.sh https://seu-servico.onrender.com
#
# Verifica, em ordem: o serviço está no ar, o banco responde, as tabelas
# existem e o fluxo de autenticação funciona ponta a ponta.
# Cria um usuário temporário e o remove no final.

set -uo pipefail

BASE="${1:-}"
if [ -z "$BASE" ]; then
  echo "uso: $0 <url-base>    ex.: $0 https://seu-servico.onrender.com" >&2
  exit 2
fi
BASE="${BASE%/}"

# Plano gratuito hiberna: a primeira requisição pode levar ~1 min.
CURL=(curl -sS --max-time 120)
EMAIL="smoke-$(date +%s)@exemplo.test"
PASS="senha-de-teste-12345"
ok=0; fail=0

pass() { ok=$((ok+1));   printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad()  { fail=$((fail+1)); printf '  \033[31m✗\033[0m %s\n' "$1"; [ -n "${2:-}" ] && printf '      %s\n' "$2"; }

json() { node -pe "try{JSON.parse(require('fs').readFileSync(0,'utf8'))$1 ?? ''}catch(e){''}" 2>/dev/null; }

echo ""
echo "Testando $BASE"
echo ""

# ── 1. o processo está no ar ──────────────────────────────────────────────
echo "1. Serviço"
BODY=$("${CURL[@]}" -o /tmp/smoke_b -w '%{http_code}' "$BASE/health" 2>/dev/null)
if [ "$BODY" = "200" ]; then
  pass "/health respondeu 200 — o processo está no ar"
else
  bad "/health respondeu ${BODY:-sem resposta}" "O serviço não subiu. Veja os logs do deploy: provavelmente falta uma variável de ambiente (o boot nomeia qual)."
  echo ""; echo "Interrompendo: sem serviço no ar, o resto não faz sentido."; exit 1
fi

# ── 2. o banco responde ───────────────────────────────────────────────────
echo ""
echo "2. Banco de dados"
CODE=$("${CURL[@]}" -o /tmp/smoke_r -w '%{http_code}' "$BASE/health/ready" 2>/dev/null)
READY=$(cat /tmp/smoke_r 2>/dev/null)
if [ "$CODE" = "200" ]; then
  pass "/health/ready respondeu 200 — a aplicação conectou no banco"
  echo "      $READY"
else
  bad "/health/ready respondeu ${CODE:-sem resposta}" "$READY"
  echo ""
  echo "  A aplicação subiu mas NÃO conecta no banco. Causas prováveis:"
  echo "    • DATABASE_URL incorreta (host, usuário, senha ou nome do banco)"
  echo "    • falta ?sslmode=require no fim da connection string"
  echo "    • o banco está suspenso no provedor"
  echo "  O log do serviço traz o erro do driver — é lá que está a causa exata."
  exit 1
fi

# ── 3. as tabelas existem (as migrations rodaram) ─────────────────────────
echo ""
echo "3. Migrations"
CODE=$("${CURL[@]}" -o /tmp/smoke_reg -w '%{http_code}' -X POST "$BASE/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Smoke Test\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" 2>/dev/null)
REG=$(cat /tmp/smoke_reg 2>/dev/null)
if [ "$CODE" = "201" ]; then
  pass "cadastro criou o usuário — as tabelas existem"
elif [ "$CODE" = "500" ]; then
  bad "cadastro devolveu 500" "Banco conecta, mas a escrita falha — provavelmente as migrations não rodaram e a tabela 'users' não existe. Confirme que o build inclui 'npx prisma migrate deploy'."
  exit 1
else
  bad "cadastro devolveu $CODE" "$REG"
  exit 1
fi

# ── 4. autenticação ───────────────────────────────────────────────────────
echo ""
echo "4. Autenticação"
LOGIN=$("${CURL[@]}" -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" 2>/dev/null)
AT=$(printf '%s' "$LOGIN" | json '.accessToken')
RT=$(printf '%s' "$LOGIN" | json '.refreshToken')
ID=$(printf '%s' "$LOGIN" | json '.user.id')

[ -n "$AT" ] && pass "login devolveu access token" || { bad "login não devolveu token" "$LOGIN"; exit 1; }
[ -n "$RT" ] && pass "login devolveu refresh token" || bad "login não devolveu refresh token"

if printf '%s' "$LOGIN" | grep -q passwordHash; then
  bad "a resposta VAZOU o hash da senha"
else
  pass "a resposta não expõe o hash da senha"
fi

CODE=$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$BASE/users/me" -H "Authorization: Bearer $AT" 2>/dev/null)
[ "$CODE" = "200" ] && pass "rota autenticada respondeu 200" || bad "rota autenticada respondeu $CODE"

CODE=$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$BASE/users/me" 2>/dev/null)
[ "$CODE" = "401" ] && pass "rota autenticada recusa requisição sem token (401)" || bad "sem token deveria dar 401, deu $CODE"

# ── 5. sessão (rotação de refresh token) ──────────────────────────────────
echo ""
echo "5. Sessão"
NEW=$("${CURL[@]}" -X POST "$BASE/auth/refresh" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$RT\"}" 2>/dev/null | json '.refreshToken')
if [ -n "$NEW" ] && [ "$NEW" != "$RT" ]; then
  pass "refresh rotacionou o token"
else
  bad "refresh não rotacionou o token"
fi

CODE=$("${CURL[@]}" -o /dev/null -w '%{http_code}' -X POST "$BASE/auth/refresh" \
  -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$RT\"}" 2>/dev/null)
[ "$CODE" = "401" ] && pass "token de refresh já usado é recusado (401)" || bad "reuso deveria dar 401, deu $CODE"

# ── 6. limpeza ────────────────────────────────────────────────────────────
echo ""
echo "6. Limpeza"
LOGIN2=$("${CURL[@]}" -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" 2>/dev/null)
AT2=$(printf '%s' "$LOGIN2" | json '.accessToken')
CODE=$("${CURL[@]}" -o /dev/null -w '%{http_code}' -X DELETE "$BASE/users/$ID" \
  -H "Authorization: Bearer $AT2" 2>/dev/null)
if [ "$CODE" = "204" ]; then
  pass "usuário de teste removido"
else
  bad "não foi possível remover o usuário de teste (HTTP $CODE)" "Remova manualmente: $EMAIL"
fi

echo ""
echo "─────────────────────────────────────────"
printf '  %d passaram, %d falharam\n' "$ok" "$fail"
echo "─────────────────────────────────────────"
echo ""
[ "$fail" -eq 0 ]
