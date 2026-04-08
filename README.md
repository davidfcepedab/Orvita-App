# ÓRVITA

Next.js (App Router) — sistema operativo estratégico personal y hogar.

## Documentación

- **Órbita en iPhone** (widgets, Live Activities, notificaciones, Shortcuts, pareja): [docs/ORBITA_IOS_COPILOT.md](docs/ORBITA_IOS_COPILOT.md)
- Despliegue y ramas (`main` producción, `preview` / `production` / `built` opcionales): [docs/RELEASE_STRATEGY.md](docs/RELEASE_STRATEGY.md)
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

Si usas las ramas **`production`** y **`built`** como espejo (ver [docs/RELEASE_STRATEGY.md](docs/RELEASE_STRATEGY.md)), con **`production`** actualizada y el árbol limpio:

```bash
npm run release:sync       # alinea built con production y hace push de ambas
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

- **Vercel:** **Production Branch** = **`main`** → dominio **https://orvita.app** (un solo deployment productivo por commit en `main`).
- **GitHub:** rama por defecto del repo = **`main`** (alineado con Vercel).
