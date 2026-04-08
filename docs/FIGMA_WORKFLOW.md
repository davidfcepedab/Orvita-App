# Flujo diseño (Figma) + código sin comprometer `main`

Objetivo: explorar UI en Figma y/o en código en ramas aisladas, con **previews** revisables, y **solo después** integrar en `main` tras revisión en Cursor/PR.

## 1. Ramas Git (recomendación)

| Uso | Nombre sugerido | Notas |
|-----|-----------------|--------|
| Producción | `main` | orvita.app; no mezclar experimentos aquí. |
| Exploración solo diseño en código | `design/<tema>` | Ej.: `design/habitos-v2`, `design/agenda-densidad`. |
| Módulo nuevo con UI | `feature/<modulo>` | Ej.: `feature/modulo-finanzas-v3`. |

Convención: **siempre partir de `main` actualizado**:

```bash
git fetch origin && git checkout main && git pull origin main
git checkout -b design/nombre-exploracion
```

## 2. Cómo Figma puede “leer” lo actual

Figma no importa el repo automáticamente. En la práctica se combina:

1. **Preview por rama (ideal)**  
   Si Vercel (u otro) genera **URL de preview** por PR o por rama, esa URL es la referencia “vivo” del estado actual o del experimento. En Figma puedes enlazar la URL en comentarios o en la descripción del archivo.

2. **Capturas**  
   Exportar pantallas del preview o de local y colocarlas en el archivo Figma como referencia “As built”.

3. **Código → Figma (cuando toque)**  
   Con el servidor **Figma MCP** y el flujo *generate design from code* se puede **reconstruir o actualizar frames** en Figma a partir de pantallas ya implementadas (referencia, no sustituye el diseño final).

4. **Tokens**  
   Los tokens viven en el código (`globals.css`, `data-theme`, clases `orbita-*`). Para alinear Figma, conviene **copiar o duplicar** variables en Figma manualmente o con plugins; no hay sync mágico con Supabase ni con el repo.

## 3. Flujo de trabajo sugerido

1. **Abrir rama** `design/…` o `feature/…` desde `main`.
2. **Implementar** cambios experimentales solo en esa rama (o diseñar primero en Figma y luego implementar en la misma rama).
3. **Subir** y abrir **Pull Request** hacia `main` en estado **Draft** si aún no quieres merge; así generas preview y revisión sin compromiso.
4. **Revisión** en GitHub + en Cursor (diff, accesibilidad, tokens, RLS si toca datos).
5. **Ajustes** en la misma rama hasta OK.
6. **Merge a `main`** cuando el equipo lo apruebe.

Así **nada toca producción** hasta el merge; `main` sigue siendo la única rama de producción del dominio (ver [CONTRIBUTING.md](../.github/CONTRIBUTING.md)).

## 4. Supabase

Los cambios de esquema o RLS deben ir en **migraciones** en la misma rama del feature y revisarse en el PR. Figma no sustituye migraciones ni políticas; si un módulo nuevo necesita datos, el contrato sigue siendo código + Supabase en el repo.

## 5. Resumen

- **Rama dedicada** = trabajo seguro sin tocar `main`.
- **PR (draft o listo)** = revisión y preview.
- **Figma** = referencia visual + enlaces a preview/capturas; alineación con MCP/Code Connect cuando haga falta.
- **`main`** = solo tras revisión explícita.
