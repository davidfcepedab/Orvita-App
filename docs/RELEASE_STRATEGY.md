# Release Strategy

## Versioning
- Semantic versioning: `MAJOR.MINOR.PATCH`.
- v1.1.0 introduces operational modules and Supabase migrations.

## Branching

- **`main`** — **Única rama de producción** para **https://orvita.app**: en Vercel, **Production Branch** = `main` (y el dominio ligado a Production). Cada push a `main` sustituye el deployment público anterior.
- **`preview`** — Integración opcional; destino de PRs y previews en Vercel si lo configuráis así.
- **`production`** / **`built`** — Ramas auxiliares opcionales: `npm run release:sync` (ejecutado estando en **`production`** con árbol limpio) alinea **`built`** con **`production`** y hace push de ambas. **No** definen el dominio; para evitar confusión, mantened **`production`** al mismo commit que **`main`** cuando uséis este flujo.

El trabajo en curso vive en ramas locales o cortas (`feature/*`, `fix/*`), no como ramas remotas permanentes.

## Quality Gates
- TypeScript (`tsc`) y Jest deben pasar. Para CI en GitHub Actions, copia `scripts/github-actions-ci.example.yml` a `.github/workflows/ci.yml` (el push de workflows exige token con permiso `workflow`).
- `npm run validate:release` local antes de cortes importantes: `tsc` + `jest` + `build`.
- Supabase migrations must apply cleanly in preview environments.

## Deployment
- **Vercel:** **Production Branch** = **`main`**. Previews desde PRs o desde `preview`, según configuración.
- **Dominio de producción:** [https://orvita.app](https://orvita.app) solo sirve el último deployment de Production (rama `main`).
- Opcional: si usáis **`production`** / **`built`** como espejo, tras alinear `production` con `main`, con el árbol limpio en `production`: `npm run release:sync` publica `production` y `built` en el remoto.

## Proteger un corte en producción (snapshot en Git)
1. Con **`main`** estable y desplegado en orvita.app, ejecuta `npm run validate:release`.
2. Tag anotado: `git tag -a release/orvita-app-YYYY-MM-DD -m "Producción orvita.app — notas"` y `git push origin release/orvita-app-YYYY-MM-DD`.
3. En Vercel: *Deployment Protection* en previews; dominio productivo solo en entorno **Production** (rama **`main`**).

## Migration Workflow
1. Generate migration: `supabase migration new <name>`.
2. Apply locally/preview: `supabase db push`.
3. Validate policies in Supabase Dashboard.
4. Ensure `supabase migration list` matches local history before release.

## Release Checklist
1. All migrations applied without errors.
2. RLS policies verified for operational tables.
3. API contracts and docs updated.
4. CI green (TypeScript, Jest, build).
5. Tag release when cutting production.
