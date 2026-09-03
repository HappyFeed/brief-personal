# Tasks: [Feature Name]

**Status:** Draft
**Date:** [YYYY-MM-DD]
**Requirements:** ./requirements.md
**Design:** ./design.md

[1-2 sentences: what this task list implements. This file is both the
implementation plan AND the execution log — it doubles as the record
of *why* the code ended up the way it did, not just what got built.]

## How to use this document

- Work tasks **one at a time, top to bottom**; don't start a task
  until its dependencies are `[x]`.
- Follow **TDD**: red → green → verify, per task.
- Append to the **Decision log** as you go — every non-obvious choice,
  discovery, or deviation from `design.md`. Don't draft it upfront.
- If `design.md` or `requirements.md` turn out to be wrong or
  incomplete, update them and note it in the task's Decision log.

## Status legend

| Marker | Meaning |
|---|---|
| `[ ]` | Pending — not started |
| `[~]` | In progress |
| `[x]` | Done — tests pass, verified |
| `[!]` | Blocked — see Decision log |

## Task overview

<!-- Flat checklist for a quick progress view. Keep titles identical to
the detailed entries below. Order = execution order. -->

- [ ] **T1** — [short title]
- [ ] **T2** — [short title]

## Requirements coverage

<!-- Reverse map: every acceptance criterion in requirements.md must
appear here, mapped to the task(s) implementing it. A criterion with
no task is a gap — fill it before starting. Criterion IDs are
"Requirement N.criterion #", e.g. 1.1 = Requirement 1, criterion 1. -->

| Requirement criterion | Task(s) |
|---|---|
| 1.1 | T1 |
| 1.2 | T1, T2 |

---

## Tasks

<!-- One detailed entry per task. Fill in the plan before starting;
fill in Decision log and Outcome as you execute. Remove the [...]
guidance as you go. -->

### T1 — [short, specific, action-oriented name]

- **Status:** `[ ]`
- **Traces to:** [requirement criteria, e.g. 1.1, 1.2] · [design.md component/section]
- **Depends on:** [task IDs, or "none"]

**Objective:** [One sentence: what capability exists once this task is done.]

**TDD plan:**

1. **Test (red):** [the failing test to write — name it, state what it asserts]
2. **Implement (green):** [the smallest change that makes it pass]
3. **Verify:** `npm run typecheck` && `npm test`, plus any manual check

**Decision log:** *(append-only, newest entry at the bottom)*

- [YYYY-MM-DD] — [decision or finding] — [why]

**Outcome:** *(fill in when Done — what shipped, tests added, follow-up left for a later task)*

### T2 — [short, specific, action-oriented name]

- **Status:** `[ ]`
- **Traces to:** [requirement criteria] · [design.md component/section]
- **Depends on:** [task IDs, or "none"]

**Objective:** [...]

**TDD plan:**

1. **Test (red):** [...]
2. **Implement (green):** [...]
3. **Verify:** `npm run typecheck` && `npm test`, plus any manual check

**Decision log:**

- *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

<!-- Add one "### TN" block per unit of work, small enough to commit
on its own. -->

---

## Open items

<!-- Things discovered mid-implementation that aren't yet a task:
deferred work, newly found edge cases, tech debt taken on purpose.
Promote to a real task or push to a later spec. Remove section if empty. -->

- [item]
