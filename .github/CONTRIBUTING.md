# Contribuir a ÓRVITA-APP

## Ramas en el remoto (solo tres)

| Rama | Rol |
|------|-----|
| **`preview`** | Integración y PRs; despliegues *preview* en Vercel (configura el proyecto para construir esta rama o para cada PR). |
| **`production`** | Código que alimenta **https://orvita.app** (rama de producción en Vercel). |
| **`built`** | Espejo de `production` tras un corte validado; se actualiza con `npm run release:sync` desde `production`. |

Flujo habitual:

1. Crea una rama desde **`preview`**: `feature/…`, `fix/…`, `chore/…`.
2. Abre un **pull request** hacia **`preview`** y pasa revisión / CI.
3. Cuando `preview` esté listo para salir, merge **`preview` → `production`** (PR o merge controlado).
4. En local, con `production` actualizado y limpio: `npm run validate:release` y luego `npm run release:sync` para alinear **`built`** con **`production`**.

Evita push directo a `production` salvo emergencias acordadas.

### Protección en GitHub (admin)

En **Settings → Branches → Branch protection rules**, aplica reglas a **`production`** y **`preview`** según el equipo (PR obligatorio, checks, etc.).

### Migración desde `main` / `productive`

En el remoto puede quedar **`main`** mientras siga siendo la **rama por defecto** del repositorio (GitHub no permite borrarla hasta entonces).

1. **Settings → General → Default branch** → elige **`production`** y confirma.
2. Borra la rama antigua: `git push origin --delete main`.
3. Actualiza tu clon: `git fetch origin --prune` y, si quieres trabajar en preview, `git checkout -b preview origin/preview`.

Tras eso solo deberían quedar en `origin` las ramas **`production`**, **`preview`** y **`built`** (más tags si los usas).
