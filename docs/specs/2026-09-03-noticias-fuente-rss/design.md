# Design Document: Noticias (fuente RSS)

## Overview

Implementa los 4 requirements de `requirements.md`: configuración de
feeds, descarga+parseo de RSS, formateo del briefing como HTML, y un
servidor local que lo sirve. Es el primer código del proyecto.

## Architecture

Todo nuevo, no hay código previo en el repo:

```
src/
  config.ts          # Requirement 1
  sources/
    rss.ts            # Requirement 2
  format/
    html.ts            # Requirement 3
  server.ts            # Requirement 4
  index.ts             # entry point / orquestación
```

También hace falta scaffolding mínimo de proyecto (`package.json`,
`tsconfig.json`, `vitest.config.ts`) ya que no existe ninguno todavía.
Sin dependencias nuevas más allá de `typescript` y `vitest`, que ya
están implícitas en `CLAUDE.md` (stack y comandos de verificación).

## Data Flow

```
index.ts
  → config.FEEDS (string[])
  → rss.fetchAllFeeds(FEEDS)          // por feed: fetch + parseRssXml,
                                       // fallos → [] para ese feed
  → NewsItem[] combinado
  → html.renderBriefing(items, config.MAX_ITEMS)
                                       // ordena por pubDate desc,
                                       // recorta a top N, renderiza
  → string HTML
  → server.startServer(html, config.PORT)
  → console.log(URL local)
```

El briefing se genera **una sola vez** al arrancar (Requirement 4.1);
todas las requests a `/` reciben el mismo HTML ya generado.

## Components / Interfaces

### `src/config.ts`

- **Exposes:**
  - `export const FEEDS: string[]`
  - `export const MAX_ITEMS: number` (default `15`)
  - `export const PORT: number` (default `3000`)
- **Depends on:** nada.

### `src/sources/rss.ts`

- **Exposes:**
  - `export interface NewsItem { title: string; link: string; pubDate: string; description: string }`
  - `export function parseRssXml(xml: string): NewsItem[]` — parseo puro, sin red, para poder testear con fixtures.
  - `export async function fetchFeed(url: string): Promise<NewsItem[]>` — descarga con `fetch` nativo y parsea con `parseRssXml`; nunca rechaza la promesa, en error resuelve `[]` (Requirement 2.4 / 2.5).
  - `export async function fetchAllFeeds(urls: string[]): Promise<NewsItem[]>` — llama `fetchFeed` para cada URL y aplana los resultados en una sola lista combinada.
- **Depends on:** `fetch` nativo de Node. Sin librería de XML.

### `src/format/html.ts`

- **Exposes:**
  - `export function renderBriefing(items: NewsItem[], maxItems: number): string` — ordena `items` por `pubDate` descendente, toma los primeros `maxItems`, y devuelve el HTML del briefing. Si la lista resultante está vacía, renderiza un mensaje de "no hay noticias" (Requirement 3.5) en vez de una lista vacía.
- **Depends on:** `NewsItem` de `rss.ts`.

### `src/server.ts`

- **Exposes:**
  - `export function startServer(html: string, port: number): http.Server` — crea un servidor `node:http` que responde `200`/`text/html` con el `html` recibido ante cualquier request, lo pone a escuchar en `port`, y devuelve la instancia.
- **Depends on:** `node:http`. Sin Express ni frameworks.

### `src/index.ts`

Sin exports — entry point. Lee `config`, llama `fetchAllFeeds`,
`renderBriefing`, `startServer`, y en el evento `listening` del server
imprime la URL local por consola (Requirement 4.3).

## Data Models

### `NewsItem`

```ts
interface NewsItem {
  title: string;
  link: string;
  pubDate: string;   // fecha cruda tal como viene del RSS (ej. RFC 822)
  description: string; // "" si el <item> no la trae (Requirement 2.3)
}
```

El orden por fecha (Requirement 3.2) se calcula con
`new Date(item.pubDate).getTime()` en el momento de renderizar — no se
guarda un campo de fecha parseada aparte.

## Error Handling

| Error case | System response | Requirement |
|---|---|---|
| Falla la descarga de un feed (red o status no-2xx) | Se loguea el error; ese feed aporta `[]` ítems a la lista combinada; el resto de los feeds se sigue procesando | Requirement 2.4 |
| Contenido descargado no es XML/RSS válido | Se loguea el error; ese feed aporta `[]` ítems | Requirement 2.5 |
| Lista de feeds configurada vacía | Se genera el briefing sin ítems, sin excepción | Requirement 1.2 |
| Lista combinada de ítems vacía tras fetch + parseo | El HTML renderizado muestra un mensaje de "no hay noticias" | Requirement 3.5 |
| `<item>` sin `<description>` | Se incluye igual en el resultado con `description: ""` | Requirement 2.3 |

## Testing Strategy

- **`rss.ts`**
  - `parseRssXml`: fixture con feed bien formado y varios ítems; fixture con un ítem sin `<description>`; fixture XML vacío/malformado.
  - `fetchFeed`: mockeando `global.fetch` (`vi.stubGlobal`) — resuelve `[]` ante error de red y ante status no-2xx, sin lanzar.
  - `fetchAllFeeds`: combina resultados de varias URLs en una sola lista aplanada; la falla de un feed no afecta los ítems del resto.
- **`html.ts`**
  - `renderBriefing`: dada una lista desordenada, los ítems aparecen en el HTML en orden de fecha descendente; con más ítems que `maxItems`, solo aparecen los primeros N; con lista vacía, aparece el mensaje de "no hay noticias"; con un ítem de `description: ""`, renderiza sin romperse.
- **`server.ts` / `index.ts`**: sin tests unitarios — cableado fino de piezas ya cubiertas arriba, según lo acordado en brainstorming.

## Open Questions

- Si el RSS trae `pubDate` en un formato que `Date` no puede parsear, el orden de ese ítem queda indefinido (comparación con `NaN`). No está cubierto por un requirement explícito; se deja así para v1 y se revisa si aparece un caso real con un feed concreto.
- El scaffolding de proyecto (`package.json`, `tsconfig.json`, `vitest.config.ts`) no es parte del comportamiento descrito en `requirements.md`, pero es necesario antes de poder empezar TDD — se resuelve al arrancar la fase de ejecución, no en este spec.
