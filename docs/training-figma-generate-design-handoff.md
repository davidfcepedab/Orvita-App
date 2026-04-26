# Training Redesign Figma Handoff

This brief is prepared to execute the `figma-generate-design` workflow for `/training` using the current implemented data contract and component hierarchy.

## Frame

- Name: `Training / Operational Dashboard`
- Variants:
  - `Desktop / Default`
  - `Desktop / No Hevy`
  - `Desktop / No Apple`
  - `Desktop / Misalignment`
  - `Mobile / Compact`

## Sections

1. `Hero operativo`
   - Planned training label
   - State badge (`Pendiente`, `Completado`, `Movido`, `Descanso`)
   - Actions (`Abrir Hevy`, `Registrar entrenamiento`)
2. `Preparación física`
   - Readiness score + recommendation label
   - Sleep / HRV / Resting HR chips
3. `Ejecución real`
   - Last Hevy session summary
   - Top 3 exercises
   - Empty-state fallback with CTA
4. `Plan semanal`
   - 7-day timeline
   - Plan vs executed row labels
   - Suggestion copy for re-scheduling
5. `Objetivo físico`
   - 1 insight
   - 2 actionables
   - 1 risk (if present)
6. `Agenda bridge`
   - Today's training blocks
   - Suggest-block fallback with confirmation language

## Empty/Fallback States (required)

- `No Hevy recent sessions`
- `Apple activity without Hevy session`
- `Hevy session without Apple minutes`
- `No agenda block for today`

## Visual Direction

- Reuse styles from `/salud` and existing `ConfigAccordion` card language.
- No empty white cards.
- Compact actionable microcopy.
- Calm status colors (green/amber/slate/red).
