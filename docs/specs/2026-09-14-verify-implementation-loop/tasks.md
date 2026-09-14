# Tasks: Loop e2e autónomo (etapa "verificación")

**Status:** Draft
**Date:** 2026-09-14
**Requirements:** ./requirements.md
**Design:** ./design.md

Implementa la etapa "verificación" del workflow del proyecto como 4
piezas nuevas de `.claude/` (dos skills, dos subagentes) más un ajuste
de permisos y un párrafo en `CLAUDE.md`. Es tooling de agentes, no
código de `src/` — no hay suite de Vitest que lo cubra (ver "Out of
Scope" de `requirements.md`); la validación es un dry-run manual del
loop completo, que es la última tarea de este plan.

## How to use this document

- Work tasks **one at a time, top to bottom**; don't start a task
  until its dependencies are `[x]`.
- Follow **TDD**: red → green → verify, per task. Para las tareas de
  este spec "red/green" se adapta a artefactos Markdown/JSON de
  `.claude/` (no hay test automatizado que falle primero): el paso
  "red" define el chequeo concreto — manual o vía invocación real del
  componente — que hoy no se cumple porque el archivo no existe o no
  hace lo que debería, y "verify" corre ese mismo chequeo contra el
  archivo ya escrito.
- Append to the **Decision log** as you go — every non-obvious choice,
  discovery, or deviation from `design.md`. Don't draft it upfront.
- If `design.md` or `requirements.md` turn out to be wrong or
  incomplete, update them and note it in the task's Decision log.

## Status legend

| Marker | Meaning |
|---|---|
| `[ ]` | Pending — not started |
| `[~]` | In progress |
| `[x]` | Done — tests pass, verified |
| `[!]` | Blocked — see Decision log |

## Task overview

- [x] **T1** — `.claude/settings.json`: permisos de MCP de browser
- [x] **T2** — Skill `plan-test-cases`
- [x] **T3** — Subagente `generate-tests`
- [x] **T4** — Subagente `healer`
- [x] **T5** — Skill orquestadora `verify-implementation`
- [x] **T6** — `CLAUDE.md`: párrafo de la etapa "verificación"
- [x] **T7** — Dry-run de validación del loop completo

## Requirements coverage

| Requirement criterion | Task(s) |
|---|---|
| 1.1 | T5 |
| 1.2 | T5, T6 |
| 1.3 | T5 |
| 1.4 | T5 |
| 2.1 | T5 |
| 2.2 | T5 |
| 2.3 | T5 |
| 2.4 | T5 |
| 2.5 | T5 |
| 2.6 | T5 |
| 3.1 | T5, T2 |
| 3.2 | T2 |
| 3.3 | T2 |
| 3.4 | T2 |
| 3.5 | T2 |
| 3.6 | T2 |
| 4.1 | T5, T3 |
| 4.2 | T3 |
| 4.3 | T3 |
| 4.4 | T3 |
| 4.5 | T3 |
| 4.6 | T3 |
| 4.7 | T3 |
| 4.8 | T3 |
| 5.1 | T5, T4 |
| 5.2 | T4 |
| 5.3 | T4 |
| 5.4 | T4 |
| 5.5 | T4 |
| 5.6 | T4 |
| 5.7 | T4 |
| 5.8 | T4 |
| 6.1 | T5 |
| 6.2 | T5 |
| 6.3 | T5 |
| 6.4 | T5 |
| 6.5 | T5 |
| 6.6 | T5 |
| 6.7 | T5 |
| 6.8 | T5 |
| 7.1 | T2, T3, T4 |
| 7.2 | T3, T4 |
| 7.3 | T1 |
| 7.4 | T5 |

---

## Tasks

### T1 — `.claude/settings.json`: permisos de MCP de browser

- **Status:** `[x]`
- **Traces to:** 7.3 · design.md Components/Interfaces → `.claude/settings.json`
- **Depends on:** none

**Objective:** Existe `.claude/settings.json` (nuevo, versionado —
distinto de `.claude/settings.local.json`) que permite `mcp__playwright`
y deniega explícitamente `mcp__claude-in-chrome`, para que ningún
componente del loop pueda usar la herramienta de browser equivocada.

**TDD plan:**

1. **Red:** confirmar que `.claude/settings.json` no existe todavía
   (`ls .claude/settings.json` falla) y que nada en el repo deniega hoy
   `mcp__claude-in-chrome`.
2. **Green:** crear `.claude/settings.json` con
   `{"permissions": {"allow": ["mcp__playwright"], "deny": ["mcp__claude-in-chrome"]}}`,
   sin tocar `.claude/settings.local.json`.
3. **Verify:** validar que el JSON parsea (p. ej.
   `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'))"`),
   confirmar que `.claude/settings.local.json` sigue intacto
   (`git diff --stat` no lo toca), y correr `npm run typecheck && npm
   test` como chequeo general de que el repo sigue sano.

**Decision log:**

- El plan original no contemplaba que `.gitignore` ignora todo
  `.claude/*` por defecto, con excepciones puntuales (`!.claude/agents`,
  `!.claude/workflows`, skills específicas). `.claude/settings.json`
  caía en el bloqueo general y quedaba sin versionar, contradiciendo el
  propio Objective de la tarea. Se agregó `!.claude/settings.json` a
  `.gitignore` como parte del Green de esta tarea (no era una tarea
  aparte: es necesario para que T1 cumpla lo que dice hacer).
- Hallazgo fuera de traza, resuelto con autorización explícita del
  usuario antes de seguir: `npm test` fallaba en la raíz del repo por
  un bug preexistente y no relacionado — `vitest.config.ts` excluía
  `e2e/**` pero no `.claude/worktrees/**`, así que Vitest intentaba
  correr `e2e/briefing.spec.ts` de un worktree existente
  (`project-status-review-76e5a5`) como test de Vitest y explotaba
  contra `test.describe()` de Playwright. Se agregó
  `.claude/worktrees/**` al `exclude` de `vitest.config.ts`. Relevante
  para este spec porque el gate de `verify-implementation`
  (Requirement 2.3/2.4) exige `npm test` en verde — sin este fix, el
  loop nunca habría podido arrancar sobre ningún spec.

**Outcome:** `.claude/settings.json` creado y versionado (con la
excepción de `.gitignore` que hacía falta agregar), con
`{"permissions": {"allow": ["mcp__playwright"], "deny":
["mcp__claude-in-chrome"]}}`. `.claude/settings.local.json` intacto.
`npm run typecheck && npm test` en verde (24 tests, 5 archivos) tras
también corregir el bug preexistente de `vitest.config.ts`. `git
status --porcelain` confirma que solo se tocaron `.gitignore`,
`vitest.config.ts` y la creación de `.claude/settings.json` (más la
carpeta de este spec, sin relación).

### T2 — Skill `plan-test-cases`

- **Status:** `[x]`
- **Traces to:** 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.1 · design.md Components/Interfaces → `plan-test-cases`, Data Models → `e2e-tests-plan.md`
- **Depends on:** none

**Objective:** Existe `.claude/skills/plan-test-cases/SKILL.md`,
invocable directamente por el usuario o desde el loop, que produce
`docs/specs/<slug>/e2e-tests-plan.md` con exactamente 3 casos (1 happy
path + 2 failure paths) trazados a criterios reales de
`requirements.md`, reusa el plan si el spec no cambió, documenta huecos
en "Not covered by this plan" en vez de inventar criterios, y restringe
su propia escritura a ese único archivo.

**TDD plan:**

1. **Red:** confirmar que `.claude/skills/plan-test-cases/` no existe
   todavía, y que no hay ningún `e2e-tests-plan.md` bajo
   `docs/specs/*/`.
2. **Green:** escribir `SKILL.md` con el contrato de entrada (carpeta
   del spec), el contrato de salida (path + nombres de casos + criterios
   cubiertos + conflictos, per design.md), la estructura exacta de
   `e2e-tests-plan.md` (Data Models), la regla de reuso (3.4) y la
   restricción de escritura (7.1).
3. **Verify:** invocar la skill (vía `Skill` tool) sobre un spec real ya
   `[x]` Done, p. ej. `docs/specs/2026-09-03-noticias-fuente-rss/`;
   confirmar que escribe `e2e-tests-plan.md` con 3 casos trazables a
   criterios reales de ese spec; volver a invocarla sin cambios en el
   spec y confirmar que reusa el plan existente en vez de regenerarlo;
   confirmar con `git status`/`git diff --stat` que no tocó ningún otro
   archivo (`requirements.md`, `design.md`, `tasks.md`, `e2e/`, `src/`).

**Decision log:**

- El `Skill` tool no recarga en caliente skills creadas en la misma
  sesión — quedó disponible recién un rato después de crear el
  archivo (confirmado por un system-reminder posterior a esta
  sesión, no por un reinicio). Documentado para las tareas
  siguientes: puede hacer falta esperar/reintentar, no asumir que una
  skill/agente recién creado está disponible al toque.
- Mismo hallazgo que T1: `.claude/skills/plan-test-cases` cae bajo el
  bloqueo `.claude/skills/*` de `.gitignore`. Se agregó la excepción
  correspondiente (y de paso la de `verify-implementation`, que va a
  hacer falta en T5, para no repetir el hallazgo) como parte del Green
  de esta tarea.
- Al escribir el plan de tests real para `noticias-fuente-rss` (parte
  del Verify), la arquitectura de esa feature (fetch de RSS server-side
  una sola vez al arrancar el proceso, sin variables de entorno para
  override) hizo que 5 de los 7 criterios de esa feature (1.2, 2.3,
  2.4, 2.5, 3.5) no fueran forzables de forma determinística vía e2e
  — quedaron documentados en "Not covered by this plan" del propio
  `e2e-tests-plan.md` generado, con la razón arquitectónica concreta.
  El plan igual completó los 3 casos exigidos usando 2.2 (saneamiento
  de HTML/entidades crudas) y 3.3 (límite de ítems) como
  failure/degrade paths determinísticos y reales, en vez de forzar
  casos flaky contra los feeds en vivo. Esto confirma que el diseño de
  la skill (permitir documentar huecos en vez de inventar cobertura)
  era necesario, no solo teórico.

**Outcome:** `.claude/skills/plan-test-cases/SKILL.md` escrito y
versionado. Invocada dos veces vía `Skill` tool sobre
`docs/specs/2026-09-03-noticias-fuente-rss/`: la primera generó
`e2e-tests-plan.md` con 3 casos (1 happy path, 2 failure/degrade paths)
trazados a criterios reales, más una tabla de coverage y una sección
"Not covered" justificada; la segunda confirmó la regla de reuso (no
regeneró porque `requirements.md`/`design.md` no cambiaron desde la
última generación). `git status --porcelain` confirma que ninguna
invocación tocó otro archivo del spec objetivo (`requirements.md`,
`design.md`, `tasks.md`) ni `e2e/` ni `src/`.

### T3 — Subagente `generate-tests`

- **Status:** `[x]`
- **Traces to:** 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 7.1, 7.2 · design.md Components/Interfaces → `generate-tests`, Data Models → contrato de salida de `generate-tests`
- **Depends on:** none

**Objective:** Existe `.claude/agents/generate-tests.md` con el set de
tools de Playwright MCP + `Read/Grep/Glob/Write/Edit/Bash` del design,
que — dada la carpeta de un spec y su `e2e-tests-plan.md` — navega la
app real en `localhost:3000` para confirmar selectores/copys, escribe
`e2e/<feature>.spec.ts` con un `test()` por caso planeado (en el mismo
orden, con comentario de caso+criterios), corre
`npx playwright test e2e/<feature>.spec.ts` y `npm run typecheck`, y
sabe operar en modo corrección (dado findings de `healer`) tocando solo
los tests señalados.

**TDD plan:**

1. **Red:** confirmar que `.claude/agents/generate-tests.md` no existe
   todavía, y que no hay ningún `e2e/<feature>.spec.ts` generado por
   este loop bajo `e2e/`.
2. **Green:** escribir el agente con su frontmatter (`tools:` exacto
   del design), el contrato de entrada (carpeta + plan, o carpeta +
   findings de `healer` en modo corrección), el comportamiento ante
   plan ausente (4.2, se detiene sin generar nada), la prioridad
   "DOM real gana el selector/copy, el plan gana la aserción de
   comportamiento" (4.5), la restricción de escritura a `e2e/` (7.1),
   y el bloque de salida `STATUS/FILES/CASES/COMMANDS/GROUNDING/
   CONTRADICTIONS/SUSPECTED_CODE_DEFECTS/FINDINGS`.
3. **Verify:** con la app arrancada (`npm start`) y un
   `e2e-tests-plan.md` real disponible (el que dejó T2 para
   `noticias-fuente-rss`, o uno nuevo escrito a mano siguiendo la
   estructura de Data Models — no hace falta que T2 esté `[x]` Done
   para esto: esa prosa es barata de reproducir leyendo
   `requirements.md` y el código real de UI, sin necesitar navegación
   real del browser), invocar el subagente directamente; confirmar que
   escribe `e2e/noticias-fuente-rss.spec.ts` con 3 `test()` en el orden
   del plan, que corre y reporta el resultado real de
   `npx playwright test` y `npm run typecheck` en su mensaje de salida,
   y que `git diff --stat` no muestra cambios fuera de `e2e/`. Por
   separado, para 4.2: invocar el subagente sobre una carpeta de spec
   sin `e2e-tests-plan.md` (o apuntando a un path inexistente) y
   confirmar que se detiene sin escribir nada bajo `e2e/` y lo reporta
   explícitamente — este chequeo prueba justamente la *ausencia* del
   plan, así que tampoco depende de que T2 exista.

**Decision log:**

- Green completo: `.claude/agents/generate-tests.md` escrito con el
  frontmatter, contrato de entrada/salida y reglas exactas del design
  (incluido el set curado de tools `mcp__playwright__*`, sin
  `browser_run_code_unsafe` ni manejo de tabs/diálogos).
- Verify bloqueado, a diferencia de T2: a diferencia del `Skill` tool
  (que terminó recargando el registro solo, sin reinicio, durante la
  ejecución de T2), el `Agent` tool sigue sin reconocer `generate-tests`
  como `subagent_type` disponible dos intentos seguidos ("Agent type
  'generate-tests' not found"). Con autorización explícita del usuario
  (decisión tomada antes de T2: "escribir todo, verificar después"), no
  se fuerza una simulación manual escribiendo el spec de `e2e/` como el
  agente principal — eso violaría el principio de "un solo escritor por
  artefacto" del propio design (solo `generate-tests` puede escribir
  bajo `e2e/`). Queda pendiente reintentar la invocación real después
  de reiniciar la sesión.
- Para esa verificación pendiente, `npm start` quedó corriendo en
  background (confirmado con `curl` devolviendo 200 en
  `http://localhost:3000/` en una invocación de Bash aparte, así que
  sobrevive independiente del comando que lo arrancó) — puede reusarse
  al retomar, o volver a arrancarse si para acá.

- El bloqueo del `Agent` tool se resolvió solo, sin reiniciar la
  sesión: un system-reminder posterior anunció `generate-tests` y
  `healer` como agent types recién disponibles, y la siguiente
  invocación funcionó. Mismo patrón de refresh tardío que ya se vio
  con el `Skill` tool en T2/T5, esta vez tardando bastante más.

**Outcome:** `.claude/agents/generate-tests.md` escrito y versionado.
Invocado vía `Agent` tool sobre `docs/specs/2026-09-03-noticias-fuente-rss/`
con la app real corriendo: navegó `localhost:3000` vía Playwright MCP,
escribió `e2e/noticias-fuente-rss.spec.ts` con los 3 tests del plan
(uno por caso, cada uno con comentario de trazabilidad), corrió
`npx playwright test` (3 passed) y `npm run typecheck` (limpio) en esa
misma invocación. `git status --porcelain` confirma que el único
archivo tocado fue el spec nuevo bajo `e2e/` — nada en `src/`, `docs/`
ni el resto de `e2e/`.

### T4 — Subagente `healer`

- **Status:** `[x]`
- **Traces to:** 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 7.1, 7.2 · design.md Components/Interfaces → `healer`, Data Models → `e2e-tests-report.md` y contrato de salida de `healer`
- **Depends on:** T3

**Objective:** Existe `.claude/agents/healer.md` que — dada la carpeta
de un spec con `e2e-tests-plan.md` y `e2e/` ya poblados — corre `npm
run test:e2e` en esa misma invocación, diagnostica cada caso como
`TEST DEFECT` o `CODE DEFECT` reproduciendo a mano vía Playwright MCP
antes de acusar al código, detecta false greens en tests que pasan sin
ejercitar su criterio, escribe exactamente
`docs/specs/<slug>/e2e-tests-report.md` con veredicto global + salida
real + desglose caso por caso, y nunca edita tests directamente (deja
recomendaciones para que `generate-tests` las aplique).

**TDD plan:**

1. **Red:** confirmar que `.claude/agents/healer.md` no existe todavía,
   y que no hay ningún `e2e-tests-report.md` bajo `docs/specs/*/`.
2. **Green:** escribir el agente con su frontmatter (mismo set
   `mcp__playwright__*` que `generate-tests` más
   `Read/Grep/Glob/Write/Edit/Bash`), la lógica de diagnóstico (5.4,
   5.5), el caso `BLOCKED` sin instalar/arreglar nada (5.3), la
   restricción de escritura a un único archivo (5.6, 7.1), y el bloque
   de salida `VERDICT/REPORT/RUN/CASES/TEST_FIXES/CODE_FIXES/
   FALSE_GREENS/NEXT`.
3. **Verify:** con T3 ya `[x]` Done — lo que, per su propio paso
   Verify, deja `e2e/noticias-fuente-rss.spec.ts` en el repo — y la app
   arrancada, invocar el subagente directamente sobre ese archivo; si
   por algún motivo el archivo no está disponible al llegar a este
   punto (se borró, el spec cambió), volver a invocar al subagente de
   T3 para regenerarlo antes de seguir, en vez de escribir un fixture a
   mano. Confirmar que `healer` corre `npm run test:e2e` en esa
   invocación (no una corrida vieja), que escribe
   `docs/specs/2026-09-03-noticias-fuente-rss/e2e-tests-report.md` con
   un veredicto real (`GREEN`, `TEST DEFECT`, `CODE DEFECT` o
   `BLOCKED`, con evidencia citada), y que `git diff --stat` no muestra
   ediciones bajo `e2e/`, `src/`, `requirements.md`, `design.md` ni
   `tasks.md`.

**Decision log:**

- Green completo: `.claude/agents/healer.md` escrito con el
  frontmatter, la lógica de diagnóstico TEST DEFECT/CODE DEFECT, el
  caso BLOCKED, la restricción de escritura a un único archivo y el
  bloque de salida del design.
- Verify bloqueado por el mismo motivo que T3 (confirmado de nuevo acá
  con un chequeo dedicado: `Agent type 'healer' not found`, mismo
  listado de agentes disponibles que antes). No se fuerza simulación
  manual por la misma razón que T3 (un solo escritor por artefacto —
  acá, el reporte). Queda pendiente para después de reiniciar la
  sesión, junto con T3.

- El bloqueo del `Agent` tool se resolvió al mismo tiempo que el de
  T3 (mismo aviso de registro). `healer` corrió sobre el spec real
  inmediatamente después de `generate-tests`.

**Outcome:** `.claude/agents/healer.md` escrito y versionado. Invocado
vía `Agent` tool sobre `docs/specs/2026-09-03-noticias-fuente-rss/`
con `e2e-tests-plan.md` y `e2e/noticias-fuente-rss.spec.ts` ya
existentes: corrió `npm run test:e2e` en esa invocación (6 passed / 0
failed, suite completo), diagnosticó los 3 casos, y encontró un
**TEST DEFECT** real (false green) en Case 1 — pasa sin afirmar el
orden por fecha (3.2) ni la fecha visible (parte de 3.4), aunque
verificó a mano que la app sí cumple ambos. Escribió
`docs/specs/2026-09-03-noticias-fuente-rss/e2e-tests-report.md` con
veredicto, evidencia y el fix recomendado para `generate-tests`.
`git status --porcelain` confirma que no tocó `e2e/`, `src/` ni ningún
documento del spec — solo el reporte. Esto verifica el caso más
importante del design: el healer diagnostica sin arreglar, y distingue
test defect de code defect con evidencia real, no solo en la teoría.

### T5 — Skill orquestadora `verify-implementation`

- **Status:** `[x]`
- **Traces to:** 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 4.1, 5.1, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.4 · design.md Components/Interfaces → `verify-implementation`, Data Flow
- **Depends on:** T2, T3, T4

**Objective:** Existe `.claude/skills/verify-implementation/SKILL.md`
que resuelve el spec objetivo (nombrado, único bajo `docs/specs/`, o
preguntando si hay ambigüedad), corre el gate de implementación
completa (tareas Done, `npm run typecheck && npm test` en verde,
`npm start` respondiendo en `localhost:3000`, apagándolo siempre al
terminar por cualquier motivo), invoca en orden `plan-test-cases` →
`generate-tests` → `healer`, enruta según el veredicto de `healer`
(`GREEN` termina y reporta los 3 artefactos; `TEST DEFECT` reintenta
`generate-tests`→`healer` hasta 3 vueltas; `CODE DEFECT` detiene el
loop y deja el hallazgo para el Decision log de la tarea en
`tasks.md`; `BLOCKED` relaya el motivo exacto al usuario), y nunca
corre dos piezas del loop en paralelo sobre el mismo spec.

**TDD plan:**

1. **Red:** confirmar que `.claude/skills/verify-implementation/` no
   existe todavía, y que hoy no hay ningún mecanismo que dispare
   `plan-test-cases`/`generate-tests`/`healer` en secuencia.
2. **Green:** escribir el `SKILL.md` con: resolución del spec objetivo
   (1.1-1.4), el gate en orden (tareas → typecheck/test → `npm start` +
   health check, con sus `BLOCKED`/detenciones — 2.1-2.6), la
   invocación secuencial de los tres componentes (3.1, 4.1, 5.1), la
   máquina de estados de enrutamiento por veredicto con el contador de
   vueltas (6.1-6.8), y la instrucción explícita de no correr dos
   piezas en paralelo sobre el mismo spec (7.4).
3. **Verify:** disparar la skill manualmente sobre un spec con tareas
   pendientes y confirmar que se detiene en el gate listando los IDs
   pendientes (2.1) sin invocar `plan-test-cases`; luego, sobre un spec
   `[x]` Done real (`noticias-fuente-rss`), confirmar que el gate pasa,
   que arranca y después apaga `npm start`, y que orquesta correctamente
   la llamada a `plan-test-cases` → `generate-tests` → `healer` en ese
   orden (validación completa del recorrido feliz queda formalizada en
   T7).

**Decision log:**

- Green completo: `.claude/skills/verify-implementation/SKILL.md`
  escrito con resolución del spec, el gate en orden exacto (tareas →
  typecheck/test → `npm start` + health check), la invocación
  secuencial de los tres componentes, la máquina de estados de
  enrutamiento con el contador de 3 vueltas, y el apagado del server al
  terminar por cualquier motivo.
- Los dos primeros intentos de invocar la skill vía `Skill` tool
  devolvieron `Unknown skill: verify-implementation`; un tercer
  intento, un rato después, sí la reconoció — mismo patrón de refresh
  tardío que ya se vio con `plan-test-cases` en T2.
- Con la skill disponible, se probó el Paso 1 (gate) contra este mismo
  spec (`2026-09-14-verify-implementation-loop`), que en ese momento
  tenía T3/T4/T5 en `[~]` y T6/T7 en `[ ]`: el gate se detuvo
  correctamente antes de invocar `plan-test-cases`, listando las 5
  tareas no-Done, y sin correr `npm run typecheck`/`npm test` ni tocar
  `npm start` — exactamente el comportamiento que pide Requirement 2.1
  del spec. Esto verifica la parte del gate que no depende de
  `generate-tests`/`healer`.
- Queda pendiente el recorrido feliz completo (gate pasando sobre un
  spec `[x]` Done real, arrancando/apagando `npm start`, orquestando
  `plan-test-cases` → `generate-tests` → `healer` en secuencia) porque
  todavía depende de que `generate-tests`/`healer` estén registrados
  como `subagent_type` válidos del `Agent` tool (T3/T4) — bloqueado
  hasta reiniciar la sesión, formalizado en T7.

- Con `generate-tests`/`healer` ya disponibles (T3/T4), se corrió el
  recorrido feliz completo sobre `docs/specs/2026-09-03-noticias-fuente-rss/`:
  gate pasó limpio (6/6 tareas Done, typecheck+test verdes, app
  arrancada y respondiendo); `plan-test-cases` reusó el plan existente
  (regla de reuso, sin regenerar); se detectó el `TEST DEFECT`
  pendiente de la corrida anterior de `healer` y se siguió el Paso 5
  tal cual: re-lanzar `generate-tests` con los findings, y volver a
  `healer` — que esta vez devolvió `GREEN`. Al terminar, se apagó el
  proceso de `npm start` (confirmado con una request real fallando
  después). Este mismo recorrido es el dry-run que exige T7 — se
  documenta ahí en detalle, no se duplica acá.

**Outcome:** `.claude/skills/verify-implementation/SKILL.md` escrito y
versionado. Verify completo: el gate se probó primero de forma aislada
(frena con tareas pendientes) y después se corrió el recorrido feliz
de punta a punta sobre un spec real, incluyendo una vuelta completa de
`TEST DEFECT` → corrección → `GREEN`, y el apagado del server al
terminar. Sin desvíos del design.

### T6 — `CLAUDE.md`: párrafo de la etapa "verificación"

- **Status:** `[x]`
- **Traces to:** 1.2 · design.md Components/Interfaces → `CLAUDE.md (edición)`
- **Depends on:** T5

**Objective:** `CLAUDE.md`, sección "Workflow de trabajo", documenta —
mismo estilo que el párrafo existente sobre "spec (docs/)" — que la
etapa "verificación" se resuelve invocando la skill
`verify-implementation`, y que se dispara sola cuando la última tarea
de un `tasks.md` pasa a `[x]` Done durante la ejecución.

**TDD plan:**

1. **Red:** confirmar en `CLAUDE.md` que la etapa "verificación" sigue
   sin definir en la sección "Workflow de trabajo" (hoy solo describe
   "spec (docs/)" en detalle).
2. **Green:** agregar el párrafo nuevo, sin tocar el resto del
   documento (ni la sección "Reglas", ni "Comandos de verificación").
3. **Verify:** releer `CLAUDE.md` completo y confirmar que el párrafo
   nuevo es consistente con el resto del documento (mismo tono, no
   contradice "Una skill a la vez" ni el resto del workflow), y que
   `git diff --stat` solo muestra `CLAUDE.md`.

**Decision log:**

- `T6` se hizo aunque `T5` formalmente sigue `[~]` (no `[x]`), porque lo
  que `T6` necesita de `T5` — que la skill `verify-implementation`
  exista con ese nombre exacto — ya es cierto; lo que falta de `T5` es
  su Verify de recorrido feliz, que no cambia el contenido de este
  párrafo. Juicio explícito, no un salteo silencioso de la regla de
  dependencias.
- El `git diff --stat` general de la sesión incluye `.gitignore` y
  `vitest.config.ts` (cambios de T1, todavía sin commitear porque el
  spec no commitea por tarea) además de `CLAUDE.md` — el diff de esta
  tarea puntual, aislado, es exclusivamente el párrafo agregado a
  `CLAUDE.md` (confirmado con `git diff CLAUDE.md`).

**Outcome:** párrafo agregado a la sección "Workflow de trabajo" de
`CLAUDE.md`, mismo estilo que el existente sobre "spec (docs/)".
`npm run typecheck && npm test` siguen en verde (24 tests). El diff de
esta tarea, aislado, toca solo `CLAUDE.md`.

### T7 — Dry-run de validación del loop completo

- **Status:** `[x]`
- **Traces to:** design.md Testing Strategy
- **Depends on:** T2, T3, T4, T5

**Objective:** Queda documentada una corrida real y completa de
`verify-implementation` sobre `docs/specs/2026-09-03-noticias-fuente-rss/`
(spec ya `[x]` Done) que confirma, con evidencia citada: el gate del
Paso 1 pasa limpio; `plan-test-cases` produce un `e2e-tests-plan.md`
con 3 casos trazables; `generate-tests` produce un
`e2e/noticias-fuente-rss.spec.ts` que corre sin errores de
sintaxis/selector; `healer` corre `npm run test:e2e` y emite un
veredicto con evidencia real (no hace falta que sea `GREEN` — un `CODE
DEFECT` real también cuenta como el loop funcionando); y ningún
componente escribió fuera de su archivo permitido.

**TDD plan:**

1. **Red:** hoy no existe ninguna corrida documentada del loop
   completo — es la única forma de validar esta feature, per "Out of
   Scope" de `requirements.md` (no hay suite de Vitest para este
   tooling).
2. **Green (ejecutar el dry-run):** invocar `verify-implementation`
   sobre `docs/specs/2026-09-03-noticias-fuente-rss/` de punta a
   punta, dejando correr el loop (incluyendo reintentos si el
   veredicto no es `GREEN` en la primera vuelta) hasta que termine por
   `GREEN`, tope de 3 vueltas, `BLOCKED` o `CODE DEFECT`.
3. **Verify:** confirmar con `git diff --stat` (o `git status`) al
   final de la corrida que solo se tocaron los archivos esperados
   (`e2e-tests-plan.md`, `e2e/noticias-fuente-rss.spec.ts`,
   `e2e-tests-report.md` bajo esa carpeta de spec) y ningún archivo de
   `src/`, `requirements.md`, `design.md`, `tasks.md` de ese spec ni de
   este; registrar el resultado real (veredicto final, número de
   vueltas, hallazgos) en el Decision log de esta tarea.

**Decision log:**

- Corrida real y completa de `verify-implementation` sobre
  `docs/specs/2026-09-03-noticias-fuente-rss/`, ejecutada como parte
  del Verify de T5 (no se duplicó ahí, se documenta acá con el
  detalle completo que pide esta tarea):
  1. **Gate (Paso 1):** 6/6 tareas `[x]` Done; `npm run typecheck &&
     npm test` en verde (24 tests); `npm start` arrancado en
     background y confirmado con `curl` → `200` antes de seguir.
  2. **Paso 2 (`plan-test-cases`):** reusó `e2e-tests-plan.md`
     existente (mtime del plan posterior al de `requirements.md`/
     `design.md` — no regeneró).
  3. **Paso 3 (`generate-tests`):** ya había corrido antes de esta
     corrida puntual del loop (dejó `e2e/noticias-fuente-rss.spec.ts`,
     3 tests); se detectó el `TEST DEFECT` pendiente de una corrida
     previa del healer y, siguiendo el Paso 5, se re-invocó en **modo
     corrección** con los findings pegados — corrigió únicamente Case
     1 (agregó aserción de orden por fecha + fecha visible), dejó Case
     2/3 intactos, confirmó `npx playwright test` (3 passed) y `npm
     run typecheck` limpio.
  4. **Paso 4 (`healer`):** primera corrida → `TEST DEFECT` (false
     green en Case 1, sin code defect — verificado a mano); segunda
     corrida (tras la corrección) → **`GREEN`**, 6/6 tests del suite
     completo, sin false greens.
  5. **Paso 5 (enrutamiento):** `TEST DEFECT` → re-`generate-tests` →
     `healer` (1 vuelta, dentro del tope de 3) → `GREEN` → fin del
     loop.
  6. **Apagado del server:** `Get-NetTCPConnection -LocalPort 3000` +
     `Stop-Process`, confirmado con un request fallido después.
  - Ningún componente escribió fuera de su archivo permitido en
    ningún momento de la corrida: `plan-test-cases` no tocó nada (solo
    reusó), `generate-tests` tocó únicamente
    `e2e/noticias-fuente-rss.spec.ts` (las dos veces), `healer` tocó
    únicamente `e2e-tests-report.md` (las dos veces) — confirmado con
    `git status --porcelain` acotado a `e2e/`, `src/`,
    `requirements.md`, `design.md`, `tasks.md` después de cada
    invocación.
  - Hallazgo no bloqueante que dejó `healer` para el usuario, sin
    relación con este spec ni con ningún criterio evaluado: el footer
    de `noticias-fuente-rss` dice "se genera de nuevo en cada visita",
    lo cual contradice el comportamiento real documentado en su propio
    `design.md` (generación única al arrancar). No se tocó — es una
    decisión de `/specify` sobre ese spec, no de este loop.

**Outcome:** Loop completo validado de punta a punta contra un spec
real, incluyendo el caso más importante del design (un ciclo completo
`TEST DEFECT` → corrección dirigida → `GREEN`, sin que el orquestador
ni ningún subagente tocara un archivo fuera de su alcance permitido).
Los tres artefactos quedaron en el repo como evidencia:
`docs/specs/2026-09-03-noticias-fuente-rss/e2e-tests-plan.md`,
`e2e/noticias-fuente-rss.spec.ts`, y
`docs/specs/2026-09-03-noticias-fuente-rss/e2e-tests-report.md`
(veredicto `GREEN`). El spec `2026-09-14-verify-implementation-loop`
queda con las 7 tareas `[x]` Done.

---

## Open items

- Este bootstrap deja las 7 tareas con tamaño y traza razonables a
  partir de `design.md`, pero — como todo bootstrap — no es la versión
  final: conviene iterarlas una por una (modo tarea única), empezando
  por **T1**, para pulir detalles de tamaño/dependencia una vez que
  cada una se mira con más profundidad.
- La pregunta "¿necesita T3 depender de T2 en los hechos?" quedó
  resuelta en su iteración de tarea única: se mantiene `Depends on:
  none`. Razón (reconfirmada incluso contra el gap que dejó T4 —
  ¿4.2 fuerza la dependencia dura?, no): un `e2e-tests-plan.md` es
  prosa Markdown barata de reproducir a mano (lectura de
  `requirements.md` + código de UI, sin navegación real del browser),
  a diferencia del `e2e/<feature>.spec.ts` que necesita T4 — ese sí
  requiere grounding contra el DOM real, que es exactamente el trabajo
  que hace `generate-tests`, así que fingirlo ahí sí duplicaría la
  tarea bajo prueba. Además, el propio criterio 4.2 (plan ausente →
  `generate-tests` se detiene) se prueba mejor *sin* ningún plan, real
  o falso, con lo cual no aporta argumento a favor de la dependencia
  dura; el paso Verify de T3 ahora ejercita ese caso explícitamente.
- La misma pregunta se cerró también para **T2** en su propia
  iteración de tarea única: se mantiene `Depends on: none`. Razón: a
  diferencia de `generate-tests`/`healer`, `plan-test-cases` no usa
  Playwright MCP en absoluto — según design.md (Components/Interfaces),
  sus únicas dependencias son `requirements.md`, `design.md`,
  `tasks.md` (Decision log) y el código real de UI
  (`src/format/html.ts`, `src/server.ts`) del spec objetivo que este
  loop verifica, no de ninguna tarea de este mismo `tasks.md` — son
  artefactos ya existentes de specs externos (p. ej.
  `noticias-fuente-rss`), igual que para T3 con su reproducción
  "barata" del plan. Por el mismo motivo, T1 (permisos de
  `mcp__playwright`/`mcp__claude-in-chrome`) tampoco aplica como
  dependencia dura: T2 no toca ninguna tool de browser, a diferencia de
  T3/T4. Con esto, T1 y T2 quedan confirmados como los dos primeros
  eslabones del plan sin dependencias duras entre sí ni con ninguna
  otra tarea.
- El gap que dejó la iteración de T5 — ¿T3 (`generate-tests`) y T4
  (`healer`) deberían declarar `Depends on: T1` porque ambas usan tools
  `mcp__playwright__*`? — quedó cerrado en esta iteración de tarea
  única: **no, T1 no es prerequisito funcional de T3 ni de T4**, y
  ninguna de las dos cambia su `Depends on`. Verificado contra el
  estado real del repo, no solo contra `design.md`: `.mcp.json` ya
  registra el servidor `playwright` (`npx @playwright/mcp@latest`) hoy,
  y `.claude/settings.local.json` (ya existente, no tocado por este
  spec) tiene `"enableAllProjectMcpServers": true`, así que
  `mcp__playwright__*` ya está disponible para cualquier subagente que
  lo liste en su propio `tools:` — con independencia de si
  `.claude/settings.json` existe. Lo único que agrega T1 es (a) un
  `allow` explícito de `mcp__playwright` — redundante con lo que ya
  habilita `enableAllProjectMcpServers`, no algo que "prenda" la tool
  por primera vez — y (b) el `deny` explícito de `mcp__claude-in-chrome`,
  que no aparece registrado en ningún `.mcp.json` del repo (es una
  integración externa al proyecto): un guardrail contra usar la tool
  equivocada, no un prerequisito para que la correcta funcione. Los
  pasos Verify de T3 y T4 invocan al subagente correspondiente de forma
  directa y manual (quien ejecuta la tarea puede aprobar a mano
  cualquier prompt de permiso puntual que aparezca), así que tampoco
  hay un bloqueo de ejecución real sin T1. Distinto es el caso de T5,
  donde `verify-implementation` puede dispararse solo al completarse
  `tasks.md` durante la etapa de ejecución (Requirement 1.2) — ahí sí
  podría valer la pena revisar si el disparo automático sin supervisión
  necesita el `allow` explícito de T1 para no frenarse en un prompt de
  permiso; queda como candidata a evaluar en la próxima iteración de
  tarea única de T5, no se resuelve acá.
- La iteración de tarea única de **T7** revisó su propio `Depends on`
  con el mismo criterio de necesidad funcional: se sacaron **T1** y
  **T6** de la lista (quedó `Depends on: T2, T3, T4, T5`). Razón para
  T1: el dry-run de T7 es una invocación manual y explícita de
  `verify-implementation` (Requirement 1.1) — no ejercita el disparo
  automático de Requirement 1.2, que es el único escenario donde el
  `allow` explícito de T1 podría importar (open item de T5, arriba, no
  aplica acá); y, como ya se estableció para T3/T4, `mcp__playwright__*`
  ya está disponible hoy vía `enableAllProjectMcpServers: true` en
  `.claude/settings.local.json` con independencia de `.claude/settings.json`,
  y `generate-tests`/`healer` solo pueden usar las tools que su propio
  frontmatter declara (no incluye `claude-in-chrome`), así que el
  `deny` de T1 no es necesario para que el dry-run corra correctamente.
  Razón para T6: es un párrafo nuevo en `CLAUDE.md` (documentación),
  sin ningún efecto sobre el comportamiento de `verify-implementation`
  ni de los subagentes que T7 ejercita — no hace falta que exista para
  que la corrida sea válida. El resto de T7 (traza a design.md Testing
  Strategy, tamaño de una sola corrida atómica con sus reintentos
  internos ya acotados por el propio diseño del loop, y necesidad — no
  hay ningún artefacto de la corrida todavía en el repo) se confirmó
  sin cambios.
