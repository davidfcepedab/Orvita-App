# Órvita — Roadmap estratégico (Sistema operativo personal)

Visión: una sola apertura diaria a Órvita para **claridad** sobre tiempo, energía y capital, con lenguaje humano y **una palanca** prioritaria.

## Estado actual (base cerrada)

- `buildOperationalContext` + Apple Health (`health_metrics`) + insights cruzados.
- Motor de día: `lib/insights/buildStrategicDay.ts` + UI `StrategicDayHero` (Inicio, Hoy).
- Primitivas HIG: `orv-glass-panel`, `orv-apple-text`, `orv-page-shell` en `globals.css`.
- Bio-stack: correlaciones heurísticas en `lib/health/bioStackCorrelations.ts` (no clínico).

## Fase 2 — Densidad de valor (próximos 1–2 meses)

| Palanca | Impacto | Notas |
|--------|---------|--------|
| Motor + API | Alto | Exponer `StrategicDayPayload` vía `/api/orbita/strategic-day` para widget iOS / notificaciones. |
| Hevy en insights | Alto | Inyectar carga de entreno en `buildStrategicDay` (sesión hoy vs Apple). |
| Finanzas en hero | Medio | Mostrar 1 métrica de runway o burn junto a la palanca cuando `moneyPressure` es alto. |
| Narrativa única | Medio | Unificar textos de `useHealthSummaryNarrative` con `strategic` para no repetir frases. |
| Accesibilidad | Medio | `prefers-reduced-motion` en todos los `motion.div` de salud. |

## Fase 3 — Correlación profunda (2–4 meses)

- **Modelo de deuda de sueño** rolling 3–7 días vs HRV y check-in.
- **Reglas de medicación** (solo recordatorios + educación) enlazadas a franja horaria y feedback opcional “me sentí…” (no dosis clínica en servidor sin compliance).
- **Agenda → energía**: bloques “costosos” mapeados a readiness del día.
- **Offline PWA**: cola de check-in y de “palanca” completada con sync.

## Fase 4 — Ecosistema Apple / capital humano (4+ meses)

- Live Activities / WidgetKit: palanca + presión (tiempo / energía / dinero) en lock screen.
- Integración con Atajos avanzada: disparo proactivo al detectar cierre de anillo o fin de entreno (Webhook + token ya existente).
- “Modo comité”: digest semanal con tendencias, no solo día.

## Checklist de verificación (cada release visual / insights)

- [ ] `StrategicDayHero` visible en **Inicio** y **Hoy** sin errores de consola.
- [ ] `buildStrategicDay` no contradice términos legales (no diagnóstico; medicación = educación).
- [ ] Tema claro/oscuro: contraste de texto en `orv-glass-panel` (WCAG razonable).
- [ ] PWA: safe-area + touch targets ≥ 44px en CTA de palanca.
- [ ] Con `health_metrics` vacío, la palanca sigue siendo útil (check-in o capital).
- [ ] iOS: Atajo abre `shortcuts://import-shortcut` y token API funciona.
- [ ] `npm run build` y tests de insight pasan.

## Archivos clave

| Ruta | Rol |
|------|-----|
| `lib/insights/buildStrategicDay.ts` | Motor de correlaciones + palanca #1 |
| `app/components/orvita-ui/StrategicDayHero.tsx` | Presentación HIG |
| `app/hooks/useStrategicDay.ts` | Inicio: context + capital |
| `app/hoy/HoyCommandCenter.tsx` | Hoy: context + capital + minutos de reunión |
| `lib/health/bioStackCorrelations.ts` | Copy bio-stack / fármacos (heurístico) |
| `docs/shortcuts/Orvita-Importar-Salud-Hoy.md` | Atajo iOS |
