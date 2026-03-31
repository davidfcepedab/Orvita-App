# Release Strategy

## Versioning
- Semantic versioning: `MAJOR.MINOR.PATCH`.
- v1.1.0 introduces operational modules and Supabase migrations.

## Branching (tres ramas en `origin`)

- **`preview`** — Integración; destino habitual de PRs y entorno preview (Vercel).
- **`production`** — Lo que sirve **https://orvita.app** (rama de producción en Vercel).
- **`built`** — Copia alineada con `production` tras validación; `npm run release:sync` hace `built` = `production` y hace push de ambas.

El trabajo en curso vive en ramas locales o cortas (`feature/*`, `fix/*`), no como ramas remotas permanentes.

## Quality Gates
- TypeScript (`tsc`) y Jest deben pasar. Para CI en GitHub Actions, copia `scripts/github-actions-ci.example.yml` a `.github/workflows/ci.yml` (el push de workflows exige token con permiso `workflow`).
- `npm run validate:release` local antes de cortes importantes: `tsc` + `jest` + `build`.
- Supabase migrations must apply cleanly in preview environments.

## Deployment
- **Vercel:** asigna **Production Branch** = `production`. Previews desde PRs o desde `preview`, según tu configuración.
- **Dominio de producción:** [https://orvita.app](https://orvita.app).
- Tras merge a `production`, con el árbol limpio: `npm run release:sync` publica `production` y `built` en el remoto.

## Proteger un corte en producción (snapshot en Git)
1. Con `production` estable y desplegado, ejecuta `npm run validate:release`.
2. Tag anotado: `git tag -a release/orvita-app-YYYY-MM-DD -m "Producción orvita.app — notas"` y `git push origin release/orvita-app-YYYY-MM-DD`.
3. En Vercel: *Deployment Protection* en previews y solo `production` ligada al dominio productivo.

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
