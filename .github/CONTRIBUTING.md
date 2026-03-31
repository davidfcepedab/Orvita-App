# Contribuir a ÓRVITA-APP

## Rama de producción (única para el dominio)

| Rama | Rol |
|------|-----|
| **`main`** | **Producción Vercel** → **https://orvita.app**. Es la rama por defecto en GitHub y la única que debe estar configurada como **Production Branch** en Vercel. |

## Otras ramas en el remoto (opcionales)

| Rama | Rol |
|------|-----|
| **`preview`** | Integración y PRs; despliegues *preview* en Vercel (si el proyecto construye esta rama o cada PR). |
| **`production`** | Flujo interno opcional; **no** sustituye a `main` para el dominio. Si la usas, mantenla al mismo commit que `main` tras cada release. |
| **`built`** | Espejo de `production` tras un corte; se actualiza con `npm run release:sync` **desde la rama `production`** (ver [docs/RELEASE_STRATEGY.md](../docs/RELEASE_STRATEGY.md)). |

Flujo habitual:

1. Crea una rama desde **`main`** o desde **`preview`**: `feature/…`, `fix/…`, `chore/…`.
2. Abre un **pull request** hacia **`main`** (o hacia **`preview`** y luego **`main`**, según acuerdo del equipo).
3. Tras merge a **`main`**, Vercel despliega **orvita.app** automáticamente (salvo que solo uses Deploy Hooks; en ese caso el hook debe apuntar a **`main`**).

Evita push directo a **`main`** salvo emergencias acordadas; preferible PR con revisión / CI.

### Protección en GitHub (admin)

En **Settings → Branches → Branch protection rules**, aplica reglas a **`main`** (y a **`preview`** si aplica): PR obligatorio, checks, etc.

### Deploy Hook en Vercel

Si usas un hook llamado “production”, la **rama del hook** debe ser **`main`**, igual que **Production Branch** en **Settings → Build and Deployment**, para no tener dos fuentes de verdad.
