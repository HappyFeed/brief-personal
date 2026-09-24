# Un loop verificable para tu proyecto

**Repo:** [`HappyFeed/brief-personal`](https://github.com/HappyFeed/brief-personal) · **Loop:** `verify-implementation` (`.claude/skills/verify-implementation/SKILL.md`).

**Tarea repetitiva:** cada vez que termino de implementar un spec, hay que escribir y corregir sus tests e2e. Eso lo hacía a mano. El loop toca dos artefactos:
- `e2e/noticias-fuente-rss.spec.ts`, el suite de Playwright.
- `docs/specs/2026-09-03-noticias-fuente-rss/e2e-tests-report.md`, el reporte.

## 1. Encargo

**Trigger:** se dispara solo cuando la última tarea de `tasks.md` pasa a `[x]`, o cuando lo pido.

**Condición de parada:** el veredicto del `healer`. Con `GREEN` termina. Con `CODE DEFECT` vuelve a TDD. Con `BLOCKED` avisa y se detiene.

**Reglas duras:**
- **Turnos:** máximo 3 vueltas de `generate-tests` → `healer`. Si no llega a `GREEN`, se detiene y reporta.
- **Costo y tiempo:** máximo 300k tokens de subagentes o 10 minutos por corrida. La cuenta sale del `<usage>` que trae cada subagente, y se chequea antes de lanzar el siguiente.
- **Tiempo por test:** 30 s por test y 60 s para que la app levante, según `playwright.config.ts`.

## 2. Verificador

El comando es `npm run test:e2e` (`playwright test`), y lo corre el `healer`. Su código de salida es determinístico sobre el mismo DOM: las aserciones son web-first, sin esperas fijas.

Encima de eso, el `healer` clasifica cada caso como `TEST DEFECT` o `CODE DEFECT` y detecta *false greens*, que son tests que pasan sin afirmar su criterio. Esa capa es juicio, no es determinística, y fue la que detectó el fallo de la evidencia.

## 3. Escalón y superficie

**Escalón:** *objetivo*. Itera hasta llegar a `GREEN`, con el tope de 3 vueltas.

**Superficie:** mi máquina, dentro de una sesión de Claude Code. El verificador necesita:
- Node con `npm start` sirviendo en `localhost:3000`.
- Los browsers de Playwright y el MCP de Playwright.
- Internet, porque los feeds RSS son reales.

**Quién dispara:** la skill. **Quién consume:** el orquestador enruta el veredicto, y yo leo el reporte.

## 4. Roles y permisos

| Rol | Quién | Puede tocar |
|---|---|---|
| Implementa | `generate-tests` (sonnet) | Solo `e2e/`. `Bash` para `npx playwright test` y el MCP de Playwright |
| Juzga | `healer` (sonnet) | Solo `e2e-tests-report.md`. Nunca edita tests ni `src/` |
| Orquesta | la skill | No escribe ningún artefacto, solo enruta |

**Cómo reparto el trabajo en la interfaz:** el agente usa el MCP de Playwright solo para explorar el DOM real y reproducir fallos. La verificación que se repite es un script de Playwright (`e2e/*.spec.ts`), porque es barata, estable y puede correr en CI. El agente es caro y no es determinístico.

## 5. Evidencia

**Corrida:** 2026-09-14, entre 18:17 y 18:22 (-05:00), sobre `e2e/noticias-fuente-rss.spec.ts`.

**Qué falló:** el suite estaba en verde, pero el Case 1 no afirmaba el orden por fecha (criterio 3.2) ni que la fecha fuera visible (parte de 3.4).

**Qué corrigió el loop:** `generate-tests` agregó las dos aserciones que faltaban. El `healer` volvió a correr y dio `GREEN`.

Vuelta 1, del `healer`:

```
VERDICT: TEST DEFECT
RUN: 6 passed / 0 failed (suite completo)
FALSE_GREENS: Case 1 — pasa sin afirmar 3.2 (orden) ni la parte de 3.4 sobre fecha de publicación visible
TEST_FIXES: Case 1 en `e2e/noticias-fuente-rss.spec.ts` — agregar aserción de orden descendente por fecha
  entre todos los `article:not(.empty)` (...) y aserción de que la fecha del primer artículo es visible/no vacía.
```

Vuelta 2, del `healer`, después de la corrección:

```
VERDICT: GREEN
RUN: 6 passed / 0 failed (suite completo); 3 passed / 0 failed (spec puntual, 2 corridas)
  Case 1 (...) → PASS → fix aplicado por generate-tests (orden descendente de fechas + fecha visible
  del primer artículo) cierra el gap de cobertura; reproducido a mano, 15 artículos en orden estrictamente descendente
FALSE_GREENS: ninguno
```

**Dónde quedó:** el veredicto final está en `docs/specs/2026-09-03-noticias-fuente-rss/e2e-tests-report.md`. El `healer` sobrescribe ese reporte en cada vuelta, así que la vuelta 1 solo quedó en el transcript de la sesión.

**Consumo:** 2 de 3 vueltas. El dato de tokens y tiempo sale del bloque `<usage>` que Claude Code adjunta a cada subagente terminado, en el transcript de la sesión `7aef7422-….jsonl`:

| Paso | Tokens | Tool uses | Duración |
|---|---|---|---|
| `generate-tests` #1 | 36 489 | 14 | 64,9 s |
| `healer` #1 | 49 176 | 17 | 120,9 s |
| `generate-tests` #2 (fix) | 29 661 | 11 | 41,5 s |
| `healer` #2 | 38 939 | 13 | 59,0 s |
| **Total** | **154 265** | **55** | **286,3 s (≈ 4,8 min)** |

Esta corrida es anterior a dos cambios:
- **El presupuesto de 300k tokens / 10 min.** Lo fijé después, tomando esta corrida como referencia. Medida contra ese tope, usó el 51 % de los tokens y el 48 % del tiempo.
- **`model: sonnet` en los subagentes.** En esta corrida usaron el modelo de la sesión principal.
