---
name: verify-implementation
description: >-
  Corre el loop autónomo de verificación end-to-end de un spec una vez
  terminada su implementación: confirma que el spec está de verdad
  implementado (tareas Done, typecheck y tests unitarios en verde),
  después orquesta plan-test-cases → generate-tests → healer hasta que
  el suite e2e refleje el spec o el reporte no tenga defectos
  pendientes. Usar SIEMPRE que se acaba de terminar la implementación
  de un spec o el usuario quiere la feature verificada de punta a
  punta en el navegador — frases como "verifica la implementación",
  "corre el loop e2e", "la implementación ya está, ahora validala", "el
  spec ya está implementado, verificalo", o apenas la última tarea de
  tasks.md pasa a Done durante la ejecución. Dispara aunque el usuario
  no nombre la skill, mientras quiera un spec terminado validado contra
  la app real en vez de solo testeado a nivel unitario.
---

# Verify-implementation — el loop e2e autónomo

Esta skill es la etapa **"verificación"** de `CLAUDE.md`
(brainstorming → definición → spec (docs/) → ejecución (TDD) →
**verificación** → commit). Cierra el loop entre "las tareas dicen
Done" y "la feature funciona de verdad en el navegador".

Sos el **orquestador**. No escribís el plan de tests, el código de los
tests, ni el reporte vos mismo — cada uno de esos artefactos pertenece
a un componente de abajo, y cada uno escribe exactamente uno. Tu
trabajo es correrlos en orden, leer lo que devuelven, y decidir si el
loop da otra vuelta.

```
implementación terminada
        │
        ▼
  [esta skill]  gate: tareas Done, typecheck + test unitarios en verde,
                app arriba en localhost:3000
        │
        ▼
  [skill] plan-test-cases    → docs/specs/<spec>/e2e-tests-plan.md   (3 casos)
        │
        ▼
  [subagente] generate-tests → e2e/<feature>.spec.ts                 (Playwright)
        │
        ▼
  [subagente] healer         → docs/specs/<spec>/e2e-tests-report.md (veredicto)
        │
        ├── GREEN ─────────────────────► fin, reporta al usuario
        ├── TEST DEFECT ───────────────► vuelve a generate-tests con los findings, y a healer (hasta 3 vueltas)
        ├── CODE DEFECT ───────────────► fin del loop e2e, vuelve a ejecución (TDD)
        └── BLOCKED ───────────────────► relay exacto al usuario, fin
```

## Paso 0 — Resolvé el spec objetivo

Trabajás sobre una sola carpeta `docs/specs/<YYYY-MM-DD>-<feature>/`:

- Si el usuario nombró una feature o carpeta, usá esa.
- Si `docs/specs/` tiene exactamente una carpeta, usá esa y decilo.
- Si hay varias y la conversación no lo desambigua, preguntá cuál.

Leé `requirements.md`, `design.md` y `tasks.md` de esa carpeta — los
necesitás para el gate; los componentes de abajo releen lo que
necesiten por su cuenta.

## Paso 1 — Gate: ¿la implementación está de verdad terminada?

El loop verifica una feature **terminada**; correrlo sobre código a
medio hacer produce ruido, no señal. Antes de cualquier otra cosa:

1. **Estado de las tareas.** Todas las tareas de `tasks.md` están `[x]`
   Done. Si alguna no lo está, parás y le decís al usuario cuáles
   faltan — no testeás e2e una feature parcial. Excepción: el usuario
   pide explícitamente correr el loop igual; ahí decís con claridad qué
   criterios se esperan fallar por implementación incompleta.
2. **Salud de la suite.** Corré desde la raíz del proyecto y capturá la
   salida real:

   ```bash
   npm run typecheck
   npm test
   ```

   Rojo en cualquiera de los dos frena el loop: arreglalo primero a
   nivel unitario, donde el feedback es más barato. Nunca arranques el
   loop de browser sobre una suite en rojo.
3. **La app levanta.** `npm start` (este proyecto no tiene `npm run
   dev`) tiene que servir la app en `http://localhost:3000`. Arrancalo
   vos mismo en background y confirmá con una request real
   (`curl`/equivalente) que responde antes de seguir —
   `playwright.config.ts` lo reusa después (`reuseExistingServer:
   true`) para `npx playwright test`, y `generate-tests`/`healer`
   navegan contra ese mismo server vía Playwright MCP, así que tiene
   que estar arriba *antes* de invocarlos. Si no llega a responder,
   reportá `BLOCKED` con el motivo concreto y parás — no instalás ni
   arreglás nada.

Si una tarea marcada Done te genera dudas, para eso está el subagente
**`task-verifier`** — invocalo sobre esa tarea antes de gastar una
corrida de browser.

## Paso 2 — Planeá los casos de test

Invocá la skill **`plan-test-cases`** con la carpeta del spec resuelta.
Lee `requirements.md` + `design.md` y escribe
`docs/specs/<spec>/e2e-tests-plan.md` con exactamente **3** casos: 1
happy path y 2 failure/degrade paths.

No redactes ese archivo vos. Si ya existe y el spec no cambió desde que
se generó, se reusa — la propia skill lo confirma y lo dice.

## Paso 3 — Generá los tests

Lanzá el subagente **`generate-tests`**, pasándole la carpeta del spec
y el path del plan:

```
Agent({
  subagent_type: "generate-tests",
  description: "Generate e2e specs",
  prompt: "Spec folder: docs/specs/<slug>/\nPlan: docs/specs/<slug>/e2e-tests-plan.md\nLa app ya está arrancada y responde en http://localhost:3000. Escribí los specs de Playwright para los 3 casos planeados, bajo e2e/."
})
```

Explora la app real corriendo vía **Playwright MCP** para anclar sus
selectores al DOM real, y escribe `e2e/<feature>.spec.ts`. Devuelve los
archivos que escribió y el mapeo caso → test. Es el único componente
autorizado a escribir bajo `e2e/`.

## Paso 4 — Corré y diagnosticá

Lanzá el subagente **`healer`** sobre la misma carpeta del spec. Corre
`npm run test:e2e`, reproduce fallos en el browser cuando hace falta, y
escribe `docs/specs/<spec>/e2e-tests-report.md`.

El healer **nunca edita tests ni código** — a propósito. Su valor es el
diagnóstico: por cada caso que falla decide si el *test* está mal
(selector equivocado, supuesto incorrecto sobre el flujo) o el *código*
está mal (la app no cumple el criterio), y lo dice con evidencia.

## Paso 5 — Decidí si el loop da otra vuelta

Leé el veredicto del healer y ruteá:

- **`GREEN`** — los 3 casos pasan. El loop termina. Reportale al
  usuario: el spec está verificado de punta a punta, con el plan, los
  specs y el reporte como artefactos.
- **`TEST DEFECT`** — el healer acusa a los tests. Volvé a lanzar
  `generate-tests` con los hallazgos del healer pegados en el prompt
  para que corrija esos specs puntuales, y volvé al Paso 4. Nunca
  parchees `e2e/` vos mismo: un solo autor por artefacto.
- **`CODE DEFECT`** — el healer acusa a la app. Esta es la salida real
  del loop: la feature no cumple su propio spec. Volvé a la etapa de
  ejecución (arreglar bajo TDD, un test unitario que falla primero
  cuando el defecto es expresable a ese nivel), dejá el hallazgo
  anotado para el Decision log de la tarea correspondiente en
  `tasks.md`, y volvé a correr desde el Paso 1.
- **`BLOCKED`** — relayá exactamente qué está bloqueando y qué tiene
  que hacer el usuario.

**Parás después de 3 vueltas** del ciclo `generate-tests`→`healer` sin
llegar a `GREEN`. Reportá qué sigue fallando y por qué no converge — un
loop autónomo que sigue dando vueltas sobre el mismo fallo quema
tokens, no encuentra bugs.

**Presupuesto por corrida.** Además del tope de vueltas, parás si la
corrida pasa **300k tokens de subagentes** o **10 minutos** sumados.
Llevá la cuenta con el bloque `<usage>` que trae el aviso de cada
subagente terminado (`subagent_tokens`, `duration_ms`), acumulado desde
el Paso 2. Chequealo antes de lanzar cada subagente: si lanzarlo
excedería el presupuesto, no lo lanzás y reportás en qué vuelta
quedaste, cuánto se consumió y el último veredicto del `healer`.
Referencia: una corrida real de 2 vueltas consumió ~154k tokens y ~4,8
min, así que el tope deja margen de sobra.

También parás y preguntás si el fix que
implica el healer cambiaría `requirements.md` o `design.md`: cambiar el
spec es decisión del usuario, y es de `/specify`, no de este loop.

**Al terminar el loop, por cualquier motivo** (`GREEN`, tope de
vueltas, `BLOCKED`, o `CODE DEFECT` que devuelve el control a
ejecución), apagá el proceso de `npm start` que arrancaste en el Paso
1 — no lo dejes huérfano.

## Guardrails de alcance

- **Un solo escritor por artefacto.** `plan-test-cases` es dueño del
  plan, `generate-tests` de `e2e/`, `healer` del reporte. Vos no sos
  dueño de ninguno de los tres — sos dueño del ruteo y del mensaje al
  usuario.
- **La automatización de browser es siempre el MCP de Playwright**
  (`mcp__playwright__*`), nunca `claude-in-chrome` — `.claude/settings.json`
  lo deniega explícitamente.
- Nunca corrés dos piezas del loop (`plan-test-cases`, `generate-tests`,
  `healer`) en paralelo sobre el mismo spec.
- Nunca debilitás ni borrás un test para que el loop llegue a verde. Un
  test que falla porque la app está mal es el loop funcionando como se
  diseñó.
- Reportá con honestidad: si el loop terminó sin llegar a `GREEN`,
  decilo con la salida real que falló — nunca redondees un resultado
  parcial a "verificado".
