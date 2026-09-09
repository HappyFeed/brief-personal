---
name: planning-tasks
description: Orquesta la fase de planeación de un spec (docs/specs/[slug]/) hasta dejar su tasks.md 100% iterado, invocando el dynamic workflow plan-tasks (.claude/workflows/plan-tasks.js), que hace bootstrap y/o itera las tareas (en paralelo cuando son independientes entre sí, escribiendo el archivo siempre de forma serializada). Usar siempre que el usuario pida armar, generar, terminar o iterar el tasks.md de un spec — frases como "armá el plan de tareas", "iterá el tasks.md", "planeá las tareas de este spec", "terminá de descomponer el spec en tareas", o cuando requirements.md y design.md ya están aprobados y toca cerrar la etapa de spec antes de pasar a ejecución (TDD). También aplica cuando ya existe un tasks.md con tareas sin pulir (recién bootstrapeadas, o desactualizadas respecto al código) y el pedido es "seguí iterando las tareas" o "revisá si el plan sigue teniendo sentido". No usar para escribir código de implementación ni para ejecutar las tareas ya planeadas — esta skill nunca abre un ciclo TDD, solo produce y refina el plan.
---

# Planning tasks: cerrar la etapa de spec con un tasks.md 100% iterado

Puente entre **spec** (`docs/specs/<slug>/` con `requirements.md` y
`design.md` ya aprobados) y **ejecución** (TDD, tarea por tarea). Vos
no escribís `tasks.md` ni tocás código: tu trabajo es asegurar el
input correcto y lanzar el dynamic workflow `plan-tasks`
(`.claude/workflows/plan-tasks.js`), que es quien hace bootstrap y/o
itera las tareas (en paralelo cuando son independientes, escribiendo
siempre de forma serializada) hasta vaciar el worklist. Se invoca
directo, o desde `specify` apenas `design.md` queda aprobado — el
trabajo es el mismo.

La meta: **al terminar, cada tarea que no esté ya `[x]` Done tiene que
haber pasado por al menos una iteración en esta corrida.** Un
`tasks.md` recién bootstrapeado no cuenta como terminado.

## Paso 1 — Asegurar el input: ubicar el spec

Identificá `docs/specs/<slug>/` a partir de lo que dijo el usuario. Si
hay ambigüedad entre varias carpetas, preguntá cuál — es lo único que
el workflow no puede resolver por sí solo. No hace falta que confirmes
acá que `requirements.md`/`design.md` existen y están aprobados: el
workflow lo chequea como primer paso y frena solo si falta algo (ver
Paso 3).

## Paso 2 — Lanzar el workflow

`plan-tasks` es un **dynamic workflow** (`.claude/workflows/plan-tasks.js`),
no una skill ni un slash command — no lo invoques como `/plan-tasks` ni
como `ultracode: plan-tasks`. Se lanza con la herramienta **`Workflow`**,
pasándole el path del script y el `slug` como `args`:

```
Workflow({
  scriptPath: ".claude/workflows/plan-tasks.js",
  args: { slug: "2026-09-03-noticias-fuente-rss" },
})
```

Una sola invocación por corrida: el workflow hace bootstrap (si
corresponde) y todo el loop de iteración internamente, no hace falta
relanzarlo por tarea.

**Si la herramienta `Workflow` no está disponible en este entorno**, no
hay forma de replicar a mano el paralelismo + escritura serializada que
hace el script (ver reglas del proyecto sobre no lanzar dos
`planner`/`planner-iterate`/`tasks-writer` en simultáneo) — avisale al
usuario que falta esa herramienta en vez de simular el workflow con
agentes sueltos.

## Paso 3 — Interpretar el resultado

El workflow devuelve `status`:

- **`blocked`** — falta `requirements.md`/`design.md`, o no están
  aprobados. Mostrale el `reason` al usuario y no insistas: hay que
  cerrar esa parte del spec primero.
- **`iterated`** — corrida completa, el worklist se vació solo. Trae
  `totalIterated`, `touchedTaskIds` y `unresolvedGaps`.
- **`stopped-early`** — se frenó antes de vaciar el worklist.
  `haltReason` dice por qué (un lote sin propuestas válidas, o la
  guardia de `MAX_ROUNDS`). No reintentes a ciegas: mostrale
  `haltReason` y `touchedTaskIds` al usuario y esperá indicación.

Releé `docs/specs/<slug>/tasks.md` antes de armar el resumen del Paso 4.

## Paso 4 — Resumen consolidado

- Qué se hizo por tarea (creada / mantenida / redimensionada / partida
  / fusionada / eliminada), una línea con el motivo.
- Gaps abiertos (`unresolvedGaps` o huecos de cobertura) — sin
  resolverlos ni inventarlos, son para el usuario.
- Confirmación de que la tabla de Requirements coverage sigue sin
  huecos.
- Confirmación de que el 100% del worklist fue iterado (o, si se
  frenó, qué quedó pendiente y por qué).
- Cerrá aclarando que iterar no es ejecutar: sigue la ejecución TDD
  desde la primera tarea `[ ]`.

## Reglas duras

- Nunca escribís `tasks.md` ni código vos mismo — todo pasa por el
  workflow.
- Si `requirements.md`/`design.md` no están aprobados y ya lo sabés,
  decíselo al usuario en vez de invocar el workflow a ciegas.
- No relances el workflow sobre el mismo spec en la misma corrida si
  ya devolvió `iterated` con el worklist vacío.
