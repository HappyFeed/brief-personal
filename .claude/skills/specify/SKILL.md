---
name: specify
description: "Drafts and iterates requirements.md and design.md spec documents for a feature, following Kiro's requirements-first workflow with EARS notation (WHEN/IF/WHILE/WHERE ... THE SYSTEM SHALL ...), then hands off to the 'planning-tasks' skill to produce the approved tasks.md. Use this skill whenever the user wants to write, formalize, or update a spec, requirements document, or design document for a feature or skill — phrases like 'let's spec this out', 'write the requirements', 'draft the design doc', 'formalicemos esto', 'pasemos esto a docs/', or when a brainstorming/design discussion has just been approved and the project's workflow moves into the 'spec (docs/)' stage. It also orchestrates the full spec stage end to end, including invoking 'planning-tasks' once design.md is approved and getting the resulting tasks.md approved. Do NOT use it to write implementation code or tests — this skill's output is strictly three approved documents (requirements.md, design.md, tasks.md); executing those tasks is a separate, later step."
---

# Specify: requirements.md + design.md + tasks.md

Turns an already-approved idea into three written, human-approved
documents: `requirements.md` (what the system must do, in EARS
notation), `design.md` (how it will be built), and `tasks.md` (the
ordered implementation plan, which then doubles as the execution log
during TDD). This skill covers the **spec (docs/)** stage of the
project's workflow (`brainstorming → definición → spec (docs/) →
ejecución (TDD) → verificación → commit`). It starts after a design
has been approved in chat (see the `brainstorming` skill) and ends
when all three documents are approved.

This skill drafts `requirements.md` and `design.md` itself, but does
**not** draft `tasks.md` directly — once `design.md` is approved, it
hands off to the **`planning-tasks`** skill, which produces and
iterates `tasks.md` by launching the `planner` subagent (bootstrap
once, then one task at a time, sequentially) until every task is
trazable, right-sized, and contrasted against the real state of the
code. This skill never writes implementation code itself, and never
drafts `tasks.md` inline — actually executing `tasks.md` is a
separate, later step, out of scope for both skills.

<HARD-GATE>
Do not start `design.md` until `requirements.md` has been explicitly
approved by the user. Do not start `tasks.md` until `design.md` has
also been explicitly approved. Do not consider the spec finished — and
do not write, scaffold, or edit any implementation code — until
`tasks.md` has also been explicitly approved. This applies even for
changes that feel small or obvious. Silence or moving on to the next
topic is not approval; you need an explicit yes.
</HARD-GATE>

## Why requirements-first, and why EARS

This skill follows Kiro's **requirements-first** variant: Requirements →
Design → Tasks, each with its own approval gate. That order fits this
project because product behavior is usually clear from the
brainstorming conversation before the technical shape is decided, and
the technical shape needs to be settled before it's worth breaking
into an ordered task list.

EARS ("Easy Approach to Requirements Syntax") forces every acceptance
criterion into a testable sentence instead of a vague statement. That
matters here specifically because the next workflow stage is TDD with
Vitest — an acceptance criterion written as `WHEN X THE SYSTEM SHALL Y`
maps almost directly to a test case. Loose prose requirements don't.

**EARS patterns** (use whichever fits each criterion):

| Pattern | Form | Use for |
|---|---|---|
| Ubiquitous | `THE SYSTEM SHALL <response>` | Always-true behavior, no trigger |
| Event-driven | `WHEN <trigger> THE SYSTEM SHALL <response>` | Something happens, system reacts |
| Unwanted behavior | `IF <condition> THEN THE SYSTEM SHALL <response>` | Error/edge cases |
| State-driven | `WHILE <state> THE SYSTEM SHALL <response>` | Behavior tied to an ongoing state |
| Optional feature | `WHERE <feature is included> THE SYSTEM SHALL <response>` | Conditional/config-dependent behavior |

## The process

### 0. Locate context and confirm the slug

Before drafting anything:

- Read `CLAUDE.md`, any prior specs under `docs/specs/`, and the
  approved design from the brainstorming discussion in this
  conversation (or ask for it if this skill is invoked cold, without a
  prior brainstorming step in context).
- Pick a short kebab-case feature name (e.g. `noticias-fuente-rss`) and
  confirm it with the user if it's not obvious.
- The target folder is `docs/specs/<YYYY-MM-DD>-<feature-name>/`, using
  today's date, and will hold all three documents (`requirements.md`,
  `design.md`, `tasks.md`). Create it, and confirm the path with the
  user before writing into it if this is the first spec in the
  project.

### 1. Draft `requirements.md`

Use `assets/requirements-template.md` as the starting structure. For
each requirement:

- Write a short user story (`As a <role>, I want <capability>, so that
  <benefit>`) so the *why* survives even if the acceptance criteria
  change later.
- Write acceptance criteria as EARS sentences, one behavior per line.
  Cover the happy path AND the edge/error cases the brainstorming
  conversation surfaced — don't leave error handling implicit.
- Add an "Out of Scope" note for anything the brainstorming discussion
  explicitly excluded, so it doesn't quietly creep back in during
  design.

Write the file to `docs/specs/<slug>/requirements.md`, then show the
user the content (or a section-by-section summary for a long doc) in
chat.

### 2. Approval gate — requirements

Ask directly whether the requirements are approved or need changes.
Iterate on the file in place based on feedback. Do not move to design
until you get an explicit approval.

### 3. Draft `design.md`

Only after requirements are approved. Use
`assets/design-template.md` as the starting structure, and ground every
section in the approved `requirements.md` — if a design decision
doesn't trace back to a requirement, either the requirement is missing
something or the design is adding scope that wasn't asked for. Cover
at least:

- **Architecture** — what modules/files this touches and how it fits
  the existing structure.
- **Data Flow** — how data moves through the feature end to end.
- **Components/Interfaces** — the functions/types each new piece
  exposes and how callers use them.
- **Data Models** — the shapes of the data involved.
- **Error Handling** — what can go wrong and what happens when it
  does, mapped back to the "IF ... THEN" requirements.
- **Testing Strategy** — how this will be covered with Vitest,
  called out per component, since the next workflow stage is TDD.

Write the file to `docs/specs/<slug>/design.md` and present it the same
way as the requirements doc.

### 4. Approval gate — design

Same pattern as step 2: ask, iterate, wait for an explicit yes.

### 5. Hand off `tasks.md` to `planning-tasks`

Only after design is approved. Don't draft `tasks.md` yourself — invoke
the **`planning-tasks`** skill (via the Skill tool) pointed at
`docs/specs/<slug>/`. That skill reads the now-approved
`requirements.md`/`design.md`, detects whether `tasks.md` needs a
bootstrap pass or already has tasks to iterate, and drives the
`planner` subagent (bootstrap once, then one task at a time,
sequentially — never in parallel, per `CLAUDE.md`) until every task in
the plan has been iterated at least once: trazable to a requirement,
right-sized for one TDD cycle, necessary given the real state of the
code, and correctly ordered by dependency. It never writes
implementation code, and it leaves **Decision log** and **Outcome**
empty on every task — those fill in during execution, from real
decisions, not while planning.

`planning-tasks` reports back a consolidated summary (what changed per
task, open gaps, coverage confirmation). Present that summary — and
the resulting `docs/specs/<slug>/tasks.md` — to the user the same way
as the other two documents.

### 6. Approval gate — tasks

Same pattern as steps 2 and 4: ask directly, iterate, wait for an
explicit yes. If the user wants changes to a specific task after
review, don't hand-edit `tasks.md` — invoke `planning-tasks` again (or
the `planner` subagent directly) for just that task, so the change
stays contrasted against the real code and consistent with the rest of
the plan.

### 7. Hand off

Once all three documents are approved, tell the user the spec is
ready at `docs/specs/<slug>/` and that the next step is executing
`tasks.md` (TDD) per `CLAUDE.md`'s workflow — outside this skill's
scope. Don't start implementing any task yourself, even if it seems
like the obvious next message; writing code and filling in each
task's Decision log and Outcome as it's completed is a distinct,
later step.

## Red flags

| Thought | Reality |
|---|---|
| "The design is already clear from brainstorming, I can skip the requirements gate" | Brainstorming approves an idea in chat; this skill produces a written artifact the user needs to separately sign off on. |
| "This requirement is obvious, EARS feels like overkill for one line" | The point isn't ceremony — it's that a vague requirement can't become a test later. Keep it EARS even when it's short. |
| "The user didn't object, so it's probably approved" | Silence or moving to another topic isn't approval. Ask directly. |
| "While I'm here, let me start implementing T1" | This skill stops at an approved tasks.md — writing code is the next, separate workflow stage. |
| "I'll pre-fill the Decision log so tasks.md feels complete" | The log records real decisions made during execution; pre-filling it invents a history that hasn't happened yet. |
| "The design should also fix this unrelated thing I noticed" | If it's not traceable to a requirement, flag it separately instead of folding it into this spec. |
| "I'll just draft tasks.md myself, it's faster than invoking another skill" | `planning-tasks` exists specifically to contrast each task against the real state of the code and iterate it properly — drafting it inline here skips that, and produces a plan this skill isn't built to validate. |

## Templates

- `assets/requirements-template.md` — structure for `requirements.md`.
- `assets/design-template.md` — structure for `design.md`.
- `assets/tasks-template.md` — structure for `tasks.md`, used by the
  `planner` subagent (via `planning-tasks`), not by this skill
  directly. Kept here for reference since it's still part of the spec
  this skill is responsible for getting approved.

Copy `requirements-template.md` and `design-template.md` as the
starting point rather than free-forming the structure; keep the
section headers so specs stay consistent across features.
