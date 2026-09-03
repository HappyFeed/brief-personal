# Briefing Diario Personal

Proyecto de ejemplo para una app que arma un **briefing diario personal**: junta info de
distintas fuentes (empezando por noticias de un tema de interés) y la entrega en un
resumen legible. V1 sin LLM — solo junta y formatea datos.

## Stack

- TypeScript + Node
- Vitest (tests)

## Comandos de verificación

```bash
npm run typecheck   # tsc --noEmit
npm test             # vitest run
```

## Workflow de trabajo

brainstorming → definición → spec (docs/) → ejecución (TDD) → verificación → commit

## Reglas

- Una skill (fuente de datos) a la vez. No abrir frentes en paralelo.
- TDD: test que falla → implementar → test que pasa.
- No agregar dependencias sin necesidad.
- No se escribe código de una skill sin su spec en docs/ ya definida.
