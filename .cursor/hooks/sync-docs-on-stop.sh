#!/usr/bin/env bash
# After an agent turn: if product code changed without docs, request a docs sync follow-up.
set -euo pipefail

input=$(cat)
status=$(printf '%s' "$input" | jq -r '.status // empty')
loop_count=$(printf '%s' "$input" | jq -r '.loop_count // 0')

if [[ "$status" != "completed" ]]; then
  echo '{}'
  exit 0
fi

# Avoid infinite loops — only one docs follow-up per conversation turn chain.
if [[ "${loop_count}" -ge 1 ]]; then
  echo '{}'
  exit 0
fi

root=$(printf '%s' "$input" | jq -r '.workspace_roots[0] // empty')
if [[ -z "$root" || ! -d "$root" ]]; then
  root="$(pwd)"
fi

cd "$root"

if ! command -v git >/dev/null 2>&1 || ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo '{}'
  exit 0
fi

changed=$(
  {
    git diff --name-only HEAD 2>/dev/null || true
    git diff --name-only --cached 2>/dev/null || true
    git ls-files --others --exclude-standard 2>/dev/null || true
  } | sort -u
)

if [[ -z "$changed" ]]; then
  echo '{}'
  exit 0
fi

product_hit=$(printf '%s\n' "$changed" | grep -E '^(src/features/|src/lib/auth\.ts|src/middleware\.ts|prisma/)' || true)
docs_hit=$(printf '%s\n' "$changed" | grep -E '^(docs/|\.cursor/rules/|AGENTS\.md|DESIGN\.md)' || true)

if [[ -n "$product_hit" && -z "$docs_hit" ]]; then
  jq -n --arg msg "$(cat <<'EOF'
Se detectaron cambios de producto (features/auth/prisma/middleware) sin tocar documentación en este turno.

Actualizá la documentación antes de cerrar:
- Specs relevantes en docs/specs/
- docs/domain-model.md si cambió el modelo
- Guías en docs/guides/ si aplica
- docs/README.md si hay docs nuevas

Reglas: no inventar features no implementadas; docs de producto en español; código en inglés. Luego confirmá qué archivos de docs actualizaste.
EOF
)" '{followup_message: $msg}'
  exit 0
fi

echo '{}'
exit 0
