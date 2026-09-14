---
name: plan-test-cases
description: >-
  Escribe el plan de tests e2e de un spec — exactamente 3 casos de
  browser (1 happy path + 2 failure paths) derivados de requirements.md
  y design.md — en docs/specs/<spec>/e2e-tests-plan.md, listo para que
  el subagente generate-tests lo convierta en specs de Playwright. Usar
  SIEMPRE que se quiera el plan de tests e2e de un spec — frases como
  "planea los casos e2e", "haz el plan de tests e2e", "qué deberíamos
  probar end to end para esta feature" — y se invoca automáticamente
  como Paso 2 del loop verify-implementation. Dispara aunque el usuario
  no diga "e2e-tests-plan.md", mientras quiera casos de test a nivel
  browser derivados de un spec, no los tests en sí.
---

# Plan test cases — el plan e2e de un spec

Convertís un spec en **3 casos de prueba ejecutables por una persona**
y los escribís en `docs/specs/<YYYY-MM-DD>-<feature>/e2e-tests-plan.md`.
**No** escribís código de Playwright — eso es trabajo del subagente
`generate-tests`, y este archivo es su único input. Escribilo para que
un agente que nunca leyó el spec pueda implementar cada paso sin
adivinar nada.

Normalmente corrés dentro del loop `verify-implementation`, que te pasa
la carpeta del spec ya resuelta. Invocado directo, resolvé la carpeta
igual: la que nombró el usuario, o la única que hay bajo `docs/specs/`,
si no preguntá.

## Paso 1 — Leé el spec, no tu memoria de él

1. `requirements.md` — los **criterios de aceptación EARS** son el
   contrato. Cada caso que escribas traza a uno o más, por su
   identificador exacto (p. ej. "2.4").
2. `design.md` — rutas, estructura, nombres de componentes, copys de
   error, llamadas externas. De acá salen los pasos y el texto esperado
   en la UI.
3. `tasks.md` — el Decision log de cada tarea registra dónde la
   implementación se desvió deliberadamente del design. Un plan escrito
   contra la intención original cuando el código fue por otro lado
   produce fallos falsos.

Después mirá el código real de UI (`src/format/html.ts`, `src/server.ts`,
y cualquier otro módulo de renderizado que el spec objetivo haya
agregado) para las rutas, textos y estructura que un usuario ve de
verdad. Preferí lo que hay en el código por sobre lo que dice el design
cuando difieren, y anotá la divergencia en el plan.

## Paso 2 — Elegí los 3 casos

Exactamente 3, ni más ni menos:

1. **Un happy path** — el flujo principal de la feature, de punta a
   punta, tal como lo describe la user story: navegar, y ver el
   resultado. Cubrí los criterios que definen "la feature funciona"; si
   el flujo tiene una post-condición observable más allá de un mensaje
   de éxito (un ítem aparece listado, un total se actualiza), afirmala
   — no te quedes en el mensaje de éxito.
2. **Dos failure paths** — casos donde la app tiene que *rechazar* o
   *degradar* correctamente. Elegí los dos que más riesgo cargan,
   priorizando criterios escritos como rechazo o manejo de error (feed
   caído, XML inválido, lista de feeds vacía, ítem sin descripción).
   Dos variaciones del mismo caso de error cuentan como un solo caso,
   no dos — elegí dos modos de fallo genuinamente distintos.

Un failure path afirma el **comportamiento correcto de la app ante un
input/estado adverso**: el fallback que se ve en pantalla, lo que no se
rompe. No es un test que se espera que falle.

## Paso 3 — Escribí el plan

Escribí `e2e-tests-plan.md` (sobreescribilo si ya existe — es un
artefacto derivado) con exactamente esta estructura:

```markdown
# E2E test plan — <feature>

Spec: `docs/specs/<date>-<feature>/`
Generado por la skill `plan-test-cases` · consumido por el subagente `generate-tests`

## Preconditions

- App: `npm start` en `http://localhost:3000` (playwright.config.ts lo arranca/reusa automáticamente para `npx playwright test`; `generate-tests`/`healer` asumen que ya está corriendo)
- Environment: <variables/config que necesita el flujo, o "ninguna">
- State: <qué tiene que ser cierto antes de cada caso>

## Case 1 — <name> (happy path)

- **Traces to:** <ids de criterios, textuales de requirements.md>
- **Objective:** <qué prueba esto sobre la feature, en una línea>
- **Preconditions:** <estado puntual del caso>
- **Steps:**
  1. <acción, nombrando la ruta/elemento real: `/`, el heading "Briefing diario"…>
  2. …
- **Expected result:**
  - <aserción observable: texto visible, presencia/ausencia de un elemento>
- **Notes:** <riesgos de flakiness, llamadas externas involucradas>

## Case 2 — <name> (failure path)
…mismos campos…

## Case 3 — <name> (failure path)
…mismos campos…

## Criteria coverage

| Criterion | Case | Covered as |
|---|---|---|

## Not covered by this plan

- <criterios que quedan para tests unitarios o fuera del alcance de e2e, con el motivo>
```

Reglas para los pasos y las aserciones:

- **Solo lo observable.** Los pasos describen lo que hace un usuario en
  el browser; las aserciones describen lo que un usuario puede ver.
  Nunca metas la mano en estado interno, módulos o funciones — eso es
  territorio de la suite unitaria (Vitest).
- **Concreto.** "El heading `<h1>` dice exactamente 'Briefing diario'"
  gana a "el título se ve bien". `generate-tests` no tiene que inventar
  datos.
- **Nombrá la superficie real.** Ruta real, texto visible real, copy de
  error real — citado del código, no parafraseado.
- **Determinístico.** Evitá depender de la fecha de hoy, de datos al
  azar, o del orden de los otros casos; cada caso arma su propio
  estado.
- **Llamadas externas.** Este proyecto no mockea llamadas externas por
  defecto: los feeds RSS de `src/config.ts` son reales y `npm run
  test:e2e` ya pega contra ellos en vivo. Si el spec objetivo involucra
  una llamada externa que sí conviene interceptar (`page.route()`),
  decilo explícitamente en el caso y qué comportamiento de fallback hay
  que afirmar — no asumas mockeo si el spec no lo pide.

## Paso 4 — Regla de reuso

Antes de escribir, si `e2e-tests-plan.md` ya existe para ese spec:
confirmá si `requirements.md`/`design.md` cambiaron desde la última vez
que se generó (por fecha de modificación o por lectura de contenido
contra lo que el plan ya dice cubrir). Si no cambiaron, **reusá el plan
existente en vez de regenerarlo** y decilo explícitamente en tu reporte
— no lo sobreescribas sin necesidad.

## Paso 5 — Reportá y devolvé el control

Reportá: el path del archivo, los 3 nombres de caso, qué criterios
quedan cubiertos y cómo, y cualquier conflicto que encontraste entre el
spec y el código real. Después quien te invocó sigue con
`generate-tests`.

## Guardrails de alcance

- Escribís **solo** `e2e-tests-plan.md`. Nunca tocás `requirements.md`,
  `design.md`, `tasks.md`, nada bajo `e2e/`, ni código de `src/`.
- Nunca inventás un criterio que el spec no tiene. Si un caso que te
  parece valioso no tiene criterio detrás, listalo en "Not covered by
  this plan" con la nota de que eso es decisión de `/specify`, no tuya.
- Si los criterios del spec son demasiado flacos para dar 3 casos con
  base real, escribí los que sí son reales y decí con claridad qué
  hueco no pudiste llenar y por qué.
