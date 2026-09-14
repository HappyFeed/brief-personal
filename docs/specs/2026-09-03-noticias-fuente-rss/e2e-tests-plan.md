# E2E test plan — Noticias (fuente RSS)

Spec: `docs/specs/2026-09-03-noticias-fuente-rss/`
Generado por la skill `plan-test-cases` · consumido por el subagente `generate-tests`

## Preconditions

- App: `npm start` en `http://localhost:3000` (`playwright.config.ts` lo arranca/reusa automáticamente para `npx playwright test`; `generate-tests`/`healer` asumen que ya está corriendo)
- Environment: ninguna — `src/config.ts` está versionado en el repo, sin variables de entorno
- State: ninguno especial. El briefing se genera **una sola vez** al arrancar el proceso (Requirement 4.1), contra los feeds reales configurados en `src/config.ts` (`techcrunch.com/category/artificial-intelligence/feed`, `artificialintelligence-news.com/feed`) — todas las requests a `/` devuelven el mismo HTML ya generado, no hace falta sembrar ni limpiar nada entre casos.

## Case 1 — Ver el briefing del día (happy path)

- **Traces to:** 3.1, 3.2, 3.4, 4.1, 4.2
- **Objective:** confirmar el flujo principal de punta a punta: la página muestra el briefing armado con noticias reales, cada una enlazando a su artículo original.
- **Preconditions:** ninguna además de las generales.
- **Steps:**
  1. Navegar a `/`.
  2. Leer el `<h1>` de la página.
  3. Contar los elementos `article` que no tengan la clase `empty`.
  4. Tomar el primer `article:not(.empty)` y leer su link (`h2 a`) y su descripción (`.description`).
- **Expected result:**
  - El `<h1>` dice exactamente "Briefing diario".
  - Hay al menos 1 `article:not(.empty)` visible (post-condición real, no solo que la página cargue: confirma que `fetchAllFeeds` + `renderBriefing` combinaron ítems de verdad).
  - El link del primer artículo (`h2 a`) tiene un `href` absoluto `http(s)://` que **no** apunta a `localhost` — es el artículo original en el medio que lo publicó (Requirement 3.4), no una ruta interna.
  - La descripción del primer artículo no está vacía.
- **Notes:** depende de que los feeds reales configurados respondan al momento de correr el test — si ambos estuvieran caídos simultáneamente, ver Case 3 de "Not covered by this plan" para por qué esto no se fuerza vía e2e.

## Case 2 — Contenido crudo de RSS no se filtra sin sanear (failure/degrade path)

- **Traces to:** 2.2 (parseo íntegro del `<item>`) — comportamiento defensivo de `src/format/html.ts::escapeHtml`, que no tiene un criterio EARS propio pero es observable y necesario para que 2.2 no degrade la UI.
- **Objective:** confirmar que la app degrada correctamente el contenido "sucio" que traen los feeds reales (entidades HTML, tags crudos) en vez de mostrarlo tal cual — el feed RSS no es un input confiable, y esto es lo que la app hace ante ese input adverso.
- **Preconditions:** ninguna además de las generales.
- **Steps:**
  1. Navegar a `/`.
  2. Leer el texto visible de todos los `article h2` (títulos) y `.description` (descripciones).
- **Expected result:**
  - Ningún título ni descripción contiene una entidad HTML cruda sin decodificar (patrón `&#\d+;` o `&[a-zA-Z]+;`, p. ej. `&amp;`, `&#8217;`).
  - Ningún título ni descripción contiene un tag HTML crudo sin escapar (patrón `</?[a-z][^>]*>`, p. ej. `<b>`, `<a href=...>`).
- **Notes:** es determinístico independientemente del contenido puntual de los feeds en el momento de la corrida — la propiedad ("nunca se filtra HTML/entidades crudas") vale para cualquier ítem real que llegue, no depende de que exista un ítem específico con ese problema hoy.

## Case 3 — Límite de ítems mostrados (failure/degrade path)

- **Traces to:** 3.3
- **Objective:** confirmar que el briefing nunca muestra más ítems que el límite configurado, aunque los feeds combinados traigan más — la app tiene que degradar (truncar) en vez de mostrar una lista sin límite.
- **Preconditions:** ninguna además de las generales.
- **Steps:**
  1. Navegar a `/`.
  2. Contar los elementos `article:not(.empty)`.
- **Expected result:**
  - La cantidad de `article:not(.empty)` es menor o igual a 15 (`MAX_ITEMS` por defecto en `src/config.ts`).
- **Notes:** la aserción (`count <= 15`) es válida sin importar cuántos ítems combinados traigan los feeds ese día — si son menos de 15, la cota se cumple trivialmente; si son más, ejercita de verdad el truncamiento de `renderBriefing`. No hace falta forzar un número exacto de ítems.

## Criteria coverage

| Criterion | Case | Covered as |
|---|---|---|
| 3.1 | 1 | happy path |
| 3.2 | 1 | happy path |
| 3.3 | 3 | failure/degrade path |
| 3.4 | 1 | happy path |
| 4.1 | 1 | happy path |
| 4.2 | 1 | happy path |
| 2.2 | 2 | failure/degrade path (comportamiento defensivo) |

## Not covered by this plan

- **1.2** (lista de feeds vacía → briefing sin ítems, sin excepción) y **3.5** (lista combinada vacía → mensaje de "no hay noticias") — no son forzables de forma determinística vía e2e contra esta app tal como está construida: el briefing se genera **una sola vez, server-side, al arrancar el proceso** (`index.ts`), antes de que Playwright se conecte; no hay ninguna request de browser que interceptar (`page.route()` no alcanza un `fetch` que corre en Node, no en la página), y sobreescribir `src/config.ts` con una lista vacía para forzar el estado requeriría reiniciar el server con otra configuración — fuera del alcance de un test e2e, y explícitamente fuera de alcance del propio spec ("Configuración de feeds por variable de entorno o argumento de línea de comandos" está en su Out of Scope). Esto ya está cubierto de forma determinística a nivel unitario: `html.test.ts` prueba `renderBriefing([])` directamente (ver `design.md` → Testing Strategy).
- **2.3** (`<item>` sin `<description>` → se incluye con descripción vacía) — mismo problema de raíz: depende de que algún ítem *real* del feed en el momento de la corrida carezca de descripción, lo cual no es controlable ni predecible desde el test (no hay forma de garantizarlo hoy ni en corridas futuras sin volverse un test flaky). Cubierto de forma determinística a nivel unitario (fixture con XML armado a mano).
- **2.4** (descarga de un feed falla → se trata como lista vacía, se sigue con el resto) y **2.5** (XML inválido → se trata como lista vacía) — mismo problema: el fetch ocurre server-side al arrancar, no hay forma de inyectar una respuesta de red fallida o XML corrupto desde Playwright sin controlar el proceso Node del servidor, que además ya arrancó antes de que el test empiece. Cubierto de forma determinística a nivel unitario (`fetchFeed`/`fetchAllFeeds` con `global.fetch` mockeado).
- **2.1** — "WHEN la app arranca THE SYSTEM SHALL descargar cada URL configurada" es un detalle de arranque del proceso, no observable desde el browser una vez que la página ya está servida; se verifica indirectamente por Case 1 (si no hubiera descargado nada, no habría artículos) y de forma directa a nivel unitario.
- **4.3** (imprime la URL local por consola al arrancar) y **4.4** (usa puerto fijo 3000) — no son observables desde el browser; 4.4 ya está implícito en que `playwright.config.ts` usa `http://localhost:3000` como `baseURL` para toda la suite.
