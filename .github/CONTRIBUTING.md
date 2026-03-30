# Contribuir a ÓRVITA-APP

## Flujo recomendado (main protegido)

1. Crea una rama desde `main`: `feature/…`, `fix/…` o `chore/…`.
2. Commits pequeños y mensajes claros (idealmente en el estilo del repo).
3. Abre un **pull request** hacia `main` y pasa revisión / CI.
4. **Merge** en GitHub (squash o merge según acuerdo del equipo).

Evita `git push` directo a `main` salvo emergencias acordadas.

### Protección en GitHub (admin)

En **Settings → Branches → Branch protection rules** para `main`:

- Require a pull request before merging
- (Opcional) Require approvals, status checks, linear history

Así la regla del remoto coincide con este flujo.

## Antes de abrir el PR

- `npx tsc --noEmit`
- `npm run lint` (si aplica en el cambio)
- Probar la ruta o flujo que tocaste en local
