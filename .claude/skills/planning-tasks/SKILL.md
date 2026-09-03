---
name: planning-tasks
description: Orquesta la fase de planeación de un spec (docs/specs/[slug]/) hasta dejar su tasks.md 100% iterado, lanzando el subagente planner (.claude/agents/planner.md) en modo bootstrap o en modo tarea única, secuencialmente. Usar siempre que el usuario pida armar, generar, terminar o iterar el tasks.md de un spec — frases como "armá el plan de tareas", "iterá el tasks.md", "planeá las tareas de este spec", "terminá de descomponer el spec en tareas", o cuando requirements.md y design.md ya están aprobados y toca cerrar la etapa de spec antes de pasar a ejecución (TDD). También aplica cuando ya existe un tasks.md con tareas sin pulir (recién bootstrapeadas, o desactualizadas respecto al código) y el pedido es "seguí iterando las tareas" o "revisá si el plan sigue teniendo sentido". No usar para escribir código de implementación ni para ejecutar las tareas ya planeadas — esta skill nunca abre un ciclo TDD, solo produce y refina el plan.
---

# Planning tasks: cerrar la etapa de spec con un tasks.md 100% iterado

Esta skill es el paso puente entre **spec** (`docs/specs/<slug>/` con
`requirements.md` y `design.md` ya aprobados) y **ejecución** (TDD,
tarea por tarea) del workflow del proyecto. Vos no escribís
`tasks.md` directamente ni tocás código — coordinás llamados
secuenciales al subagente `planner`, que es quien tiene permiso de
escritura sobre el spec.

La meta de una corrida de esta skill es simple de enunciar y fácil de
subestimar en el esfuerzo real que toma: **al terminar, cada tarea de
`tasks.md` que no esté ya `[x]` Done tiene que haber pasado por al
menos una iteración del `planner` en esta misma corrida.** Un
`tasks.md` recién bootstrapeado no cuenta como terminado — bootstrap
es un primer borrador, no un plan pulido (el propio `planner` lo dice
en su reporte de bootstrap).

## Paso 0 — Ubicar el spec y confirmar que está listo para planear

1. Identificá `docs/specs/<slug>/` a partir de lo que dijo el usuario
   (nombre de la feature, o carpeta explícita). Si hay ambigüedad
   entre varias carpetas de specs, preguntá cuál.
2. Confirmá que existen `requirements.md` y `design.md` en esa
   carpeta. Si falta alguno, esta skill no puede arrancar: son la
   fuente de verdad que el `planner` necesita. Avisá al usuario que
   falta cerrar esa parte del spec primero (workflow: brainstorming →
   definición → spec → ejecución) y no lances ningún subagente.
3. Leé (si existe) el `tasks.md` actual del spec — su contenido
   decide el modo, no lo que te haya dicho el usuario. Ver Paso 1.

## Paso 1 — Determinar el modo: bootstrap o iterar

Mirá `tasks.md`:

- **No existe, o existe sin ninguna entrada `### T<N>`** (archivo
  vacío, o solo el esqueleto sin tareas reales) → **modo bootstrap**.
  Un solo llamado al `planner` en modo bootstrap arma la primera
  versión completa del plan.
- **Ya tiene una o más entradas `### T<N>`** → el plan ya existe, sea
  recién bootstrapeado o de una corrida anterior. Saltás directo al
  **Paso 3** (loop de iteración), sin bootstrap — lanzar bootstrap
  sobre un plan que ya tiene tareas reales lo pisaría, y el propio
  `planner` se niega a hacerlo si detecta progreso real (`[~]`/`[x]`
  o Decision log/Outcome llenos). Si el usuario pidió explícitamente
  "bootstrap" pero ya hay tareas, decíselo en vez de forzarlo.

## Paso 2 — Bootstrap (solo si corresponde)

Lanzá un único subagente `planner` en modo bootstrap para ese spec.
Esperá su resultado — no lo lances en paralelo con nada más, no hay
nada más que lanzar todavía. Cuando vuelva, releé el `tasks.md`
resultante: ahí está la lista real de tareas (`T1`, `T2`, ...) con la
que armás el worklist del Paso 3.

Un bootstrap por sí solo **no cumple la meta de esta skill**. Seguí
siempre al loop de iteración — el propio bootstrap recomienda pulir
cada tarea una por una, y "100% iterado" incluye las tareas recién
creadas.

## Paso 3 — Armar el worklist de tareas a iterar

Parseá el `tasks.md` actual (recién bootstrapeado, o preexistente) y
armá la lista de tareas pendientes de iterar en esta corrida:

- Tomá las entradas en el **orden en que aparecen en el documento**.
  Ese orden ya respeta las dependencias — es una regla dura tanto del
  template (`tasks-template.md`) como del propio `planner` al escribir
  o reordenar tareas. No hace falta que vos resuelvas el orden de
  dependencias por tu cuenta a partir del campo `Depends on`; confiá
  en el orden del documento.
- **Excluí las tareas en `[x]` (Done)** — no se tocan salvo pedido
  explícito del usuario de reabrir una. Si Status es `[~]`, `[!]` o
  `[ ]`, la tarea entra al worklist: todavía no está ejecutada y vale
  la pena confirmar que sigue bien planeada.
- Si el worklist queda vacío (todas las tareas ya están `[x]`),
  no hay nada que iterar: reportá eso al usuario y terminá acá, sin
  lanzar ningún subagente.

## Paso 4 — Loop secuencial de iteración

Por cada tarea del worklist, en orden, **un llamado al `planner` en
modo tarea única a la vez**. Nunca en paralelo: además de que
`CLAUDE.md` pide no abrir frentes en paralelo, todos los llamados
escriben sobre el mismo archivo `tasks.md`, y las tareas dependen unas
de otras — iterar `T3` tiene que poder asumir qué pasó con `T2` en
esta misma corrida, no una versión vieja.

Para cada llamado:

1. Armá el prompt del subagente con: el spec, el ID de la tarea a
   iterar, y el **contexto acumulado relevante** de los llamados
   anteriores de esta corrida — no todo el historial, solo lo que
   afecta a esta tarea puntual. En concreto:
   - Si una tarea anterior se amplió, partió, fusionó o eliminó de un
     modo que cambia lo que esta tarea puede asumir (p. ej. un tipo
     nuevo, una responsabilidad que se movió), decilo explícitamente.
   - Si un llamado anterior reportó un **gap** ("esto debería
     resolverse al iterar T-siguiente"), pasáselo a la tarea que
     corresponde cuando llegue su turno — es exactamente el mecanismo
     que tiene el `planner` para no resolver cosas fuera de su tarea
     asignada; vos sos quien cierra ese loop entre llamados.
   - Recordale siempre que las tareas anteriores/posteriores del
     worklist siguen sin implementar en el código real, salvo que algo
     en el propio reporte del `planner` indique lo contrario.
2. Esperá el resultado antes de lanzar el siguiente. Guardá (en tu
   propio resumen, no en el archivo) qué pasó con la tarea: se
   mantuvo igual, se redimensionó, se partió, se fusionó, o se marcó
   para eliminar; y cualquier gap nuevo que haya quedado sin resolver.
3. Si el reporte indica que el archivo cambió de forma estructural
   (tareas nuevas por un split, una tarea eliminada, IDs
   renumerados), **releé `tasks.md`** antes de seguir y ajustá el
   worklist restante en consecuencia — no asumas que la lista que
   armaste en el Paso 3 sigue siendo exacta.
4. Si un llamado reporta que se frenó (p. ej. detectó progreso real
   inesperado, o algo que requiere una decisión del usuario que no te
   corresponde tomar por tu cuenta), no sigas empujando el loop a la
   fuerza: parás, mostrás el problema al usuario, y esperás
   indicación antes de continuar con las tareas restantes.

Repetí hasta que el worklist quede vacío.

## Paso 5 — Resumen consolidado

Al terminar el loop (o al frenar por un bloqueo), armá un resumen para
el usuario con:

- **Qué se hizo por tarea** — creada en bootstrap / mantenida igual /
  redimensionada / partida / fusionada / eliminada por innecesaria,
  una línea por tarea con el motivo.
- **Gaps que quedaron abiertos** — cualquier cosa que algún llamado
  del `planner` haya señalado como pendiente de decisión del usuario
  (un requirement sin cobertura clara, una ambigüedad de diseño, algo
  fuera del alcance de una tarea puntual). No los resuelvas vos ni
  los inventes — son para que el usuario decida.
- **Confirmación de cobertura** — que la tabla de Requirements
  coverage de `tasks.md` sigue sin huecos (todo criterio de
  `requirements.md` mapeado a al menos una tarea).
- **Confirmación de que el 100% del worklist fue iterado** en esta
  corrida (o, si frenaste antes, qué quedó pendiente y por qué).
- Cerrá dejando claro que iterar no es ejecutar: el siguiente paso
  natural del workflow es empezar la ejecución TDD por la primera
  tarea `[ ]` del plan.

## Reglas duras

- Nunca lanzás dos llamados al `planner` sobre el mismo spec al mismo
  tiempo. Secuencial siempre, sin excepción — ni entre bootstrap e
  iteración, ni entre tareas del loop.
- Nunca escribís `tasks.md` vos mismo, ni con Edit ni con Write, ni
  siquiera para "adelantar" un cambio chico. Todo pasa por un llamado
  al `planner`.
- Nunca escribís código de implementación ni le pedís al `planner` que
  lo haga — no es su trabajo (ver reglas duras de
  `.claude/agents/planner.md`).
- Si `requirements.md` o `design.md` no existen o no están aprobados
  todavía, no arrancás nada: se lo decís al usuario y listo.
- Si el `tasks.md` ya tiene progreso real y el usuario pidió
  "bootstrap" sin saberlo, corregí el modo en silencio (vas directo a
  iterar) mencionándolo en tu primera respuesta, no lo forcés.
