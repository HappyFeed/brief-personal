# Briefing Diario Personal

Proyecto de ejemplo para una app que arma un **briefing diario personal**: junta info de
distintas fuentes (empezando por noticias de un tema de interés) y la entrega en un
resumen legible. V1 sin LLM — solo junta y formatea datos.

## Stack

- TypeScript + Node
- Vitest (tests)

## Comandos de verificación

```bash
npm run typecheck   # tsc --noEmit
npm test             # vitest run
```

## Workflow de trabajo

brainstorming → definición → spec (docs/) → ejecución (TDD) → verificación → commit

La etapa de "spec (docs/)" se resuelve con dos skills, en orden:

- **`specify`** — redacta y hace aprobar `requirements.md` y luego
  `design.md` de `docs/specs/<slug>/`, con un gate de aprobación
  explícito por documento.
- **`planning-tasks`** — recién cuando `design.md` está aprobado, arma
  (o retoma) `tasks.md` del mismo spec y lo itera tarea por tarea,
  invocando el dynamic workflow `plan-tasks`
  (`.claude/workflows/plan-tasks.js`), hasta dejarlo 100% iterado. No
  escribe código de implementación.

Recién con las tres piezas del spec aprobadas (incluyendo la
aprobación final de `tasks.md`) arranca "ejecución (TDD)".

## Reglas

- Una skill (fuente de datos) a la vez. No abrir frentes en paralelo —
  esto aplica en particular a la etapa de ejecución (TDD): un solo
  agente escribiendo código de una skill a la vez.
- Excepción controlada, solo dentro del dynamic workflow
  `plan-tasks`: los subagentes `planner-iterate` pueden evaluar varias
  tareas de `tasks.md` en paralelo cuando no dependen entre sí, porque
  corren de solo lectura (no tienen `Edit`/`Write`) y devuelven su
  propuesta como dato estructurado en vez de tocar el archivo. La
  escritura real queda serializada en un único `tasks-writer` por
  lote, nunca dos escribiendo `tasks.md` al mismo tiempo. Fuera de ese
  mecanismo, seguí sin lanzar dos subagentes `planner` /
  `planner-iterate` / `tasks-writer` en simultáneo sobre el mismo spec.
- TDD: test que falla → implementar → test que pasa.
- No agregar dependencias sin necesidad.
- No se escribe código de una skill sin su spec en docs/ ya definida,
  con `tasks.md` iterado y aprobado.
