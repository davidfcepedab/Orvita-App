# Release Strategy

## Versioning
- Semantic versioning: `MAJOR.MINOR.PATCH`.
- v1.1.0 introduces operational modules and Supabase migrations.

## Branching
- Feature work lands on `feature/*` branches.
- Release candidates are merged to `main` via pull requests.

## Quality Gates
- TypeScript strict mode and ESLint must pass.
- Jest test suite must pass.
- Supabase migrations must apply cleanly in preview environments.

## Deployment
- Preview deployment on Vercel for each PR.
- Production deploy on merge to `main`.
- **Dominio de producción:** [https://orvita.app](https://orvita.app) debe apuntar al proyecto de Vercel cuya rama de producción es `main` (o la que tengas fijada en *Production Branch*). La rama `productive` se mantiene alineada con `main` mediante `npm run release:sync` para entornos o automatizaciones que la usen.

## Proteger un corte en producción (snapshot en Git)
1. Con `main` estable y desplegado, ejecuta la validación local: `npm run validate:release`.
2. Crea un tag anotado en el commit exacto que está en producción, por ejemplo:  
   `git tag -a release/orvita-app-YYYY-MM-DD -m "Producción orvita.app — notas breves"`  
3. Publica el tag: `git push origin release/orvita-app-YYYY-MM-DD`.  
Así puedes volver a ese árbol con `git checkout <tag>` o crear una rama hotfix desde el tag. **Vercel** no “congela” el dominio solo con el tag: para evitar despliegues accidentales, en el dashboard de Vercel usa *Deployment Protection* (Vercel Authentication) en previews y revisa que solo `main` despliegue a producción.

## Migration Workflow
1. Generate migration: `supabase migration new <name>`.
2. Apply locally/preview: `supabase db push`.
3. Validate policies in Supabase Dashboard.
4. Ensure `supabase migration list` matches local history before release.

## Release Checklist
1. All migrations applied without errors.
2. RLS policies verified for operational tables.
3. API contracts and docs updated.
4. CI green (TypeScript, ESLint, Jest).
5. Tag release and publish PR.
