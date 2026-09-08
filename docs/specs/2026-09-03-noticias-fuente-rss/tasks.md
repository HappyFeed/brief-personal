# Tasks: Noticias (fuente RSS)

**Status:** Draft
**Date:** 2026-09-03
**Requirements:** ./requirements.md
**Design:** ./design.md

Implementa la primera skill del briefing diario personal: configuración
de feeds RSS, descarga+parseo, formateo a HTML y servidor local que lo
sirve. Es el primer código del repo — no hay `src/`, `package.json` ni
harness de test todavía.

## How to use this document

- Work tasks **one at a time, top to bottom**; don't start a task
  until its dependencies are `[x]`.
- Follow **TDD**: red → green → verify, per task.
- Append to the **Decision log** as you go — every non-obvious choice,
  discovery, or deviation from `design.md`. Don't draft it upfront.
- If `design.md` o `requirements.md` turn out to be wrong or
  incomplete, update them and note it in the task's Decision log.

## Status legend

| Marker | Meaning |
|---|---|
| `[ ]` | Pending — not started |
| `[~]` | In progress |
| `[x]` | Done — tests pass, verified |
| `[!]` | Blocked — see Decision log |

## Task overview

- [x] **T1** — Scaffolding de proyecto + `config.ts`
- [x] **T2** — `parseRssXml`: parseo puro de XML RSS
- [ ] **T3** — `fetchFeed`: descarga por HTTP que nunca rechaza
- [ ] **T4** — `fetchAllFeeds`: combinación de múltiples feeds
- [ ] **T5** — `renderBriefing`: orden, límite N y HTML por ítem
- [ ] **T6** — Servidor HTTP + orquestación de arranque

## Requirements coverage

| Requirement criterion | Task(s) |
|---|---|
| 1.1 | T1 |
| 1.2 | T4, T5 |
| 2.1 | T3 |
| 2.2 | T2 |
| 2.3 | T2 |
| 2.4 | T3 |
| 2.5 | T2, T3 |
| 3.1 | T4 |
| 3.2 | T5 |
| 3.3 | T1, T5 |
| 3.4 | T5 |
| 3.5 | T5 |
| 4.1 | T6 |
| 4.2 | T6 |
| 4.3 | T6 |
| 4.4 | T1, T6 |

---

## Tasks

### T1 — Scaffolding de proyecto + `config.ts`

- **Status:** `[x]`
- **Traces to:** 1.1, 3.3 (valor por defecto de `MAX_ITEMS`), 4.4 (valor por defecto de `PORT`) · design.md Architecture (scaffolding), `src/config.ts`
- **Depends on:** none

**Objective:** Existe un proyecto Node/TypeScript ejecutable con harness
de test (`vitest`) funcionando, y `src/config.ts` expone `FEEDS`
(`string[]`), `MAX_ITEMS` (default `15`) y `PORT` (default `3000`).

**TDD plan:**

1. **Setup (prerequisite, no es TDD en sí):** crear `package.json`
   (scripts `typecheck` → `tsc --noEmit`, `test` → `vitest run`,
   devDependencies `typescript` + `vitest`), `tsconfig.json` y
   `vitest.config.ts` mínimos, y correr `npm install`. Sin esto no hay
   forma de ejecutar ningún test todavía — es un prerequisito de
   entorno, no un comportamiento a testear.
2. **Test (red):** con el harness ya instalado, crear
   `src/config.test.ts` que importe `FEEDS`, `MAX_ITEMS`, `PORT` de
   `./config` y asserte `Array.isArray(FEEDS)`, `MAX_ITEMS === 15`,
   `PORT === 3000`. `npm test` falla porque `src/config.ts` todavía no
   existe.
3. **Implement (green):** crear `src/config.ts` con
   `export const FEEDS: string[] = []`, `export const MAX_ITEMS = 15`,
   `export const PORT = 3000`.
4. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(append-only, newest entry at the bottom)*

- El plan no fijaba ESM vs CommonJS ni el `target`/`module` de
  `tsconfig.json`. Elegí ESM (`"type": "module"` en `package.json`,
  `target`/`module: ES2022`, `moduleResolution: bundler`) porque
  `design.md` usa `fetch` nativo y `node:http` sin mención de
  compatibilidad CommonJS, y es el default recomendado para proyectos
  Node nuevos.
- `vitest.config.ts` con `environment: 'node'` explícito (no jsdom):
  no hay código de browser en este proyecto.

**Outcome:** Scaffolding creado (`package.json`, `tsconfig.json`,
`vitest.config.ts`) y `src/config.ts` con `FEEDS`/`MAX_ITEMS`/`PORT`.
`npm run typecheck` y `npm test` pasan (3 tests verdes).

### T2 — `parseRssXml`: parseo puro de XML RSS

- **Status:** `[x]`
- **Traces to:** 2.2, 2.3, 2.5 (parcial: parseo de XML inválido no
  lanza) · design.md `src/sources/rss.ts` (`NewsItem`, `parseRssXml`)
- **Depends on:** T1

**Objective:** `parseRssXml(xml: string): NewsItem[]` extrae
título/link/pubDate/descripción de cada `<item>` de un feed RSS bien
formado, usa `""` cuando falta `<description>`, y devuelve `[]` sin
lanzar excepción ante un string vacío o XML malformado.

**TDD plan:**

1. **Test (red):** en `src/sources/rss.test.ts`, tres casos con
   fixtures XML inline: (a) feed bien formado con 2+ `<item>` → array
   con título/link/pubDate/description correctos por ítem, en el mismo
   orden del XML; (b) un `<item>` sin `<description>` → esa entrada
   tiene `description: ""`; (c) string vacío y string que no es XML
   válido → `parseRssXml` devuelve `[]` sin lanzar.
2. **Implement (green):** crear `src/sources/rss.ts` con la interface
   `NewsItem` y la función `parseRssXml` (extracción por
   string/regex, sin librería de XML, según Out of Scope de
   `requirements.md`).
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:**

- Extracción por regex simple (`<item>...</item>` y luego un regex por
  tag dentro de cada item), con decodificación de CDATA y de las
  entities XML básicas (`&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#39;`) para
  que títulos/descripciones con esos caracteres no queden con
  entities sin resolver. No usa ningún parser DOM/XML real, según Out
  of Scope de `requirements.md`.
- `parseRssXml` envuelve todo en try/catch por si el regex matching
  sobre un input adversarial lanzara, aunque en la práctica los
  regex usados no lanzan — es defensivo, no porque haya un caso
  identificado que lo requiera.

**Outcome:** `src/sources/rss.ts` con `NewsItem` y `parseRssXml`.
`npm run typecheck` y `npm test` pasan (7 tests verdes en total, 4
nuevos de `rss.test.ts`).

### T3 — `fetchFeed`: descarga por HTTP que nunca rechaza

- **Status:** `[ ]`
- **Traces to:** 2.1, 2.4, 2.5 · design.md `src/sources/rss.ts`
  (`fetchFeed`)
- **Depends on:** T2

**Objective:** `fetchFeed(url: string): Promise<NewsItem[]>` descarga
con `fetch` nativo; ante error de red, respuesta no exitosa, o
contenido descargado que no parece RSS/XML válido, loguea el error y
resuelve `[]` en vez de rechazar la promesa; con una respuesta exitosa
y contenido reconocible como RSS/XML, delega el parseo en
`parseRssXml` (un feed válido con cero `<item>` no es un error y no se
loguea).

**TDD plan:**

1. **Test (red):** mockear `global.fetch` con `vi.stubGlobal` —
   (a) éxito (status 200, body con XML RSS válido y al menos un
   `<item>`) → items parseados, sin loguear error;
   (b) éxito (status 200, body con XML RSS válido pero sin `<item>`,
   ej. `<rss><channel></channel></rss>`) → resuelve `[]`, sin loguear
   error (feed válido vacío, no es el caso de contenido inválido de
   Requirement 2.5);
   (c) error de red (`fetch` rechaza) → resuelve `[]`, loguea el
   error, sin lanzar (Requirement 2.4);
   (d) status no-2xx → resuelve `[]`, loguea el error
   (Requirement 2.4);
   (e) éxito (status 200) pero body que no parece RSS/XML (ej. HTML de
   error, o un string arbitrario) → resuelve `[]` **y** loguea el
   error (Requirement 2.5, caso de contenido descargado inválido —
   distinto del caso (b), que es un feed válido sin ítems). Confirmar
   en los cinco casos que la promesa nunca rechaza.
2. **Implement (green):** `fetchFeed` con try/catch alrededor del
   `fetch` + chequeo de `response.ok`, logueando el error
   (`console.error`) y devolviendo `[]` en los casos de falla de red o
   status (Requirement 2.4); en el caso de respuesta exitosa, un
   chequeo liviano de que el body parece RSS/XML (por ejemplo, contiene
   una marca reconocible como `<rss` o `<?xml`, sin usar librería de
   parseo — el heurístico concreto se define en la ejecución) antes de
   delegar en `parseRssXml`: si no la parece, loguear el error y
   devolver `[]` sin llamar a `parseRssXml` (Requirement 2.5); si la
   parece, delegar el body en `parseRssXml` tal cual, sea cual sea la
   cantidad de ítems que devuelva.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:**

- *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T4 — `fetchAllFeeds`: combinación de múltiples feeds

- **Status:** `[ ]`
- **Traces to:** 1.2 (parcial), 3.1 · design.md `src/sources/rss.ts`
  (`fetchAllFeeds`)
- **Depends on:** T3

**Objective:** `fetchAllFeeds(urls: string[]): Promise<NewsItem[]>`
combina en una sola lista aplanada los ítems de todas las URLs
configuradas; la falla de un feed no afecta a los ítems de los demás,
y con `urls: []` devuelve `[]` sin lanzar.

**TDD plan:**

1. **Test (red):** mockear `fetch` para 2-3 URLs — una exitosa con
   ítems, otra que falla (red o status no-2xx) → asserte que el
   resultado combinado es una sola lista aplanada que contiene
   únicamente los ítems de la URL exitosa; caso `urls: []` → `[]` sin
   excepción.
2. **Implement (green):** `fetchAllFeeds` con `Promise.all` sobre
   `fetchFeed` por URL y aplanado (`flat`/`flatMap`) del resultado.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:**

- *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T5 — `renderBriefing`: orden, límite N y HTML por ítem

- **Status:** `[ ]`
- **Traces to:** 1.2 (parcial), 3.2, 3.3, 3.4, 3.5 · design.md
  `src/format/html.ts` (`renderBriefing`)
- **Depends on:** T2

**Objective:** `renderBriefing(items: NewsItem[], maxItems: number): string`
devuelve un string HTML con los ítems ordenados por `pubDate`
descendente, recortados a los primeros `maxItems`, cada uno con título
como link al artículo original, fecha de publicación y descripción; si
la lista resultante queda vacía, renderiza un mensaje de "no hay
noticias" en vez de una página vacía.

**TDD plan:**

1. **Test (red):** en `src/format/html.test.ts` —
   (a) lista de ítems con `pubDate` desordenados → los títulos
   aparecen en el HTML resultante en orden de fecha descendente;
   (b) más ítems que `maxItems` → en el HTML solo aparecen los
   primeros N títulos; (c) por cada ítem, el HTML incluye el título
   como link (`<a href="...">título</a>`) al `link` original, la fecha
   de publicación y la descripción; (d) un ítem con `description: ""`
   se renderiza sin romper el HTML; (e) lista vacía → el HTML
   generado contiene un mensaje de "no hay noticias" en vez de una
   lista vacía o markup roto.
2. **Implement (green):** `renderBriefing` en `src/format/html.ts`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:**

- *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T6 — Servidor HTTP + orquestación de arranque

- **Status:** `[ ]`
- **Traces to:** 4.1, 4.2, 4.3, 4.4 · design.md `src/server.ts`,
  `src/index.ts`
- **Depends on:** T1, T4, T5

**Objective:** Al arrancar la app, se descarga y formatea el briefing
una sola vez, se levanta un servidor `node:http` en el puerto
configurado, cualquier request a `/` responde con ese HTML ya
generado, y al arrancar con éxito se imprime la URL local por consola.

**TDD plan:**

1. **Test (red):** según la Testing Strategy de `design.md`,
   `server.ts` e `index.ts` no llevan test unitario — son cableado de
   piezas ya cubiertas por los tests de T1-T5 (decisión ya acordada en
   brainstorming). No hay paso "red" automatizado para esta tarea.
2. **Implement (green):** `startServer(html: string, port: number): http.Server`
   en `src/server.ts` (crea un servidor `node:http` que responde
   `200`/`text/html` con el `html` recibido ante cualquier request,
   escucha en `port`, y devuelve la instancia); `src/index.ts` como
   entry point sin exports que lee `config`, llama
   `fetchAllFeeds(config.FEEDS)` → `renderBriefing(items, config.MAX_ITEMS)`
   → `startServer(html, config.PORT)`, y en el evento `listening` del
   server imprime la URL local por consola. Agregar a `package.json`
   (creado en T1) un script `start` que ejecute `src/index.ts`
   directamente sin agregar dependencias nuevas (ej. soporte nativo de
   Node para ejecutar TypeScript, no `ts-node`/`tsx`) — es lo mínimo
   necesario para poder levantar el entry point de punta a punta en el
   chequeo manual del paso siguiente; el comando exacto es una decisión
   de implementación a anotar en el Decision log.
3. **Verify:** `npm run typecheck` && `npm test` (sin regresión en los
   tests existentes); chequeo manual: correr `npm start` (o el comando
   equivalente definido en el paso anterior) y hacer una request a `/`
   para confirmar que devuelve el HTML del briefing y que la consola
   imprimió la URL local al arrancar.

**Decision log:**

- *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

---

## Open items

- El manejo de `pubDate` en un formato que `Date` no puede parsear
  queda con orden indefinido (comparación con `NaN`) — anotado como
  Open Question en `design.md`, no cubierto por un requirement
  explícito; no genera tarea propia en v1.
- T6 no lleva test automatizado por decisión explícita de
  `design.md` (Testing Strategy). Si en la ejecución de T6 aparece
  lógica de orquestación con ramas no triviales (más allá del cableado
  simple descrito), reevaluar si amerita un test unitario y separarlo
  en una tarea nueva.
- Este plan es un primer bootstrap: se recomienda iterar cada tarea
  una por una (empezando por T1) para pulir tamaño, traza y necesidad
  con más detalle del que garantiza un primer pase.
