---
name: brainstorming
description: "Usar antes de definir una skill nueva, un cambio de comportamiento o cualquier trabajo creativo: explora la intención, las restricciones y el diseño de una idea a través de diálogo, antes de escribir el spec o tocar código."
---

# Brainstorming: de idea a diseño

Ayuda a convertir una idea en un diseño validado a través de diálogo
colaborativo, uno a la vez. Esta skill cubre solo la etapa de
**brainstorming → definición** del workflow del proyecto. Termina
cuando el diseño queda aprobado en el chat; escribir el spec en
`docs/` y la implementación (TDD) son etapas siguientes, fuera de esta
skill.

<HARD-GATE>
No escribas el spec, no toques `docs/`, no escribas código ni
scaffolding hasta que hayas presentado el diseño en el chat y el
usuario lo haya aprobado explícitamente. Esto vale incluso si el
cambio parece obvio o chico.
</HARD-GATE>

## Anti-patrón: "esto es muy simple para necesitar diseño"

Toda idea pasa por esta skill antes de la aprobación, sin importar el
tamaño. Para algo chico el "diseño" puede ser dos frases en el chat en
vez de varios párrafos, pero el gate de aprobación es el mismo. Lo que
escala con la simplicidad es el tamaño del diseño, nunca la necesidad
de aprobarlo.

## El proceso

1. **Explorar el contexto del proyecto** — revisar `CLAUDE.md`, código
   existente, specs previos en `docs/`, y commits recientes antes de
   preguntar nada.
2. **Evaluar el alcance** — si el pedido en realidad son varias skills
   o subsistemas independientes, decilo de entrada y proponé
   descomponerlo antes de refinar detalles de una sola pieza. Cada
   pieza hace su propio ciclo brainstorming → spec → implementación
   por separado (una skill a la vez, según `CLAUDE.md`).
3. **Hacer preguntas de a una** — para entender propósito,
   restricciones y criterio de éxito. Preferí opción múltiple cuando
   tenga sentido; abiertas también sirven. Un tema por mensaje, no
   amontones preguntas.
4. **Proponer 2-3 enfoques** — con sus trade-offs. Liderá con el que
   recomendás y explicá por qué. Aplicá YAGNI sin piedad: sacá de cada
   enfoque todo lo que no haga falta para resolver el pedido actual.
5. **Presentar el diseño en el chat** — en secciones, escaladas a su
   complejidad (de una frase a un párrafo corto, no un documento
   entero). Preguntá después de cada sección si va bien encaminado.
   Cubrí como mínimo: qué se construye, qué archivos/skills toca, y
   cómo se va a probar (Vitest, TDD).
6. **Parar y esperar aprobación explícita** — no sigas a menos que el
   usuario diga que sí. Presentar el diseño y avanzar en el mismo
   mensaje es saltearse el gate.

## Red flags

| Pensamiento | Realidad |
|---|---|
| "Esto es tan simple que no hace falta mostrar el diseño" | Simple implica un diseño corto, no ausencia de diseño. |
| "Ya sé cómo se hace, empiezo mientras lee" | El gate es la aprobación, no la extensión del diseño. Presentá y esperá el sí. |
| "Es solo un ajuste chico a algo que ya existe" | Igual pasa por diseño y aprobación — la ceremonia es más corta, no cero. |
| "El diseño creció mientras preguntaba, pero ya avancé bastante" | Si aparece complejidad oculta, parate y decilo antes de seguir. |

## Trabajando en el código existente

- Explorá la estructura actual antes de proponer cambios. Seguí los
  patrones que ya existen en el proyecto (fuentes de datos como
  skills independientes, formateo sin LLM en v1, etc.).
- Si el código existente tiene problemas que afectan directamente lo
  que estás diseñando, incluí una mejora puntual como parte del
  diseño. No propongas refactors que no sirvan al objetivo actual.

## Diseño para aislar y clarificar

- Cada pieza nueva (skill, módulo, función) debe tener un propósito
  claro, comunicarse por una interfaz bien definida, y poder
  entenderse/probarse por separado.
- Para cada pieza nueva, deberías poder responder: ¿qué hace?, ¿cómo
  se usa?, ¿de qué depende?
- Si algo empieza a crecer mucho o a mezclar responsabilidades, es
  señal de que hace demasiado — decilo en el diseño en vez de
  ignorarlo.

## Reglas del proyecto que aplican durante el brainstorming

- Una skill (fuente de datos) a la vez — no diseñes en paralelo dos
  frentes nuevos, aunque el usuario los mencione juntos.
- No agregar dependencias sin necesidad — si un enfoque requiere una
  librería nueva, marcalo explícitamente como parte del trade-off.
- V1 es sin LLM — los enfoques que propongas no deben asumir un LLM en
  el pipeline salvo que el usuario lo pida explícitamente.

## Después de la aprobación

Esta skill termina acá. El siguiente paso del workflow (`CLAUDE.md`:
brainstorming → definición → **spec (docs/)** → ejecución (TDD) →
verificación → commit) es formalizar el diseño aprobado como spec.
Invocá la skill `specify` a continuación, pasándole el diseño aprobado
como contexto — no repitas el brainstorming ahí ni escribas vos mismo
`requirements.md` o `design.md` fuera de esa skill. No hace falta
preguntarle al usuario si quiere seguir: la aprobación del diseño en
este paso ya es la señal para pasar a `specify`; ese skill tiene sus
propios gates de aprobación para `requirements.md` y `design.md`.
