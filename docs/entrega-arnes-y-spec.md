# Tu arnés y tu spec

**Repo:** [`HappyFeed/brief-personal`](https://github.com/HappyFeed/brief-personal) · **Stack:** TypeScript + Node (`node:http`, `fetch` nativo), Vitest, Playwright · **Feature:** *Noticias (fuente RSS)*, la primera skill del briefing diario: descarga feeds RSS, los combina y los sirve como HTML en `localhost:3000`.

Los cuatro puntos hablan de esa feature, cuyo spec vive en `docs/specs/2026-09-03-noticias-fuente-rss/`.

---

## 1. Subagente: `generate-tests`

Front matter de `.claude/agents/generate-tests.md`:

```yaml
---
name: generate-tests
description: >-
  Convierte el plan de tests e2e de un spec en specs de Playwright
  reales. Dado la carpeta de un spec (docs/specs/<slug>/) con
  e2e-tests-plan.md ya escrito, navega la app real corriendo en
  localhost:3000 vía Playwright MCP para anclar selectores y copys al
  DOM real, y escribe e2e/<feature>.spec.ts con un test() por cada uno
  de los 3 casos planeados. Es el ÚNICO componente autorizado a
  escribir bajo e2e/ — nunca toca src/, docs/ ni ningún archivo de
  configuración, y nunca "arregla" la app para que un test pase.
  Invocar como Paso 3 del loop verify-implementation, o directo con los
  hallazgos del healer pegados en el prompt para corregir tests
  puntuales diagnosticados como defectuosos.
tools: Read, Grep, Glob, Write, Edit, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_fill_form, mcp__playwright__browser_select_option, mcp__playwright__browser_press_key, mcp__playwright__browser_find, mcp__playwright__browser_wait_for, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_console_messages, mcp__playwright__browser_network_requests, mcp__playwright__browser_evaluate, mcp__playwright__browser_close
model: sonnet
---
```

**Contrato.** Qué recibe:

| Input | Valor real |
|---|---|
| `Spec folder` | `docs/specs/2026-09-03-noticias-fuente-rss/` |
| `Plan` | `docs/specs/2026-09-03-noticias-fuente-rss/e2e-tests-plan.md` |
| App corriendo | `http://localhost:3000` (la levanta el orquestador con `npm start`) |
| Hallazgos del healer | opcional; solo en vueltas correctivas |

Qué devuelve y escribe:
- Escribe un solo archivo, `e2e/noticias-fuente-rss.spec.ts`, con un `test()` por caso del plan.
- Devuelve un reporte de texto con formato fijo: `STATUS: WRITTEN | CORRECTED | BLOCKED`, `FILES`, `CASES` (caso → test → criterios → PASS/FAIL), `COMMANDS`, `GROUNDING`, `CONTRADICTIONS`, `SUSPECTED_CODE_DEFECTS` y `FINDINGS`.

**Por qué esas herramientas y ese modelo.** Usa el MCP de Playwright para anclar los selectores al DOM real en vez de inventarlos. `Write`/`Edit` quedan acotados por contrato a `e2e/`, y `Bash` solo corre `npx playwright test` y `npm run typecheck`. No tiene `Agent`, así que no puede delegar. Usa `sonnet` porque escribe código y razona sobre el DOM, pero trabaja con un plan ya decidido. El juicio más fino lo dejo en `opus` para `planner` y `task-verifier`, y lo mecánico en `haiku` para `tasks-writer`.

## 2. Skill: `verify-implementation`

`description` de `.claude/skills/verify-implementation/SKILL.md`:

> Corre el loop autónomo de verificación end-to-end de un spec una vez terminada su implementación: confirma que el spec está de verdad implementado (tareas Done, typecheck y tests unitarios en verde), después orquesta plan-test-cases → generate-tests → healer hasta que el suite e2e refleje el spec o el reporte no tenga defectos pendientes. Usar SIEMPRE que se acaba de terminar la implementación de un spec o el usuario quiere la feature verificada de punta a punta en el navegador […]

Esta es la línea del Paso 3 que lanza al subagente del punto 1, con los valores reales de esta feature:

```js
Agent({
  subagent_type: "generate-tests",
  description: "Generate e2e specs",
  prompt: "Spec folder: docs/specs/2026-09-03-noticias-fuente-rss/\nPlan: docs/specs/2026-09-03-noticias-fuente-rss/e2e-tests-plan.md\nLa app ya está arrancada y responde en http://localhost:3000. Escribí los specs de Playwright para los 3 casos planeados, bajo e2e/."
})
```

## 3. Spec: criterios EARS

Ruta: `docs/specs/2026-09-03-noticias-fuente-rss/requirements.md`, la misma carpeta que recibe el contrato del punto 1.

- **2.4.** IF la descarga de un feed falla (error de red o respuesta no exitosa) THEN THE SYSTEM SHALL loguear el error, tratar ese feed como una lista vacía de ítems, y continuar procesando el resto de los feeds configurados.
- **3.3.** THE SYSTEM SHALL limitar la lista combinada a los primeros N ítems, con N configurable y un valor por defecto de 15.
- **3.5.** IF la lista combinada de ítems está vacía THEN THE SYSTEM SHALL renderizar una página HTML que indique que no hay noticias disponibles, en vez de una página vacía o rota.

## 4. Estado y cierre

**En el spec.** El criterio 3.3 fija el valor por defecto de N en 15. En el código se refleja en `src/config.ts`:

```ts
export const MAX_ITEMS = 15
```

El caso e2e *"nunca muestra más ítems que el límite configurado (MAX_ITEMS)"* comprueba ese límite.

**En el archivo de progreso**, que es `tasks.md` del mismo spec. En este arnés reparto así: `requirements.md` y `design.md` dicen qué hay que construir y no cambian durante la ejecución. `tasks.md` registra cómo va: el estado de cada tarea (`[ ]`, `[~]`, `[x]`, `[!]`) y un *Decision log* que solo crece. Por ejemplo, T4:

```md
### T4 — `fetchAllFeeds`: combinación de múltiples feeds
- **Status:** `[x]`
- **Traces to:** 1.2 (parcial), 3.1 · design.md `src/sources/rss.ts` (`fetchAllFeeds`)
- **Depends on:** T3

**Decision log:**
- Implementación trivial: `Promise.all(urls.map(fetchFeed)).then(r => r.flat())`. La resiliencia
  por-feed ya la garantiza `fetchFeed` (T3), que nunca rechaza.
```

**Definition of Done.** Una tarea pasa a `[x]` cuando cumple dos condiciones:
1. `npm run typecheck && npm test` están en verde y `task-verifier` confirma que la tarea cumple lo que pide el spec, no solo que los tests pasan.
2. Al cerrarse la última tarea, `verify-implementation` corre `npm run test:e2e` hasta que `healer` dé veredicto `GREEN`.

Salida cruda de `npm test` (2026-09-24):

```
> brief-personal@0.0.1 test
> vitest run

 RUN  v2.1.9 C:/Users/HappyFeed/Documents/Yo/Code/brief-personal

 ✓ src/config.test.ts (3 tests) 2ms
 ✓ src/sources/rss.fetchAll.test.ts (2 tests) 4ms
 ✓ src/sources/rss.test.ts (6 tests) 4ms
 ✓ src/sources/rss.fetch.test.ts (6 tests) 5ms
 ✓ src/format/html.test.ts (7 tests) 20ms

 Test Files  5 passed (5)
      Tests  24 passed (24)
   Start at  11:28:33
   Duration  9.30s (transform 186ms, setup 0ms, collect 277ms, tests 35ms, environment 1ms, prepare 504ms)
```

Salida de `npm run test:e2e`, tomada de `e2e-tests-report.md` (veredicto del healer: **GREEN**):

```
npm run test:e2e → 6 passed / 0 failed
  6 passed (2.1s)
```
