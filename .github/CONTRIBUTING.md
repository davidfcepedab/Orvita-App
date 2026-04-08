# Contribuir a ÓRVITA-APP

## Rama de producción (única para el dominio)

| Rama | Rol |
|------|-----|
| **`main`** | **Producción Vercel** → **https://orvita.app**. Es la rama por defecto en GitHub y la **Production Branch** en Vercel. |

**Dominio único (usuarios finales):** En el panel de Vercel, cada despliegue lista siempre varias URLs (`orvita.app`, `*.vercel.app` del proyecto, URL del commit, etc.); es normal y no se pueden “quitar” del listado. Lo importante es que **solo compartas y enlaces `https://orvita.app`**: con **`NEXT_PUBLIC_SITE_URL=https://orvita.app`** en entornos de producción, el **`proxy.ts`** redirige **308** cualquier otro host (p. ej. `orvita-…vercel.app`) al dominio canónico cuando `VERCEL_ENV=production`. Los **previews** (`VERCEL_ENV=preview`) no redirigen. Además, `vercel.json` redirige **`www.orvita.app`** → apex.

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

### Diseño (Figma) y módulos nuevos sin comprometer producción

Para explorar UI en Figma y/o en código **sin afectar `main`** hasta revisión:

- Usa ramas `design/<tema>` o `feature/<modulo>` desde `main`.
- Abre un **PR** (puede ser **Draft**) para obtener preview en Vercel y revisar en equipo.
- Detalle del flujo y cómo enlazar Figma con el estado “actual” del producto: **[docs/FIGMA_WORKFLOW.md](../docs/FIGMA_WORKFLOW.md)**.

### Protección en GitHub (admin)

En **Settings → Branches → Branch protection rules**, aplica reglas a **`main`** (y a **`preview`** si aplica): PR obligatorio, checks, etc.

### Deploy Hook en Vercel

Si usas un hook llamado “production”, la **rama del hook** debe ser **`main`**, igual que **Production Branch** en **Settings → Build and Deployment**, para no tener dos fuentes de verdad.
