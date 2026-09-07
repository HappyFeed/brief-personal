---
name: planning-tasks
description: Orquesta la fase de planeación de un spec (docs/specs/[slug]/) hasta dejar su tasks.md 100% iterado, invocando el dynamic workflow plan-tasks (.claude/workflows/plan-tasks.js), que hace bootstrap y/o itera las tareas (en paralelo cuando son independientes entre sí, escribiendo el archivo siempre de forma serializada). Usar siempre que el usuario pida armar, generar, terminar o iterar el tasks.md de un spec — frases como "armá el plan de tareas", "iterá el tasks.md", "planeá las tareas de este spec", "terminá de descomponer el spec en tareas", o cuando requirements.md y design.md ya están aprobados y toca cerrar la etapa de spec antes de pasar a ejecución (TDD). También aplica cuando ya existe un tasks.md con tareas sin pulir (recién bootstrapeadas, o desactualizadas respecto al código) y el pedido es "seguí iterando las tareas" o "revisá si el plan sigue teniendo sentido". No usar para escribir código de implementación ni para ejecutar las tareas ya planeadas — esta skill nunca abre un ciclo TDD, solo produce y refina el plan.
---

# Planning tasks: cerrar la etapa de spec con un tasks.md 100% iterado

Esta skill es el paso puente entre **spec** (`docs/specs/<slug>/` con
`requirements.md` y `design.md` ya aprobados) y **ejecución** (TDD,
tarea por tarea) del workflow del proyecto. Vos no escribís
`tasks.md` directamente ni tocás código — invocás el dynamic workflow
`plan-tasks` (`.claude/workflows/plan-tasks.js`), que es quien
coordina los subagentes con permiso de leer/iterar/escribir el spec.

La meta de una corrida de esta skill es simple de enunciar y fácil de
subestimar en el esfuerzo real que toma: **al terminar, cada tarea de
`tasks.md` que no esté ya `[x]` Done tiene que haber pasado por al
menos una iteración en esta misma corrida.** Un `tasks.md` recién
bootstrapeado no cuenta como terminado — bootstrap es un primer
borrador, no un plan pulido.

Se invoca de dos formas equivalentes: directo, cuando el usuario pide
armar o iterar el plan de un spec ya con `requirements.md`/`design.md`
aprobados; o desde la skill **`specify`**, que la invoca automáticamente
en su paso 5 apenas `design.md` queda aprobado, como parte de cerrar la
etapa de spec. En ambos casos el trabajo es el mismo — esta skill no
necesita saber quién la invocó.

## Cómo está dividido el trabajo

- **Vos (esta skill)**: identificás el spec, invocás el workflow con
  el `slug` correcto, interpretás su resultado, y armás el resumen
  consolidado para el usuario. No decidís bootstrap vs. iterar — eso
  lo resuelve el propio workflow leyendo `tasks.md`.
- **El workflow `plan-tasks`**: hace todo el trabajo pesado —
  confirma que `requirements.md`/`design.md` existen, bootstrapea si
  hace falta, arma el worklist de tareas pendientes, las agrupa en
  lotes por dependencia real (tareas sin dependencias entre sí van en
  el mismo lote y se evalúan en paralelo con `planner-iterate`, de
  solo lectura), y aplica cada lote a `tasks.md` con un único
  `tasks-writer` serializado. Repite lote tras lote hasta vaciar el
  worklist.

## Paso 1 — Ubicar el spec y confirmar el slug

Identificá `docs/specs/<slug>/` a partir de lo que dijo el usuario
(nombre de la feature, o carpeta explícita). Si hay ambigüedad entre
varias carpetas de specs, preguntá cuál. No hace falta que vos
confirmes acá que `requirements.md`/`design.md` existen y están
aprobados — el workflow lo chequea como primer paso y frena solo si
falta algo (ver Paso 3).

## Paso 2 — Invocar el workflow

Corré `/plan-tasks` (o `ultracode: plan-tasks`, según cómo esté
guardado en este entorno) pasando el `slug` como argumento, por
ejemplo el spec `docs/specs/2026-09-03-noticias-fuente-rss/` se invoca
con `slug: "2026-09-03-noticias-fuente-rss"`. Es una sola invocación
por corrida: el workflow hace bootstrap (si corresponde) y el loop
completo de iteración internamente, no hace falta relanzarlo por
tarea.

## Paso 3 — Interpretar el resultado

El workflow devuelve un resultado estructurado con `status`:

- **`blocked`** — falta `requirements.md` o `design.md`, o no están
  aprobados. Mostrale el `reason` al usuario, no insistas ni fuerces
  nada: hay que cerrar esa parte del spec primero (workflow del
  proyecto: brainstorming → definición → spec → ejecución).
- **`iterated`** — corrida completa. Trae `totalIterated` (cuántas
  tareas se evaluaron), `touchedTaskIds` (qué IDs tocó, incluyendo
  splits nuevos), y `unresolvedGaps` (huecos que ningún lote llegó a
  asignarle a una tarea puntual — normalmente vacío si el worklist se
  vació limpiamente).
- Si el workflow se frenó antes de vaciar el worklist (revisá el log
  de la corrida en `/workflows`), no sigas empujando a la fuerza — lo
  más probable es que un lote no haya producido una propuesta válida.
  Mostrale el problema al usuario y esperá indicación.

Releé `docs/specs/<slug>/tasks.md` después de que el workflow termine
para confirmar el estado final del documento antes de armar el
resumen del Paso 4.

## Paso 4 — Resumen consolidado

Armá un resumen para el usuario con:

- **Qué se hizo por tarea** — creada en bootstrap / mantenida igual /
  redimensionada / partida / fusionada / eliminada por innecesaria,
  una línea por tarea con el motivo (lo sacás del `tasks.md` final y,
  si hace falta más detalle, del log de la corrida en `/workflows`).
- **Gaps que quedaron abiertos** — cualquier entrada de
  `unresolvedGaps`, o cualquier hueco de cobertura visible en la tabla
  de Requirements coverage. No los resuelvas vos ni los inventes —
  son para que el usuario decida.
- **Confirmación de cobertura** — que la tabla de Requirements
  coverage de `tasks.md` sigue sin huecos (todo criterio de
  `requirements.md` mapeado a al menos una tarea).
- **Confirmación de que el 100% del worklist fue iterado** en esta
  corrida (o, si el workflow se frenó antes, qué quedó pendiente y
  por qué).
- Cerrá dejando claro que iterar no es ejecutar: el siguiente paso
  natural del workflow es empezar la ejecución TDD por la primera
  tarea `[ ]` del plan.

## Reglas duras

- Nunca escribís `tasks.md` vos mismo, ni con Edit ni con Write, ni
  siquiera para "adelantar" un cambio chico. Todo pasa por el workflow
  `plan-tasks` (que a su vez solo deja escribir al `tasks-writer`).
- Nunca escribís código de implementación ni le pedís al workflow que
  lo haga — no es su trabajo (ver reglas duras de
  `.claude/agents/planner.md` y `.claude/agents/planner-iterate.md`).
- Si `requirements.md` o `design.md` no existen o no están aprobados
  todavía, no invocás el workflow a ciegas esperando que falle bonito:
  si ya lo sabés de antes, decíselo al usuario directamente y listo.
- No relances el workflow repetidas veces "por las dudas" sobre el
  mismo spec en la misma corrida si ya devolvió `iterated` con el
  worklist vacío — eso ya es la corrida completa.
