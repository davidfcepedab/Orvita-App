# ÓRVITA

Next.js (App Router) — sistema operativo estratégico personal y hogar.

## Documentación

- Despliegue y ramas (`preview` / `production` / `built`): [docs/RELEASE_STRATEGY.md](docs/RELEASE_STRATEGY.md)
- Rutas V3 y checklist productivo: [V3_PRODUCTION.md](V3_PRODUCTION.md)
- Contrato API finanzas: [API_CONTRACT.md](API_CONTRACT.md)
- Contribución y flujo de PRs: [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)

## Requisitos

- Node 20+
- `npm ci`

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Calidad y release

```bash
npx tsc --noEmit
npm test
npm run validate:release   # tsc + jest + build (antes de cortes)
```

Con la rama local **`production`** actualizada y sin cambios sin commitear:

```bash
npm run release:sync       # alinea built con production y hace push
```

## Estructura (resumen)

| Ruta | Contenido |
|------|-----------|
| `app/` | Páginas, layouts y rutas API |
| `lib/` | Lógica compartida (finanzas, operacional, integraciones) |
| `src/` | UI tema, componentes base, módulos salud/training |
| `supabase/migrations/` | Esquema y políticas Postgres |
| `scripts/` | Importación Sheets, sync de ramas release |

## Deploy

Producción en **Vercel** apuntando a la rama **`production`** y dominio **https://orvita.app**.
