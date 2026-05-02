# Órvita en iPhone: capa de copiloto (iOS 18/19)

**Documento maestro de producto** — Capa nativa que integra tiempo, energía y dinero bajo prioridades, impacto y flujo. Pensado para dos iPhones y vida compartida.

## Principio de unificación (anti-disonancia)

**Una jerarquía de mirada, no un menú de widgets.** El usuario no debe elegir entre muchas lecturas equivalentes:

| Orden | Dónde mirar | Qué responde |
|-------|-------------|----------------|
| 1ª | **Pulso del Día** (Lock / Home pequeño) | “¿Cómo va el sistema *ahora*?” |
| 2ª | **Mapa de Capitales** (Home grande) | “¿Qué pasa en dinero, energía y tiempo *en detalle*?” |
| 3ª | **Ventana Compartida** (Home grande, si pareja activa) | “¿Cuándo y qué *juntos*?” |
| 4ª | **Siguiente Movimiento** (Home P/M) | “¿Qué hago *ahora*?” — solo si Pulso no basta para actuar |

**Early Warning** no compite con Pulso: Pulso = estado actual; Early Warning = **tendencia o pre-alerta** (solo visible cuando hay inclinación antes de romperse). Si no hay señal, el widget Early Warning permanece neutro o oculto según política de producto.

**Smart Stack Órvita** rota *dentro de esta misma familia* (Pulso, Siguiente, fragmentos de cierre), nunca introduce un “octavo concepto” nuevo: reduce deslizamientos, no añade decisiones.

---

## 1. Widgets de Home Screen y Lock Screen

### 1.1 **Pulso del Día** (Pequeño — Lock Screen + Home)

- **Qué hace:** Estado **actual** del sistema en una sola lectura: **Flujo**, **Atención** o **Presión**, combinando agenda, energía y ritmo de gasto *en el momento*.
- **Pilares:** Tiempo, energía, dinero, prioridades y flujo.
- **Presión / flujo:** Evita abrir la app solo para orientarte; es la **primera y única** lectura obligatoria del día.
- **Trigger:** Hitos suaves (8:00, 13:00, 17:00), cambio de Focus y tras gasto relevante.
- **Visual:** Semáforo muy suave (verde = flujo, ámbar = atención ligera, rojo = presión real).
- **Lock Screen:** Solo tamaños *accessory inline / rectangular* permitidos por iOS.

### 1.2 **Siguiente Movimiento** (Pequeño / Mediano)

- **Qué hace:** La **única** acción de mayor impacto en las próximas 2–3 horas (ejecutar, proteger energía o posponer con criterio).
- **Pilares:** Impacto, tiempo, prioridades y flujo de ejecución.
- **Presión / flujo:** Convierte estrategia en paso concreto; se muestra cuando el usuario ya sabe que debe actuar (Pulso ya orientó).
- **Trigger:** Fin de evento anterior o regla horaria.
- **Visual:** Tipografía clara; un solo acento de color en el verbo de acción.

### 1.3 **Mapa de Capitales** (Grande 4×4 — núcleo principal)

- **Qué hace:** Vista integrada de los tres capitales en **un solo widget** (no tres widgets separados):
  - **Dinero** → Presupuesto respirable (“X €/día hasta domingo” + barra de ritmo). Con **modo compartido**, incorpora **Presupuesto hogar en espejo** (totales acordados, sin detalle no deseado).
  - **Energía** → Nivel alta/media/baja + una señal clave del día.
  - **Tiempo** → Una frase de presión/agenda por pilar (mapa de presiones del día).
- **Pilares:** Tiempo, energía, dinero y prioridades.
- **Presión / flujo:** Sustituye la pregunta “¿cuál widget de finanzas/energía/tiempo miro?” — **solo existe este** para el detalle integrado.
- **Trigger:** Hitos diarios (8:00, 13:00, 17:00) + on-demand.
- **Visual:** Grid de tres secciones equilibradas; color por pilar (verde / ámbar / rojo solo presión real); tipografía minimalista. **Centro de mando** en Home.

### 1.4 **Ventana Compartida** (Grande 4×4 — núcleo pareja)

- **Qué hace:** Huecos comunes hoy/mañana + **agenda entrelazada** (solo eventos “pareja/hogar”) + sugerencia mínima (recado, cocina, descanso). **Agenda entrelazada no existe como widget aparte:** vive aquí.
- **Pilares:** Tiempo, flujo doméstico y prioridades compartidas.
- **Presión / flujo:** Sustituye hilos de “¿cuándo?”; una sola superficie para coordinación.
- **Trigger:** ~8:00 y cambios relevantes en calendario compartido.
- **Visual:** Dos iniciales discretas arriba; línea de tiempo abajo; verde = hueco claro; ámbar = fragmentos.
- **Extra Large (opcional, post-MVP):** “Pared de comando” en la primera pantalla; **no** forma parte del MVP de implementación.

### 1.5 **Smart Stack Órvita Contextual**

- **Qué hace:** Rota **solo** widgets de la familia Órvita ya definida (Pulso, Siguiente, Cierre semanal/streak, entradas resumidas del Mapa si el sistema lo permite sin duplicar el 4×4 completo). Mañana → agenda/impacto; noche → cierre, gasto, descanso.
- **Pilares:** Flujo y contexto temporal.
- **Presión / flujo:** El usuario no elige qué subir: el stack **ordena** lo ya acordado en este documento.
- **Trigger:** Hora del día + reglas Órvita (ej. lunes más agenda, viernes más hogar/dinero social).
- **Visual:** Misma retícula y paleta que el resto de la familia.

### 1.6 **Cierre semanal + Streak de intención** (Mediano o grande — domingo)

- **Qué hace:** Tres bullets (qué fluyó, qué pide ajuste, prioridad entrante) + streak de la prioridad macro.
- **Pilares:** Impacto a largo plazo y cierre de loop semanal.
- **Presión / flujo:** Ritual breve; no compite con Pulso entre semana (solo domingo o configuración explícita).
- **Trigger:** Domingo 19:00 o Shortcut “Semana que Entra”.
- **Visual:** Tonos reflexivos; verde en logros; ámbar en ajustes.

### 1.7 **Early Warning** (Pequeño — Lock Screen)

- **Qué hace:** Visible **solo** cuando hay **tendencia** o pre-umbral (gasto acelerado vs semana anterior, noches cortas seguidas, mañana sobrecargada). No replica el estado instantáneo del Pulso.
- **Pilares:** Detección temprana en los tres capitales.
- **Presión / flujo:** Micro-ajuste hoy para evitar crisis mañana.
- **Trigger:** Umbrales suaves definidos por el usuario o pareja.
- **Visual:** Una línea + icono; ámbar cuando hay señal; Lock solo en tamaños permitidos.

---

## 2. Live Activities y Dynamic Island

Misma lógica: **cada Live Activity responde a una pregunta única**; no dos actividades para el mismo objetivo.

### 2.1 **Bloque profundo en curso**

- **Qué hace:** Cuenta regresiva de concentración; tap → pausar o completar en Órvita.
- **Pilares:** Tiempo, impacto, flujo de ejecución.
- **Presión / flujo:** Ancla la intención sin abrir listas.
- **Trigger:** Inicio desde app o Shortcut “Inicio de bloque profundo”.
- **Visual:** Barra fina; verde en curso; ámbar en pausa prolongada.

### 2.2 **Viaje financiero del día**

- **Qué hace:** Ritmo del gasto frente al objetivo del día; actualización al registrar pago.
- **Pilares:** Dinero, flujo.
- **Presión / flujo:** Feedback en el momento del gasto; complementa el bloque Dinero del Mapa, no lo sustituye en Home.
- **Trigger:** Registro de transacción o Shortcut “Después de pago”.
- **Visual:** Minimal; verde / ámbar / rojo según umbrales de presión real.

### 2.3 **Cuenta atrás a decisión**

- **Qué hace:** Tiempo hasta deadline de decisión importante + enlace a criterios en app.
- **Pilares:** Prioridades, impacto.
- **Presión / flujo:** Evita decidir en pánico.
- **Trigger:** Decisión con fecha límite en Órvita.
- **Visual:** Neutro lejos del plazo; ámbar en ventana final.

### 2.4 **Modo pareja — Handoff**

- **Qué hace:** “Llego en X min” o “Te toca recoger”; visible solo entre ustedes (pareja/hogar), revocable.
- **Pilares:** Tiempo, flujo doméstico.
- **Presión / flujo:** Menos mensajes duplicados; extiende Ventana Compartida al tiempo real.
- **Trigger:** Shortcut “Salgo”, geofence o confirmación manual.
- **Visual:** Discreto; sin estética de tracking invasivo.

### 2.5 **Carga energética de la tarde**

- **Qué hace:** Aviso suave de posible bajón + **una** micro-acción (caminar, agua, 10 min sin pantalla).
- **Pilares:** Energía, tiempo.
- **Presión / flujo:** Intercepta el crash antes de arrastrar noche o decisiones impulsivas.
- **Trigger:** ~15:30–16:30 o fin de bloque “alta carga”.
- **Visual:** Ámbar calmado.

### 2.6 **Isla de transición**

- **Qué hace:** **Un** recordatorio entre contextos fuertes (trabajo → hogar), ej. cerrar loop laboral o primer gesto en casa.
- **Pilares:** Energía, tiempo, flujo entre roles.
- **Presión / flujo:** Reduce arrastre mental al espacio compartido.
- **Trigger:** Último evento laboral del día o llegada a geofence hogar (si se configura).
- **Visual:** Una línea; acento ámbar suave.

---

## 3. Notificaciones push y alertas inteligentes

**Regla:** mismos tipos que ya existen en widgets/Live Activities; las notificaciones **empujan** o **resumen**, no crean nuevas categorías mentales.

### 3.1 **Umbral del 70%** (gasto)

- **Qué hace:** Primera vez que se cruza el umbral del día → sugerencia calmada de ajuste (una vez por cruce).
- **Pilares:** Dinero, prioridades.
- **Presión / flujo:** Corrección temprana; alineado con Dinero en Mapa y Viaje financiero.
- **Trigger:** Gasto acumulado vs objetivo diario.
- **Visual / canal:** Copy sereno; time-sensitive solo si es imprescindible; preferir digest cuando pueda esperar.

### 3.2 **Buffer antes de cita pesada**

- **Qué hace:** ~15 min antes: propuesta de transición suave.
- **Pilares:** Energía, tiempo.
- **Presión / flujo:** Aterrizaje antes de alta carga.
- **Trigger:** Evento etiquetado o regla de duración/tipo.
- **Visual / canal:** Breve; respetar Focus.

### 3.3 **Resumen único de tarde** (17:00)

- **Qué hace:** **Un** digest: noche en agenda + **un** número financiero + **una** prioridad activa.
- **Pilares:** Integración de capitales.
- **Presión / flujo:** Sustituye múltiples pings; encajar en Scheduled Summary cuando sea posible.
- **Trigger:** Hora fija.
- **Visual / canal:** Secciones claras; sin rich media agresiva.

### 3.4 **Sincronía suave** (pareja)

- **Qué hace:** Solo eventos **pre-acordados** como notificables (presupuesto cerrado, lista lista, etc.).
- **Pilares:** Flujo compartido, dinero/tiempo.
- **Presión / flujo:** Alineación sin micromanagement; coherente con Ventana Compartida.
- **Trigger:** Cambio de estado en entidad compartida + reglas de pareja.
- **Visual / canal:** Neutro o confirmación verde.

### 3.5 **Vencimiento en 48h**

- **Qué hace:** Recordatorio calmado con deep link (impuesto, renovación, suscripción).
- **Pilares:** Tiempo, dinero, impacto.
- **Presión / flujo:** Anticipación sin sorpresa de última hora.
- **Trigger:** Fecha límite − 48h.
- **Visual / canal:** Ámbar; rojo opcional solo en ventana crítica configurada.

### 3.6 **Reconciliación pendiente**

- **Qué hace:** Como máximo **una vez al día**: N gastos sin categoría, acción corta.
- **Pilares:** Dinero, integridad del modelo.
- **Presión / flujo:** Higiene sin acumular culpa.
- **Trigger:** Cola > 0 y sin aviso en 24h.
- **Visual / canal:** Ámbar; una sola acción en la notificación.

### 3.7 **Focus-aware**

- **Qué hace:** En Focus Sueño o Personal, solo **riesgo real** (fraude, vencimiento hoy, etc.); resto a resumen o silencio.
- **Pilares:** Energía, confianza en el producto.
- **Presión / flujo:** Órvita no compite con el descanso.
- **Trigger:** Focus activo + lista blanca de tipos.
- **Visual / canal:** Texto plano nocturno.

### 3.8 **Semáforo de semana** (jueves)

- **Qué hace:** Estado semanal de los tres capitales + **una** recomendación de ajuste.
- **Pilares:** Detección temprana a escala semana.
- **Presión / flujo:** Alineado con Cierre semanal + domingo; no duplica el Pulso diario.
- **Trigger:** Jueves hora fija o Shortcut.
- **Visual / canal:** Tres palabras + una línea de acción; preferir Summary.

---

## 4. Automaciones con Apple Shortcuts

Los Shortcuts **no añaden nuevas preguntas**: disparan flujos ya nombrados arriba (cierre, bloque, lista compra, Focus, etc.).

| ID | Nombre | Qué dispara / conecta |
|----|--------|------------------------|
| 4.1 | Cierre de Día Órvita | Loop diario; opcional resumen a pareja |
| 4.2 | Salgo de Casa | Checklist + Handoff / Live Activity si aplica |
| 4.3 | Llegada al Supermercado | Lista compartida + techo de compra |
| 4.4 | Después de Pago | Prompt 2 toques → Viaje financiero / Mapa actualizado |
| 4.5 | Modo Fin de Semana | Focus + orden de stacks (misma familia visual) |
| 4.6 | Inicio de Bloque Profundo | Focus + Live Activity §2.1 |
| 4.7 | Semana que Entra | Domingo 19:00 → Cierre semanal / prioridades |
| 4.8 | Entrada a Focus Sueño | Silencio Órvita no crítico + Lock mínimo |

---

## 5. Capa compartida (pareja)

**Dónde vive qué** (evita duplicar conceptos en la cabeza del usuario):

- **Presupuesto hogar en espejo** → **dentro de Mapa de Capitales** (modo compartido), no widget suelto.
- **Agenda entrelazada** → **dentro de Ventana Compartida**, no widget suelto.
- **Señales de carga** (disponible / concentrado / saturado) → **app** + opcionalmente **Sincronía suave** / **Ventana** (indicador discreto), no tercer widget financiero.
- **Decisiones compartidas en cola** → **app** + notificaciones §3.4 cuando hay consenso o bloqueo.
- **Objetivo compartido** → **app** + línea o barra en **Mapa** (modo compartido) si cabe en el grid Dinero.
- **Límite de ping mutuo** → **regla de producto** global (notificaciones pareja).
- **Inventario de presión del hogar** → **semanal**: Cierre semanal, **Semáforo de semana** o pantalla dedicada en app; misma taxonomía tiempo/dinero/energía.

---

## Prioridad de implementación (MVP — máximo impacto)

1. **Pulso del Día** — Firma cognitiva; primera mirada única.
2. **Mapa de Capitales** (grande 4×4) — Sustituye widgets sueltos de dinero/energía/tiempo.
3. **Siguiente Movimiento** — Acción única cuando hace falta ejecutar.
4. **Ventana Compartida** (grande 4×4) — Valor pareja; **Extra Large explícitamente post-MVP**.
5. **Resumen único de tarde** — Antídoto al spam.
6. **Cierre de Día Órvita** (Shortcut) — Loop diario.
7. **Umbral del 70%** — Alerta financiera temprana, calmada.
8. **Smart Stack Órvita Contextual** — Orden sin nuevos conceptos.
9. **Bloque profundo en curso** (Live Activity) — Presencia en Island.
10. **Reconciliación pendiente + Focus-aware** — Higiene y descanso.

---

## Disciplina de notificaciones (regla de oro)

Órvita trata el push como **capital escaso**: máximo **3–4 interrupciones activas por persona y día** (excepción: riesgo real acordado). El resto → Scheduled Summary, colas silenciosas o digestivos fijos. En Focus (especialmente Sueño y Personal) solo lista blanca de riesgo. Pings entre pareja con **tope explícito** y preferencia por resumen compartido. Así la capa iOS se siente **copiloto**, no más ruido.

---

## Anexo: mapa de trazabilidad

| Pieza | Capitales | Superficie principal | Notas |
|-------|-----------|----------------------|--------|
| Pulso del Día | Todos | Lock + Home S | Estado *ahora* |
| Early Warning | Todos | Lock S | Tendencia *antes*; no sustituye Pulso |
| Siguiente Movimiento | Impacto, tiempo | Home S/M | Una acción |
| Mapa de Capitales | Tiempo, energía, dinero | Home L | Incluye espejo hogar en modo compartido |
| Ventana Compartida | Tiempo, hogar | Home L / XL post-MVP | Incluye agenda entrelazada |
| Smart Stack | Flujo temporal | Stack iOS | Solo familia Órvita |
| Cierre + Streak | Impacto | Home M/G domingo | — |
| Bloque profundo | Tiempo, impacto | Island | Shortcut 4.6 |
| Viaje financiero | Dinero | Island | Shortcut 4.4 |
| Cuenta atrás decisión | Prioridades | Island | — |
| Handoff | Tiempo, hogar | Island | Shortcut 4.2 |
| Carga tarde / Transición | Energía, tiempo | Island | — |
| §3.1–3.8 | Mix | Push / Summary | No nuevas categorías vs widgets |
| Shortcuts 4.1–4.8 | Mix | Shortcuts | Disparan flujos ya definidos |

---

*Documento unificado para producto, diseño e iOS. Revisiones: alinear con roadmap de app Órvita y con capacidades reales de extensiones en cada fase.*
