# Briefing Diario Personal

App chiquita que arma un briefing diario de noticias: junta ítems de
feeds RSS de un tema de interés (arrancó con IA) y los entrega en una
página HTML legible, generada de nuevo en cada visita. Sin LLM en esta
v1 — solo fetch, parseo y formateo.

- **Demo en vivo:** https://brief-personal-pearl.vercel.app/
- **Repo:** https://github.com/HappyFeed/brief-personal

## Por qué este repo es interesante

El código en sí es simple a propósito. Lo que quiero mostrar acá es
**cómo se construyó**: este proyecto es un experimento de desarrollo
asistido por agentes, usando Claude Code no como autocomplete sino
como un harness completo — con reglas de proceso, roles especializados
y verificación automática — para llevar una feature desde una idea
hasta código andando en producción sin que un humano escriba una sola
línea directamente.

El flujo es fijo y está documentado en `CLAUDE.md`:

```
brainstorming → spec (docs/) → ejecución (TDD) → verificación → commit
```

Cada etapa está resuelta por una pieza distinta del harness:

### Skills

Procedimientos invocables que encapsulan una etapa del flujo:

- **`brainstorming`** — explora una idea por diálogo antes de tocar
  código o escribir spec.
- **`specify`** — redacta `requirements.md` (en notación EARS,
  WHEN/IF/WHILE/WHERE... THE SYSTEM SHALL...) y `design.md`, con gate
  de aprobación explícito por documento.
- **`planning-tasks`** — una vez aprobado el design, arma `tasks.md`
  tarea por tarea.
- **`verify-implementation`** — cuando la implementación termina,
  corre un loop end-to-end autónomo contra la app real en el
  navegador, no solo contra tests unitarios.

Cada spec vive en `docs/specs/<slug>/` con sus tres documentos
(`requirements.md`, `design.md`, `tasks.md`) aprobados antes de que se
escriba una sola línea de implementación.

### Subagents

Roles especializados con acceso a herramientas acotado a su función —
un `planner` no puede tocar código fuente, un `generate-tests` no
puede tocar `src/`, etc. Entre ellos: `planner` / `planner-iterate`
(iteran tareas del plan), `tasks-writer` (única escritura serializada
de `tasks.md`), `task-verifier` (audita si una tarea "Done" cumple de
verdad su intención, no solo si pasan los tests), `generate-tests`
(convierte el plan de e2e en specs de Playwright reales, anclados al
DOM de la app corriendo) y `healer` (corre el suite e2e y diagnostica
si el defecto está en el test o en la app).

### Workflows

Orquestación determinística de varios subagentes con paralelismo
controlado. El workflow `plan-tasks` evalúa varias tareas de
`tasks.md` en paralelo cuando son independientes entre sí —cada
`planner-iterate` corre de solo lectura y devuelve su propuesta como
dato estructurado— pero la escritura real del archivo queda
serializada en un único `tasks-writer` por lote, para que nunca haya
dos procesos escribiendo el mismo archivo a la vez.

### Loops

La etapa de verificación es un loop autónomo, no un paso único:
`plan-test-cases` → `generate-tests` → `healer` se repite hasta que el
suite e2e refleja de verdad el spec, contra la app real vía Playwright
MCP — no simulada.

### Reglas duras del harness

- Una sola skill (fuente de datos) a la vez — nada de frentes en
  paralelo durante ejecución (TDD).
- TDD estricto: test que falla → implementar → test que pasa.
- No se escribe código de una skill sin su spec aprobado en `docs/`.
- No se agregan dependencias sin necesidad.

## Stack

TypeScript + Node, sin frameworks. Tests con Vitest, e2e con
Playwright. Deploy en Vercel como función serverless.

```bash
npm run typecheck   # tsc --noEmit
npm test             # vitest run
npm run test:e2e     # playwright test, contra la app real
```
