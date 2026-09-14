# E2E test report — Noticias (fuente RSS)

Spec: `docs/specs/2026-09-03-noticias-fuente-rss/` · Plan: `e2e-tests-plan.md` · Suite: `e2e/noticias-fuente-rss.spec.ts`
Producido por el subagente `healer` — solo diagnóstico, ningún código fue modificado.

## Verdict

**GREEN** — los 3 casos pasan de forma estable (2 corridas del spec, más el suite completo) y, tras el fix aplicado por `generate-tests` al Case 1, cada test afirma de verdad todos los criterios a los que dice trazar. No hay false greens ni code defects.

## Run

```
npm run test:e2e → 6 passed / 0 failed (suite completo, incluye e2e/briefing.spec.ts preexistente)

  ✓  1 e2e\briefing.spec.ts:7:3 › Briefing diario › muestra el título y la fecha del día (443ms)
  ✓  2 e2e\noticias-fuente-rss.spec.ts:12:1 › muestra el briefing del día con noticias reales que enlazan al artículo original (520ms)
  ✓  3 e2e\briefing.spec.ts:14:3 › Briefing diario › renderiza noticias sin entidades HTML ni tags crudos en título/descripción (451ms)
  ✓  4 e2e\noticias-fuente-rss.spec.ts:48:1 › sanea entidades HTML y tags crudos en títulos y descripciones (361ms)
  ✓  6 e2e\noticias-fuente-rss.spec.ts:69:1 › nunca muestra más ítems que el límite configurado (MAX_ITEMS) (361ms)
  ✓  5 e2e\briefing.spec.ts:31:3 › Briefing diario › cada noticia enlaza al artículo original (397ms)

  6 passed (2.1s)
```

Corrida puntual del spec de este plan, repetida dos veces para descartar flakiness de timing (resultado idéntico en ambas):

```
npx playwright test e2e/noticias-fuente-rss.spec.ts → 3 passed / 0 failed (corrida 1 y corrida 2)

  ✓  1 e2e\noticias-fuente-rss.spec.ts:12:1 › muestra el briefing del día con noticias reales que enlazan al artículo original (487ms / 463ms)
  ✓  2 e2e\noticias-fuente-rss.spec.ts:48:1 › sanea entidades HTML y tags crudos en títulos y descripciones (361ms / 354ms)
  ✓  3 e2e\noticias-fuente-rss.spec.ts:69:1 › nunca muestra más ítems que el límite configurado (MAX_ITEMS) (320ms / 364ms)

  3 passed (2.0s) / 3 passed (2.5s)
```

## Case by case

### Case 1 — Ver el briefing del día (happy path) · PASS · —

- **Traces to:** 3.1, 3.2, 3.4, 4.1, 4.2
- **Observed:** el test navega a `/`, verifica el `<h1>` ("Briefing diario"), cuenta `article:not(.empty)`, toma el primer artículo y verifica `href` absoluto no-localhost y descripción no vacía — y ahora además lee `.meta .date` del primer artículo (no vacía) y de **todos** los artículos, parsea cada texto con `Date`, verifica que ningún resultado es `NaN`, y que la secuencia completa es no-creciente (`dates[i] <= dates[i-1]`). Reproduje el flujo a mano con el MCP de Playwright (`browser_evaluate` sobre el DOM real, servidor ya corriendo): 15 artículos, fechas `Mon, 14 Sep 2026 21:51:02 +0000` → ... → `Sun, 13 Sep 2026 19:40:15 +0000`, estrictamente descendentes; primer `href` = `https://techcrunch.com/2026/09/14/nvidia-ceo-jensen-huang-...` (absoluto, no-localhost); primera descripción no vacía. Sin errores de consola.
- **Expected:** 3.1 (combina ítems de todos los feeds), 3.2 (orden descendente por fecha), 3.4 (cada ítem con título-link, fecha y descripción), 4.1/4.2 (server sirve el HTML generado una vez al arrancar).
- **Diagnosis:** GREEN. La aserción de orden (`dates[i] <= dates[i-1]` sobre toda la lista, no solo el primero) y la de fecha visible no vacía cierran el gap que reporté en la corrida anterior — ahora el test protegería una regresión futura en `renderBriefing` (orden roto o fecha faltante), cosa que antes no hacía.
- **Reproduced manually:** sí — navegué a `http://localhost:3000/` con el MCP de Playwright y confirmé visualmente y vía `browser_evaluate` que las 15 fechas están en orden descendente, que cada artículo expone `.meta .date`, y que el link/descripción del primero cumplen su criterio.
- **Recommended fix:** ninguno.

### Case 2 — Contenido crudo de RSS no se filtra sin sanear (failure/degrade path) · PASS · —

- **Traces to:** 2.2 (comportamiento defensivo de `escapeHtml`)
- **Observed:** el test lee todos los `article h2` y `.description`, y verifica que ninguno matchea `&#\d+;|&[a-zA-Z]+;` ni `<\/?[a-z][^>]*>`. Sin cambios respecto a la corrida anterior; sigue pasando de forma estable.
- **Expected:** ningún título/descripción debe mostrar entidades HTML ni tags sin escapar.
- **Diagnosis:** aserción real, verifica genuinamente el criterio, sin gaps.
- **Reproduced manually:** no re-verificado a mano en esta corrida (ya se había reproducido y confirmado en la corrida anterior sin cambios en el código de la app ni en este test).
- **Recommended fix:** ninguno.

### Case 3 — Límite de ítems mostrados (failure/degrade path) · PASS · —

- **Traces to:** 3.3
- **Observed:** el test cuenta `article:not(.empty)` y verifica `count <= 15`. En la reproducción manual el conteo fue 15 (`document.querySelectorAll('article:not(.empty)').length === 15`), lo cual sigue ejercitando de verdad el truncamiento (los feeds combinados traen más de 15 ítems).
- **Expected:** la cantidad de ítems mostrados nunca supera `MAX_ITEMS` (15 por defecto).
- **Diagnosis:** aserción real y no trivial (el límite se ejercita de verdad). Sin gaps.
- **Reproduced manually:** sí (conteo confirmado en 15 vía `browser_evaluate` en esta misma corrida).
- **Recommended fix:** ninguno.

## False greens

Ninguno.

## Blocked / not verifiable

Ninguno — el server ya estaba corriendo y respondió 200 en `http://localhost:3000/`; el suite completo corrió sin problemas de entorno.

## For the user

- Observación menor, fuera del alcance de este plan (no traza a ningún criterio evaluado acá, y ya señalada en la corrida anterior — se mantiene porque no fue parte del fix): el footer de la página dice "Esta página se genera de nuevo en cada visita", pero `design.md` (Requirement 4.1/4.2) especifica que el briefing se genera **una sola vez** al arrancar el proceso y todas las requests reciben el mismo HTML cacheado. El copy es engañoso respecto al comportamiento real. No es un criterio EARS violado, así que no se eleva a code defect, pero se señala por si `/specify` quiere corregir el texto o, alternativamente, ajustar el requirement.
