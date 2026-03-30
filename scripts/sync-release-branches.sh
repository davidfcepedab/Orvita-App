#!/usr/bin/env bash
# Alinea la rama `built` con `production` y hace push de ambas a origin.
# `preview` no se toca aquí (integración previa a producción).
#
# Uso:
#   bash scripts/sync-release-branches.sh           # local + push production y built
#   bash scripts/sync-release-branches.sh --local   # solo actualiza built localmente
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "sync-release-branches: no es un repositorio git." >&2
  exit 1
}
cd "$ROOT"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" != "production" ]]; then
  echo "sync-release-branches: debes estar en la rama production (rama actual: $BRANCH)." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "sync-release-branches: hay cambios sin commitear. Haz commit o stash antes." >&2
  exit 1
fi

git branch -f built production
echo "built → production ($(git rev-parse --short HEAD))"

if [[ "${1:-}" == "--local" ]]; then
  echo "Solo local (--local). Para publicar: npm run release:sync"
  exit 0
fi

git push origin production built
echo "Push hecho: origin/production y origin/built"
