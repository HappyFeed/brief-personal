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
  lanzando el subagente `planner` en modo bootstrap o modo tarea única
  (siempre secuencial, nunca en paralelo — ver Reglas), hasta dejarlo
  100% iterado. No escribe código de implementación.

Recién con las tres piezas del spec aprobadas (incluyendo la
aprobación final de `tasks.md`) arranca "ejecución (TDD)".

## Reglas

- Una skill (fuente de datos) a la vez. No abrir frentes en paralelo —
  esto también aplica a los subagentes `planner` que lanza
  `planning-tasks`: uno a la vez, nunca en simultáneo.
- TDD: test que falla → implementar → test que pasa.
- No agregar dependencias sin necesidad.
- No se escribe código de una skill sin su spec en docs/ ya definida,
  con `tasks.md` iterado y aprobado.
