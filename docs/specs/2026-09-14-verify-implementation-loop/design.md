# Design Document: Loop e2e autónomo (etapa "verificación")

## Overview

Implementa la etapa "verificación" de `CLAUDE.md` como 4 piezas nuevas
de `.claude/`: dos skills (`verify-implementation`, `plan-test-cases`)
y dos subagentes (`generate-tests`, `healer`), más dos ajustes chicos
(`\.claude/settings.json`, un párrafo en `CLAUDE.md`). Ver
`requirements.md` en esta misma carpeta para el detalle de cada
criterio — este documento cubre cómo se construye, no qué debe hacer.

## Architecture

```
.claude/
├── skills/
│   ├── verify-implementation/SKILL.md   (nuevo — orquestador)
│   └── plan-test-cases/SKILL.md         (nuevo)
├── agents/
│   ├── generate-tests.md                (nuevo)
│   ├── healer.md                        (nuevo)
│   └── task-verifier.md                 (existente, sin cambios — referenciado)
└── settings.json                        (nuevo — permisos de MCP de browser)

docs/specs/<slug>/
├── requirements.md / design.md / tasks.md   (existentes, solo lectura para este loop)
├── e2e-tests-plan.md                        (nuevo, escrito por plan-test-cases)
└── e2e-tests-report.md                      (nuevo, escrito por healer)

e2e/
├── briefing.spec.ts       (existente, sin tocar)
└── <feature>.spec.ts      (nuevo por spec, escrito por generate-tests)

CLAUDE.md                  (editado — un párrafo nuevo en "Workflow de trabajo")
```

Nada de esto toca `src/`. `verify-implementation` no es un dynamic
workflow (`Workflow` tool) — es una skill que corre en el contexto del
agente principal y orquesta a los otros tres componentes vía el `Agent`
tool (para los subagentes) y el `Skill` tool (para `plan-test-cases`),
igual que `specify` orquesta a `planning-tasks` hoy.

## Data Flow

```
tasks.md 100% [x] ──▶ verify-implementation (Paso 1: gate)
                          │ typecheck+test verdes, npm start arriba
                          ▼
                    plan-test-cases ──▶ e2e-tests-plan.md (3 casos)
                          │
                          ▼
                    generate-tests  ──▶ e2e/<feature>.spec.ts
                          │ (navega localhost:3000 vía Playwright MCP)
                          ▼
                    healer          ──▶ e2e-tests-report.md
                          │ (corre npm run test:e2e, reproduce en browser)
                          ▼
                 ┌────────┴─────────┬───────────────┬──────────────┐
              GREEN            TEST DEFECT      CODE DEFECT      BLOCKED
                 │                  │                 │              │
            fin, reporta      vuelve a            fin del loop,   relay al
            al usuario     generate-tests        vuelve a         usuario,
                            con findings,      ejecución (TDD)     fin
                            luego a healer      con el hallazgo
                            (máx. 3 vueltas)
```

Cada flecha de "escribe X" es de un único componente (Requirement 7);
el orquestador solo lee esos artefactos entre pasos, nunca los edita.

## Components / Interfaces

### `verify-implementation` (skill, `.claude/skills/verify-implementation/SKILL.md`)

- **Se dispara:** invocación explícita del usuario, o automáticamente
  cuando la última tarea de un `tasks.md` pasa a `[x]` Done durante la
  ejecución (Requirement 1).
- **Expone:** ningún archivo propio — orquesta llamadas a `Skill`
  (`plan-test-cases`) y `Agent` (`generate-tests`, `healer`), lee sus
  reportes de salida, y le habla al usuario en el chat.
- **Depende de:** `plan-test-cases`, `generate-tests`, `healer`,
  opcionalmente `task-verifier` (ya existente); comandos `npm run
  typecheck`, `npm test`, `npm start`, `curl`/fetch para el chequeo de
  salud del server.
- **Estado que gestiona:** el proceso de `npm start` en background
  (arrancar en el Paso 1, apagar al terminar el loop por cualquier
  salida — Requirement 2.5/2.6 y 6.8) y el contador de vueltas del
  ciclo `generate-tests → healer` (máximo 3, Requirement 6.6).

### `plan-test-cases` (skill, `.claude/skills/plan-test-cases/SKILL.md`)

- **Expone:** produce `docs/specs/<slug>/e2e-tests-plan.md`. Invocable
  también de forma directa por el usuario ("planea los casos e2e"),
  no solo desde el loop.
- **Depende de:** `requirements.md`, `design.md`, `tasks.md` (Decision
  log) del spec objetivo, y el código real de UI (`src/format/html.ts`,
  `src/server.ts`) para nombres de rutas/elementos reales.
- **Contrato de salida (mensaje final a quien lo invocó):** path del
  archivo escrito, nombres de los 3 casos, qué criterios cubre cada
  uno, y cualquier conflicto encontrado entre spec y código.

### `generate-tests` (subagente, `.claude/agents/generate-tests.md`)

- **Tools:** `Read, Grep, Glob, Write, Edit, Bash,
  mcp__playwright__browser_navigate, browser_snapshot, browser_click,
  browser_type, browser_fill_form, browser_select_option,
  browser_press_key, browser_find, browser_wait_for,
  browser_take_screenshot, browser_console_messages,
  browser_network_requests, browser_evaluate, browser_close`
- **Input:** carpeta del spec + path de `e2e-tests-plan.md`;
  opcionalmente, hallazgos de una corrida previa de `healer` sobre
  tests puntuales a corregir (modo corrección, Requirement 4.8).
- **Expone (escribe):** `e2e/<feature>.spec.ts`. Único componente con
  permiso de escritura ahí.
- **Depende de:** la app corriendo en `localhost:3000` (arrancada por
  el orquestador, no por este subagente), Playwright MCP para explorar
  el DOM real antes de escribir selectores.
- **Contrato de salida:** bloque estructurado `STATUS / FILES / CASES
  / COMMANDS / GROUNDING / CONTRADICTIONS / SUSPECTED_CODE_DEFECTS /
  FINDINGS` (ver Data Models).

### `healer` (subagente, `.claude/agents/healer.md`)

- **Tools:** mismo set de `mcp__playwright__*` que `generate-tests`,
  más `Read, Grep, Glob, Write, Edit, Bash`.
- **Input:** carpeta del spec (con `e2e-tests-plan.md` y `e2e/` ya
  poblados).
- **Expone (escribe):** exactamente `docs/specs/<slug>/e2e-tests-report.md`.
  `Write`/`Edit` están en su lista de tools solo para ese archivo — la
  restricción real a "un solo archivo" es una instrucción de skill, no
  algo forzable por el sistema de permisos, igual que la restricción de
  `generate-tests` a `e2e/`.
- **Depende de:** `npm run test:e2e` (Playwright test runner),
  Playwright MCP para reproducir fallos a mano, `requirements.md` para
  el contrato real de cada criterio.
- **Contrato de salida:** bloque estructurado `VERDICT / REPORT / RUN /
  CASES / TEST_FIXES / CODE_FIXES / FALSE_GREENS / NEXT` (ver Data
  Models).

### `.claude/settings.json` (nuevo archivo de configuración)

- **Expone:** `{"permissions": {"allow": ["mcp__playwright"], "deny":
  ["mcp__claude-in-chrome"]}}`.
- **Depende de:** nada — es config estática, versionada (a diferencia
  de `.claude/settings.local.json`, que ya existe y no se toca).

### `CLAUDE.md` (edición)

Un párrafo nuevo en "Workflow de trabajo", mismo estilo que el que ya
describe la etapa "spec (docs/)", documentando que "verificación" se
resuelve invocando `verify-implementation` y que se dispara sola al
completarse `tasks.md`.

## Data Models

**`e2e-tests-plan.md`** (uno por spec, en su carpeta):

```markdown
# E2E test plan — <feature>
## Preconditions
## Case 1 — <name> (happy path)
- Traces to / Objective / Preconditions / Steps / Expected result / Notes
## Case 2 — <name> (failure path)
## Case 3 — <name> (failure path)
## Criteria coverage        (tabla: criterio → caso → cómo se cubre)
## Not covered by this plan
```

**`e2e-tests-report.md`** (uno por spec, sobreescrito en cada corrida
de `healer`):

```markdown
# E2E test report — <feature>
## Verdict            (GREEN | TEST DEFECT | CODE DEFECT | BLOCKED)
## Run                (comando + salida real citada)
## Case by case        (por caso: Traces to, Observed, Expected,
                         Diagnosis, Reproduced manually, Recommended fix)
## False greens
## Blocked / not verifiable
## For the user
```

**Reporte final de `generate-tests`** (texto estructurado, no archivo,
va en el mensaje de retorno del `Agent` tool):

```
STATUS: WRITTEN | CORRECTED | BLOCKED
FILES: <paths bajo e2e/>
CASES: caso → test → criterios → resultado real
COMMANDS: npx playwright test <file> → resultado / npm run typecheck → resultado
GROUNDING: qué se verificó en el browser
CONTRADICTIONS / SUSPECTED_CODE_DEFECTS / FINDINGS
```

**Reporte final de `healer`** (texto estructurado, mensaje de retorno):

```
VERDICT: GREEN | TEST DEFECT | CODE DEFECT | BLOCKED
REPORT: <path a e2e-tests-report.md>
RUN: <n passed / n failed>
CASES: una fila por caso → PASS|FAIL → TEST DEFECT|CODE DEFECT|— → razón
TEST_FIXES / CODE_FIXES / FALSE_GREENS
NEXT: qué debería hacer el orquestador
```

Estos dos contratos de salida son la única "interfaz" entre
`verify-implementation` y sus subagentes — no hay tipos TypeScript
involucrados, es tooling de agentes, no código de `src/`.

## Error Handling

| Caso de error | Respuesta del sistema | Requirement |
|---|---|---|
| Tareas de `tasks.md` sin terminar | Loop se detiene antes del Paso 2, lista IDs pendientes | 2.1 |
| Usuario pide correr igual con tareas pendientes | Avisa qué criterios se esperan romper, continúa | 2.2 |
| `npm run typecheck` o `npm test` en rojo | Loop se detiene, muestra salida real, no genera tests e2e | 2.4 |
| App no responde en `:3000` tras `npm start` | Veredicto `BLOCKED`, loop se detiene | 2.6 |
| Criterios insuficientes para 3 casos reales | Caso(s) faltante(s) van a "Not covered by this plan" con motivo | 3.5 |
| `generate-tests` invocado sin `e2e-tests-plan.md` | Se detiene sin generar nada, lo reporta | 4.2 |
| DOM real contradice el plan (selector/copy) | DOM real gana para selector/copy, plan gana para qué se afirma; se reporta la contradicción | 4.5 |
| Suite e2e no arranca (server caído, falta algo) | `healer` reporta `BLOCKED`, no instala/arregla nada | 5.3 |
| Test falla | `healer` diagnostica TEST DEFECT o CODE DEFECT, reproduciendo a mano antes de acusar al código | 5.4 |
| Test pasa pero no ejercita su criterio | `healer` lo reporta como TEST DEFECT (false green) aunque esté en verde | 5.5 |
| Veredicto `CODE DEFECT` | Loop termina, hallazgo va al Decision log de la tarea, se vuelve a ejecución (TDD) | 6.3, 6.4 |
| Veredicto `BLOCKED` | Relay exacto al usuario de qué falta, loop se detiene | 6.5 |
| 3 vueltas sin `GREEN` | Loop se detiene, reporta qué sigue fallando y por qué no converge | 6.6 |
| Fix implica cambiar `requirements.md`/`design.md` | Loop se detiene y pregunta al usuario, no decide el cambio de spec | 6.7 |

## Testing Strategy

Esto es tooling de `.claude/` (skills/subagentes en Markdown), no
código de `src/` — no hay suite de Vitest que lo cubra. La validación
es un **dry-run manual del loop completo**, a correr durante la etapa
de ejecución de este mismo spec (como una tarea de `tasks.md`, no
ahora): invocar `verify-implementation` sobre
`docs/specs/2026-09-03-noticias-fuente-rss/` (spec ya 100% Done) y
confirmar que:

- el gate del Paso 1 pasa limpio (tareas Done, typecheck+test verdes,
  server arriba);
- `plan-test-cases` produce un `e2e-tests-plan.md` con 3 casos
  trazables a criterios reales de ese spec;
- `generate-tests` produce un `e2e/noticias-fuente-rss.spec.ts` que
  ejecuta sin errores de sintaxis/selector;
- `healer` corre `npm run test:e2e` y produce un veredicto con
  evidencia real (no necesariamente `GREEN` — un `CODE DEFECT` real
  encontrado sobre esa feature también cuenta como el loop funcionando
  correctamente);
- ningún componente escribió fuera de su archivo permitido (chequeo
  manual de `git diff --stat` al final de la corrida).

## Open Questions

Ninguna pendiente — el diseño quedó cerrado en brainstorming y en el
handoff a `specify`. Una decisión ya tomada y no a reabrir: el paso
"vuelve a ejecución" ante un `CODE DEFECT` no re-invoca automáticamente
un ciclo TDD — deja el mensaje y el hallazgo listos para que la
ejecución los retome (manual o vía la próxima instancia de trabajo
sobre `tasks.md`), igual que hoy `task-verifier` propone sin aplicar.
