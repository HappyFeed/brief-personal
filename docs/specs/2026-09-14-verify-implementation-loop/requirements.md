# Requirements Document: Loop e2e autónomo (etapa "verificación")

## Introduction

Esta feature implementa la etapa "verificación" del workflow del
proyecto (`CLAUDE.md`: brainstorming → definición → spec (docs/) →
ejecución (TDD) → **verificación** → commit), hoy sin definir. Es un
loop autónomo de 4 piezas nuevas — dos skills (`verify-implementation`,
`plan-test-cases`) y dos subagentes (`generate-tests`, `healer`) — que
se dispara cuando la implementación de un spec ya pasó por TDD y hay
que confirmar, contra el navegador real, que el comportamiento
observable coincide con lo que `requirements.md` promete. No es
código de `src/` sino tooling de `.claude/`: el "sistema" del que
hablan los criterios de abajo es este conjunto de skills/subagentes
actuando sobre un spec dado, no la app del briefing en sí. Diseño
acordado en la conversación de brainstorming previa a este documento.

## Requirements

### Requirement 1: Disparo y resolución del spec objetivo

**User Story:** Como desarrollador del proyecto, quiero que el loop de
verificación arranque solo o a pedido sobre el spec correcto, para no
tener que orquestarlo a mano cada vez que termino de implementar.

#### Acceptance Criteria

1. WHEN el usuario pide explícitamente verificar la implementación de
   un spec (frases como "verifica la implementación", "corre el loop
   e2e") THE SYSTEM SHALL invocar la skill `verify-implementation`
   sobre el spec que el usuario nombró o dejó identificable por
   contexto.
2. WHEN la última tarea pendiente de un `tasks.md` pasa a `[x]` Done
   durante la etapa de ejecución (TDD) THE SYSTEM SHALL invocar la
   skill `verify-implementation` sobre ese spec sin que el usuario
   tenga que pedirlo.
3. IF no se nombró ningún spec y existe exactamente una carpeta bajo
   `docs/specs/` THEN THE SYSTEM SHALL usar esa carpeta y decirlo
   explícitamente.
4. IF no se nombró ningún spec y existe más de una carpeta bajo
   `docs/specs/` sin forma de desambiguar por el contexto de la
   conversación THEN THE SYSTEM SHALL preguntar al usuario cuál usar
   antes de continuar.

### Requirement 2: Gate de implementación completa

**User Story:** Como desarrollador, quiero que el loop se niegue a
correr sobre una implementación a medio terminar, para no gastar
corridas de browser en ruido.

#### Acceptance Criteria

1. IF algún task de `tasks.md` no está en estado `[x]` Done THEN THE
   SYSTEM SHALL detener el loop antes del paso 2 (plan de tests) y
   listar los IDs de tareas pendientes, salvo que el usuario haya
   pedido explícitamente correr el loop de todas formas.
2. WHEN el usuario pide correr el loop sobre un spec con tareas
   pendientes THE SYSTEM SHALL avisar explícitamente qué criterios se
   esperan fallar por implementación incompleta antes de continuar.
3. WHEN el gate de tareas pasa THE SYSTEM SHALL correr `npm run
   typecheck` y `npm test` desde la raíz del proyecto y exigir que
   ambos terminen sin errores antes de avanzar al paso 2.
4. IF `npm run typecheck` o `npm test` fallan THEN THE SYSTEM SHALL
   detener el loop, mostrar la salida real del comando que falló, y no
   avanzar a generar ni correr tests e2e.
5. WHEN el gate de suite pasa THE SYSTEM SHALL arrancar la app en
   background con `npm start` y confirmar que responde en
   `http://localhost:3000` antes de avanzar al paso 2.
6. IF la app no llega a responder en `http://localhost:3000` después
   de arrancarla THEN THE SYSTEM SHALL reportar `BLOCKED` con el motivo
   concreto y detener el loop sin avanzar a los pasos siguientes.

### Requirement 3: Plan de casos de prueba e2e

**User Story:** Como desarrollador, quiero un plan escrito de qué se
va a probar en el navegador antes de que se genere ningún test, para
poder revisar la cobertura antes de que se traduzca a código.

#### Acceptance Criteria

1. WHEN el gate del Requirement 2 pasa THE SYSTEM SHALL invocar la
   skill `plan-test-cases` pasándole la carpeta del spec resuelta.
2. THE SYSTEM SHALL producir, en `plan-test-cases`, exactamente 3
   casos de prueba: 1 happy path y 2 failure paths, cada uno trazado a
   uno o más criterios de aceptación de `requirements.md` del spec
   objetivo.
3. THE SYSTEM SHALL escribir el plan en
   `docs/specs/<slug>/e2e-tests-plan.md`, con precondiciones, y por
   cada caso: criterios a los que traza, objetivo, precondiciones,
   pasos concretos (rutas/labels/botones reales) y resultado esperado
   observable en el navegador.
4. IF `e2e-tests-plan.md` ya existe para ese spec y el spec no cambió
   desde su última generación THEN THE SYSTEM SHALL reusarlo en vez de
   regenerarlo, y decirlo explícitamente.
5. IF los criterios de `requirements.md` no alcanzan para completar
   los 3 casos con base real THEN THE SYSTEM SHALL dejar el/los casos
   faltantes documentados en una sección "Not covered by this plan"
   con el motivo, en vez de inventar un criterio que el spec no tiene.
6. THE SYSTEM SHALL restringir la escritura de `plan-test-cases` al
   archivo `e2e-tests-plan.md` — nunca modifica `requirements.md`,
   `design.md`, `tasks.md` ni ningún archivo bajo `e2e/` o `src/`.

### Requirement 4: Generación de tests Playwright

**User Story:** Como desarrollador, quiero que el plan de casos se
traduzca en tests Playwright reales, anclados al DOM real de la app,
para no tener que escribirlos a mano ni confiar en selectores
inventados.

#### Acceptance Criteria

1. WHEN el plan del Requirement 3 está disponible THE SYSTEM SHALL
   lanzar el subagente `generate-tests` con la carpeta del spec y el
   path del plan.
2. IF `e2e-tests-plan.md` no existe todavía para el spec objetivo THEN
   THE SYSTEM SHALL detener `generate-tests` sin generar ningún test y
   reportarlo, en vez de inventar casos.
3. WHEN `generate-tests` corre THE SYSTEM SHALL navegar la app real
   (ya corriendo en `http://localhost:3000`) vía Playwright MCP para
   confirmar selectores y copys antes de escribirlos en un test.
4. THE SYSTEM SHALL escribir un archivo `e2e/<feature>.spec.ts` con un
   `test()` de Playwright por cada uno de los 3 casos planeados, en el
   mismo orden del plan, cada uno con un comentario que nombra el caso
   y los criterios a los que traza.
5. IF el DOM real de la app contradice un selector o copy asumido por
   el plan THEN THE SYSTEM SHALL priorizar el DOM real para el
   selector/copy, mantener la aserción de comportamiento que pide el
   plan, y reportar la contradicción encontrada.
6. WHEN `generate-tests` termina de escribir los tests THE SYSTEM
   SHALL correr `npx playwright test e2e/<feature>.spec.ts` y `npm run
   typecheck` en esa misma invocación y reportar el resultado real de
   ambos comandos.
7. THE SYSTEM SHALL restringir la escritura de `generate-tests` a
   archivos bajo `e2e/` — nunca modifica `src/`, `docs/`, ni ningún
   archivo de configuración, ni siquiera para hacer pasar un test que
   sospecha que falla por un bug real de la app.
8. WHEN `generate-tests` es invocado con hallazgos de una corrida
   previa del `healer` que diagnosticó tests puntuales como defectuosos
   THE SYSTEM SHALL corregir únicamente esos tests y dejar el resto de
   `e2e/<feature>.spec.ts` sin tocar.

### Requirement 5: Diagnóstico de la corrida e2e

**User Story:** Como desarrollador, quiero saber, cuando un test e2e
falla, si el problema es del test o de la app, para no perder tiempo
arreglando lo que no corresponde.

#### Acceptance Criteria

1. WHEN `generate-tests` termina THE SYSTEM SHALL lanzar el subagente
   `healer` sobre la misma carpeta del spec.
2. WHEN `healer` corre THE SYSTEM SHALL ejecutar `npm run test:e2e` en
   esa misma invocación y basar su veredicto en la salida real de esa
   corrida, nunca en una corrida anterior.
3. IF el suite e2e no puede arrancar (la app no levanta, falta algo)
   THEN THE SYSTEM SHALL reportar veredicto `BLOCKED` con el motivo
   concreto, sin instalar ni modificar nada para destrabarlo.
4. WHEN un test falla THE SYSTEM SHALL diagnosticar, por ese caso,
   `TEST DEFECT` (la app cumple el criterio pero el test no lo detecta)
   o `CODE DEFECT` (la app viola el criterio), reproduciendo el flujo a
   mano vía Playwright MCP antes de emitir un diagnóstico de `CODE
   DEFECT`.
5. WHEN un test pasa THE SYSTEM SHALL revisar si sus aserciones
   realmente ejercitan el criterio al que traza, y reportarlo como
   `TEST DEFECT` (false green) si no lo hacen, aunque el test esté en
   verde.
6. THE SYSTEM SHALL restringir la escritura de `healer` a exactamente
   un archivo, `docs/specs/<slug>/e2e-tests-report.md` — nunca edita
   ningún test bajo `e2e/`, ni `src/`, ni `requirements.md`,
   `design.md` o `tasks.md`.
7. IF `healer` considera que un test necesita otro selector o
   aserción THEN THE SYSTEM SHALL escribir esa recomendación en el
   reporte para que `generate-tests` la aplique, nunca editar el test
   directamente.
8. THE SYSTEM SHALL escribir en `e2e-tests-report.md` un veredicto
   global (`GREEN`/`TEST DEFECT`/`CODE DEFECT`/`BLOCKED`), la salida
   real de la corrida, y un desglose caso por caso con diagnóstico y
   evidencia.

### Requirement 6: Enrutamiento del loop y condición de salida

**User Story:** Como desarrollador, quiero que el loop decida solo si
tiene que volver a intentar, arreglar código, o parar, para que no
haga falta supervisarlo turno a turno ni se quede dando vueltas
indefinidamente.

#### Acceptance Criteria

1. WHEN el veredicto de `healer` es `GREEN` THE SYSTEM SHALL terminar
   el loop y reportar al usuario los tres artefactos producidos (plan,
   tests de `e2e/`, reporte).
2. WHEN el veredicto de `healer` es `TEST DEFECT` THE SYSTEM SHALL
   volver a invocar `generate-tests` pasándole los hallazgos del
   healer, y luego volver a invocar `healer`, sin que la skill
   orquestadora edite `e2e/` directamente.
3. WHEN el veredicto de `healer` es `CODE DEFECT` THE SYSTEM SHALL
   detener el loop de e2e, reportar el defecto concreto encontrado, y
   señalar que corresponde volver a la etapa de ejecución (TDD) para
   arreglarlo — el loop no modifica código de `src/` por sí mismo.
4. WHEN el veredicto de `healer` es `CODE DEFECT` THE SYSTEM SHALL
   dejar registrado el hallazgo para el Decision log de la tarea
   correspondiente en `tasks.md`.
5. WHEN el veredicto de `healer` es `BLOCKED` THE SYSTEM SHALL relayar
   al usuario exactamente qué está bloqueando el loop y qué acción se
   necesita de su parte, y detener el loop.
6. IF el loop completa 3 vueltas del ciclo `generate-tests` → `healer`
   sin alcanzar veredicto `GREEN` THEN THE SYSTEM SHALL detener el
   loop, reportar qué sigue fallando y por qué no converge, y no
   iniciar una cuarta vuelta.
7. IF el fix que implica un `CODE DEFECT` o `TEST DEFECT` requeriría
   cambiar `requirements.md` o `design.md` THEN THE SYSTEM SHALL
   detener el loop y preguntar al usuario en vez de decidir el cambio
   de spec por su cuenta.
8. WHEN el loop termina, por cualquier motivo (`GREEN`, tope de
   vueltas, `BLOCKED`, o `CODE DEFECT` que devuelve el control a
   ejecución) THE SYSTEM SHALL apagar el proceso de `npm start` que
   arrancó en background para esa corrida.

### Requirement 7: Aislamiento de escritura y herramientas de browser

**User Story:** Como desarrollador, quiero que cada pieza del loop
solo pueda escribir su propio artefacto y que la automatización de
browser sea siempre la misma herramienta, para que el loop sea seguro
de correr sin supervisión y no pise otros archivos del repo.

#### Acceptance Criteria

1. THE SYSTEM SHALL asegurar que, del conjunto {plan-test-cases,
   generate-tests, healer}, cada componente solo tenga permiso de
   escritura (`Edit`/`Write`) sobre el/los archivo(s) que le
   corresponden según los Requirements 3, 4 y 5 — nunca sobre los
   artefactos de otro componente.
2. THE SYSTEM SHALL usar exclusivamente el MCP de Playwright
   (`mcp__playwright__*`) para toda automatización de browser dentro
   del loop.
3. THE SYSTEM SHALL denegar el uso de `claude-in-chrome` para
   cualquier componente de este loop, vía `.claude/settings.json`.
4. THE SYSTEM SHALL evitar correr más de una pieza del loop
   (`plan-test-cases`, `generate-tests`, `healer`) en paralelo sobre el
   mismo spec.

## Out of Scope

- Tests unitarios (Vitest) para las piezas de este loop — son tooling
  de `.claude/`, no código de `src/`; se validan con una corrida real
  (dry-run) del loop completo, no con una suite automatizada.
- Que el loop arregle código de `src/` por sí mismo cuando el
  veredicto es `CODE DEFECT` — solo detecta y reporta; el arreglo
  ocurre en la etapa de ejecución (TDD), fuera de este loop.
- Integración con CI/CD para correr este loop automáticamente en cada
  push.
- Soporte para correr el loop sobre más de un spec a la vez.
- Cualquier cambio al subagente `task-verifier` ya existente — se
  referencia como recurso opcional, no se modifica.
- Cualquier cambio a `e2e/briefing.spec.ts` (genérico, ya existente) —
  este loop agrega specs nuevos por feature al lado, nunca lo
  reemplaza ni lo edita.
- Mockeo/interceptación de llamadas externas por defecto — los feeds
  RSS de este proyecto son reales y ya se pegan en vivo durante
  `npm run test:e2e`; el soporte de interceptación en `plan-test-cases`
  queda genérico para casos futuros, sin un mecanismo específico de
  stub de IA u otro servicio.
