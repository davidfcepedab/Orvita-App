#!/usr/bin/env bash
# Alinea la rama `productive` con `main` y (opcional) hace push de ambas a origin.
# Uso:
#   bash scripts/sync-main-productive.sh           # local + push
#   bash scripts/sync-main-productive.sh --local   # solo actualiza productive localmente
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "sync-main-productive: no es un repositorio git." >&2
  exit 1
}
cd "$ROOT"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" != "main" ]]; then
  echo "sync-main-productive: debes estar en la rama main (rama actual: $BRANCH)." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "sync-main-productive: hay cambios sin commitear. Haz commit o stash antes." >&2
  exit 1
fi

git branch -f productive main
echo "productive → main ($(git rev-parse --short HEAD))"

if [[ "${1:-}" == "--local" ]]; then
  echo "Solo local (--local). Para publicar: npm run release:sync"
  exit 0
fi

git push origin main productive
echo "Push hecho: origin/main y origin/productive"
