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
