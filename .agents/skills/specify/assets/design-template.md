# Design Document: [Feature Name]

## Overview

[What this design implements, in a couple of sentences. Reference
`requirements.md` in the same folder rather than repeating it.]

## Architecture

[High-level structure: what modules/files this touches, new vs.
existing, and how it fits into the current project structure.]

## Data Flow

[How data moves through the system for this feature, end to end.
Prose or a simple ASCII sketch — pick whichever is clearer for this
feature.]

## Components / Interfaces

[The functions/types each new piece exposes, and how other code is
expected to call them. One subsection per component if there's more
than one.]

### [Component name]

- **Exposes:** [function/type signatures]
- **Depends on:** [other components, external libs — flag anything
  new per CLAUDE.md's "no dependencies without need" rule]

## Data Models

[The shapes of the data this feature works with — types, interfaces,
or schemas, plus a one-line note on where each one comes from or goes
to.]

## Error Handling

[What can go wrong, and what the system does in each case. Map each
entry back to an "IF ... THEN THE SYSTEM SHALL ..." criterion in
requirements.md so nothing here is invented mid-design.]

| Error case | System response | Requirement |
|---|---|---|
| [what goes wrong] | [what happens] | [Requirement N] |

## Testing Strategy

[What gets unit-tested vs. integration-tested with Vitest, called out
per component from the section above. Name the key edge cases from
requirements.md that need their own test, not just the happy path.]

## Open Questions

[Anything left deliberately undecided or deferred — flag it here
instead of silently picking an answer.]
