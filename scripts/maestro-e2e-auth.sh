#!/usr/bin/env bash
# E2E auth suite (Maestro web / Chromium).
# Prereq: app en APP_URL (default http://localhost:3000) y Maestro en PATH.
#
# Uso:
#   export PATH="$PATH:$HOME/.maestro/bin"
#   npm run dev   # otra terminal
#   ./scripts/maestro-e2e-auth.sh
#
# El reset lee el token del log de Next (`[auth] Password reset requested`).
# Pasá DEV_LOG apuntando al archivo/terminal de `npm run dev`, o CURSOR_TERMINALS
# al directorio de terminals de Cursor.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

APP_URL="${APP_URL:-http://localhost:3000}"
E2E_NAME="${E2E_NAME:-E2E Maestro}"
E2E_EMAIL="${E2E_EMAIL:-e2e+maestro$(date +%s)@mail.test}"
E2E_PASSWORD="${E2E_PASSWORD:-TestPass1!}"
E2E_NEW_PASSWORD="${E2E_NEW_PASSWORD:-TestPass2!}"
DEV_LOG="${DEV_LOG:-}"

if ! command -v maestro >/dev/null 2>&1; then
  echo "maestro no está en PATH. Agregá ~/.maestro/bin" >&2
  exit 1
fi

if ! curl -sf -o /dev/null "$APP_URL/login"; then
  echo "La app no responde en $APP_URL/login. Levantá npm run dev." >&2
  exit 1
fi

echo "==> E2E auth"
echo "    APP_URL=$APP_URL"
echo "    E2E_EMAIL=$E2E_EMAIL"

run_flow() {
  local file="$1"
  shift
  maestro test "$file" \
    -e "APP_URL=$APP_URL" \
    -e "E2E_NAME=$E2E_NAME" \
    -e "E2E_EMAIL=$E2E_EMAIL" \
    -e "E2E_PASSWORD=$E2E_PASSWORD" \
    -e "E2E_NEW_PASSWORD=$E2E_NEW_PASSWORD" \
    "$@"
}

run_flow .maestro/flows/e2e/01-register.yaml
run_flow .maestro/flows/e2e/02-login.yaml
run_flow .maestro/flows/e2e/03-forgot-password.yaml

extract_reset_token() {
  local source="$1"
  local token=""
  if [[ -d "$source" ]]; then
    token="$(rg -o 'token: \S+' "$source" --glob '*.txt' 2>/dev/null | tail -1 | sed 's/^token: //' || true)"
    if [[ -z "$token" ]]; then
      token="$(
        rg -o 'api/auth/reset-password/[A-Za-z0-9]+' "$source" --glob '*.txt' 2>/dev/null \
          | tail -1 | sed 's|.*/||' || true
      )"
    fi
  else
    token="$(rg -o 'token: \S+' "$source" 2>/dev/null | tail -1 | sed 's/^token: //' || true)"
    if [[ -z "$token" ]]; then
      token="$(
        rg -o 'api/auth/reset-password/[A-Za-z0-9]+' "$source" 2>/dev/null \
          | tail -1 | sed 's|.*/||' || true
      )"
    fi
  fi
  printf '%s' "$token"
}

echo "==> Esperando token de reset en logs del server..."
RESET_TOKEN=""
for _ in $(seq 1 30); do
  if [[ -n "$DEV_LOG" && -f "$DEV_LOG" ]]; then
    RESET_TOKEN="$(extract_reset_token "$DEV_LOG")"
  elif [[ -n "${CURSOR_TERMINALS:-}" && -d "$CURSOR_TERMINALS" ]]; then
    RESET_TOKEN="$(extract_reset_token "$CURSOR_TERMINALS")"
  fi
  if [[ -n "$RESET_TOKEN" ]]; then
    break
  fi
  sleep 1
done

if [[ -z "$RESET_TOKEN" ]]; then
  echo "No se encontró token de reset en logs." >&2
  echo "Pedí forgot-password y buscá: [auth] Password reset requested" >&2
  echo "Luego: maestro test .maestro/flows/e2e/04-reset-password.yaml -e RESET_TOKEN=... -e E2E_NEW_PASSWORD=$E2E_NEW_PASSWORD" >&2
  exit 1
fi

echo "    RESET_TOKEN encontrado (${#RESET_TOKEN} chars)"
run_flow .maestro/flows/e2e/04-reset-password.yaml -e "RESET_TOKEN=$RESET_TOKEN"
run_flow .maestro/flows/e2e/05-login-new-password.yaml

echo "==> E2E auth OK ($E2E_EMAIL)"
