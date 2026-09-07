export const meta = {
  name: 'plan-tasks',
  description: 'Bootstrap e itera tasks.md de cualquier spec (docs/specs/<slug>/), iterando en paralelo las tareas sin dependencias entre sí, con un único agente serializado escribiendo el archivo.',
}

// args puede llegar como objeto, como el slug pelado, o (bug documentado del
// runtime) como un string que en realidad es JSON — normalizamos las tres.
let parsedArgs = args
if (typeof parsedArgs === 'string') {
  const trimmed = parsedArgs.trim()
  if (trimmed.startsWith('{')) {
    try { parsedArgs = JSON.parse(trimmed) } catch { /* no era JSON, queda como string */ }
  }
}
const slug = typeof parsedArgs === 'string'
  ? parsedArgs.trim() || null
  : (parsedArgs?.slug || parsedArgs?.spec || parsedArgs?.folder || null)

if (!slug) {
  log('Falta el slug del spec. Invocar como: /plan-tasks <slug>, donde <slug> es el nombre de docs/specs/<slug>/.')
  return { status: 'blocked', reason: 'missing slug argument' }
}

const specDir = `docs/specs/${slug}`

// Guardia contra loop infinito, no un presupuesto de tokens: cada ronda
// avanza como mínimo una capa de dependencias, así que el número real de
// rondas escala con el largo de la cadena de dependencias más larga del
// spec, no con la cantidad total de tareas. Para specs chicos de proyecto
// personal (el único que existe hoy tiene 6 tareas y usó 5 rondas), 40 deja
// margen de sobra para una cadena mucho más larga que cualquiera real, sin
// dejar que un bug de "cero progreso por ronda" corra indefinidamente.
const MAX_ROUNDS = 40

const READY_SCHEMA = {
  type: 'object',
  required: ['ready', 'needsBootstrap'],
  properties: {
    ready: { type: 'boolean' },
    blockReason: { type: 'string' },
    needsBootstrap: { type: 'boolean' },
  },
}

const WORKLIST_SCHEMA = {
  type: 'object',
  required: ['tasks'],
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'dependsOn'],
        properties: {
          id: { type: 'string' },
          dependsOn: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
}

const ITERATE_SCHEMA = {
  type: 'object',
  required: ['taskId', 'action', 'summary'],
  properties: {
    taskId: { type: 'string' },
    action: { type: 'string', enum: ['kept', 'resized', 'split', 'merged', 'deleted'] },
    summary: { type: 'string' },
    taskMarkdown: { type: 'string' },
    newTaskIds: { type: 'array', items: { type: 'string' } },
    mergedIntoId: { type: 'string' },
    gaps: { type: 'array', items: { type: 'string' } },
  },
}

phase('Scout')

const ready = await agent(
  `Ubicá el spec en ${specDir}. Confirmá que requirements.md y design.md existen y tienen contenido real (no el template vacío de .claude/skills/specify/assets/, que todavía dice "[Feature Name]" o secciones sin completar). Estos dos documentos NUNCA tienen un campo "Status" — la aprobación de requirements/design es un evento de conversación entre el usuario y la skill "specify", no algo que quede escrito en el archivo, así que no busques ninguna marca de "Approved" ahí. Si falta alguno de los dos archivos, o está vacío/es el template sin completar, devolvé ready=false con blockReason explicando qué falta. Si están listos, mirá si tasks.md existe y tiene alguna entrada "### T<N>": si no existe, o existe sin ninguna entrada real, needsBootstrap=true; si ya tiene entradas, needsBootstrap=false.`,
  { agentType: 'Explore', schema: READY_SCHEMA, model: 'haiku', label: 'ready-check' },
)

if (!ready || !ready.ready) {
  log(`${slug}: no se puede planear — ${ready?.blockReason ?? 'el scout no devolvió resultado válido'}.`)
  return { slug, status: 'blocked', reason: ready?.blockReason ?? 'scout failed' }
}

if (ready.needsBootstrap) {
  phase('Bootstrap')
  await agent(
    `Corré el modo bootstrap para el spec en ${specDir}: no existe todavía un tasks.md real. Seguí exactamente las instrucciones de tu definición de agente.`,
    { agentType: 'planner', label: 'bootstrap' },
  )
}

const seen = new Set() // task IDs ya procesados en esta corrida (incluye splits/merges nuevos)
let carryContext = [] // gaps acumulados de lotes anteriores, pendientes de asignar
let round = 0
let totalIterated = 0
let haltReason = null // null = el worklist se vació solo; si no, la corrida se frenó antes de terminar

while (true) {
  round++
  if (round > MAX_ROUNDS) {
    haltReason = `guardia de ${MAX_ROUNDS} rondas alcanzada`
    log(`Guardia: ${MAX_ROUNDS} rondas sin vaciar el worklist de ${slug}, freno para no correr sin límite.`)
    break
  }

  phase(`Worklist (lote ${round})`)
  const worklist = await agent(
    `Leé ${specDir}/tasks.md. Devolvé, en el orden en que aparecen en el documento, las tareas que NO están en Status [x] (Done): su id ("T3", "T3a", ...) y su campo "Depends on" tal cual está escrito (lista de ids, vacía si dice "none").`,
    { agentType: 'Explore', schema: WORKLIST_SCHEMA, model: 'haiku', label: `worklist-r${round}` },
  )

  // Iterar una tarea no le cambia el Status (sigue [ ] hasta la ejecución
  // real en TDD), así que el scout siempre la va a listar de nuevo: el
  // control de "ya se iteró en esta corrida" lo lleva `seen`, no el archivo.
  const notYetIterated = (worklist?.tasks ?? []).filter(t => !seen.has(t.id))

  if (!notYetIterated.length) {
    log(`${slug}: no quedan tareas pendientes de iterar${round > 1 ? ` (${totalIterated} iteradas en ${round - 1} lote(s))` : ''}.`)
    break
  }

  const stillPending = new Set(notYetIterated.map(t => t.id))
  const batch = notYetIterated
    .filter(t => t.dependsOn.every(d => !stillPending.has(d)))
    .map(t => t.id)
  const effectiveBatch = batch.length ? batch : [notYetIterated[0].id]

  if (!batch.length) {
    log(`Aviso: dependencias inconsistentes o ciclo cerca de ${effectiveBatch[0]} en el lote ${round}; sigo de a una para no bloquear el loop.`)
  }

  phase(`Iterar lote ${round}: ${effectiveBatch.join(', ')}`)
  const proposals = (await parallel(
    effectiveBatch.map(id => () => agent(
      `Evaluá la tarea ${id} de ${specDir}/tasks.md, en modo tarea única y de SOLO LECTURA. Contexto acumulado de lotes anteriores de esta corrida (gaps sin asignar todavía, cambios estructurales previos): ${JSON.stringify(carryContext)}`,
      { agentType: 'planner-iterate', schema: ITERATE_SCHEMA, label: id, phase: `Iterar ${id}` },
    )),
  )).filter(Boolean)

  if (proposals.length < effectiveBatch.length) {
    log(`Aviso: ${effectiveBatch.length - proposals.length} de ${effectiveBatch.length} llamados del lote ${round} no devolvieron resultado válido.`)
  }
  if (!proposals.length) {
    haltReason = `lote ${round} (${effectiveBatch.join(', ')}) no produjo ninguna propuesta válida`
    log(`Lote ${round} no produjo ninguna propuesta válida; freno la corrida acá.`)
    break
  }

  phase(`Escribir lote ${round}`)
  await agent(
    `Aplicá este lote de propuestas a ${specDir}/tasks.md, manteniendo checklist y tabla de Requirements coverage consistentes: ${JSON.stringify(proposals)}`,
    { agentType: 'tasks-writer', label: `write-r${round}` },
  )

  // Solo se marcan como iteradas las que de verdad devolvieron una
  // propuesta válida — una que falló vuelve a aparecer en el próximo
  // lote en vez de saltearse en silencio (la laziness que este
  // workflow existe para evitar).
  proposals.forEach(p => seen.add(p.taskId))
  totalIterated += proposals.length
  carryContext = proposals.flatMap(p => p.gaps ?? [])
}

log(`${slug}: corrida terminada. ${totalIterated} tarea(s) iteradas en ${round} lote(s). IDs tocados: ${[...seen].join(', ') || 'ninguno'}.`)

return {
  slug,
  status: haltReason ? 'stopped-early' : 'iterated',
  haltReason,
  rounds: round,
  totalIterated,
  touchedTaskIds: [...seen],
  unresolvedGaps: carryContext,
}
