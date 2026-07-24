#!/usr/bin/env bash
# E2E ledger: cuentas + movimientos (Maestro web / Chromium).
#
# Prereq: npm run dev en APP_URL + Maestro en PATH.
#
# Uso:
#   export PATH="$PATH:$HOME/.maestro/bin"
#   ./scripts/maestro-e2e-ledger.sh              # headless (default)
#   MAESTRO_HEADED=1 ./scripts/maestro-e2e-ledger.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

APP_URL="${APP_URL:-http://localhost:3000}"
E2E_NAME="${E2E_NAME:-E2E Ledger}"
E2E_EMAIL="${E2E_EMAIL:-e2e+ledger$(date +%s)@mail.test}"
E2E_PASSWORD="${E2E_PASSWORD:-TestPass1!}"

if ! command -v maestro >/dev/null 2>&1; then
  echo "maestro no está en PATH. Agregá ~/.maestro/bin" >&2
  exit 1
fi

if ! curl -sf -o /dev/null "$APP_URL/login"; then
  echo "La app no responde en $APP_URL/login. Levantá npm run dev." >&2
  exit 1
fi

echo "==> E2E ledger (cuentas + movimientos)"
echo "    APP_URL=$APP_URL"
echo "    E2E_EMAIL=$E2E_EMAIL"

if [[ "${MAESTRO_HEADED:-}" == "1" ]]; then
  echo "    mode=headed"
  maestro test \
    .maestro/flows/e2e/ledger/suite.yaml \
    -e "APP_URL=$APP_URL" \
    -e "E2E_NAME=$E2E_NAME" \
    -e "E2E_EMAIL=$E2E_EMAIL" \
    -e "E2E_PASSWORD=$E2E_PASSWORD"
else
  echo "    mode=headless"
  maestro test --headless --screen-size 1280x800 \
    .maestro/flows/e2e/ledger/suite.yaml \
    -e "APP_URL=$APP_URL" \
    -e "E2E_NAME=$E2E_NAME" \
    -e "E2E_EMAIL=$E2E_EMAIL" \
    -e "E2E_PASSWORD=$E2E_PASSWORD"
fi

echo "==> E2E ledger OK ($E2E_EMAIL)"
