# Canonical Implementation Standard

Status: **normative**

This document defines the canonical engineering rules for the project. Existing code that conflicts with these rules is considered migration debt, not precedent.

## 1. Core rule

Every implementation follows the complete canonical workflow defined in
section 17.

Before adding a component, hook, helper, style, dependency, persistence shape, or abstraction:

1. inspect the current implementation;
2. identify existing reusable contracts;
3. reuse first;
4. generalize only when multiple real consumers justify it;
5. create something new only when reuse/generalization would make the code harder to understand.

The preferred outcome is the smallest implementation that remains explicit, readable, and reusable.

### 1.1. Normative startup and session protocol

The canonical repository is:

```text
dnncamargo/web-hubsocial
```

Every new implementation chat or session must begin by:

1. locating the actual local repository and worktree;
2. reading this document completely;
3. reading the normative domain documents relevant to the work area;
4. inspecting the current Git state: branch, `HEAD`, `origin/main`,
   ahead/behind relation, and worktree status;
5. recovering and understanding existing local work before creating a branch
   or modifying anything;
6. reading the relevant project architecture and implementation;
7. comparing implementation against normative product decisions;
8. identifying reuse opportunities and migration debt; and
9. deciding the smallest coherent next checkpoint only after that audit.

The local repository and worktree are the source of truth for implementation
state. A handoff is orientation, not authority over the actual Git state, and
must be verified locally before it is relied upon.

Normative product and engineering decisions live under `docs/` in documents
explicitly marked `Status: **normative**`. Legacy code that conflicts with a
normative document is migration debt unless a new explicit decision changes
the contract.

A new session must not start implementation until it can explain the current
implementation, applicable normative decisions, contract gaps, reusable
infrastructure, and the smallest coherent next checkpoint.

## 2. Engineering priorities

In order:

1. correctness;
2. legibility;
3. simplicity;
4. reuse;
5. consistency;
6. performance when evidence requires optimization;
7. abstraction only when it reduces real complexity.

Fewer lines are not automatically better code.

Avoid nested ternaries, long anonymous callbacks, generic names, speculative factories, wrappers that only rename an existing API, and abstractions created for a single hypothetical future use.

## 3. Canonical target stack

The target platform is:

```text
React 19
Vite
React Router
Firebase
native CSS
CSS Modules
Motion
date-fns
dnd-kit
Lucide
Node 24
```

### React
Use functional components, hooks, local state by default, and explicit props.

Do not introduce global state infrastructure for state that belongs to one feature or page.

Effects should synchronize with external systems. Do not use effects to derive values that can be calculated during render.

### Vite
Vite is the canonical build tool after the platform migration.

Public environment variables use `VITE_*`.

Legacy `NEXT_PUBLIC_*` variables are not supported. Public client configuration must use the canonical `VITE_*` prefix.

### React Router
React Router owns client-side routing.

Domain components should not depend on router APIs unless navigation is part of their responsibility.

### Firebase
Firebase remains the canonical authentication and persistence platform unless a separate architectural decision replaces it.

Firebase Auth state is the canonical application-session source. Google OAuth access tokens are integration credentials for Google APIs, not proof of application authentication. Protected application routing must not depend on a Google API access token.

Persisted domain entities have one canonical shape. Do not create separate schemas for views of the same entity.

Daily, weekly, monthly, agenda, and automation views must derive from the same canonical Task/Event data.

### Motion
Use `motion/react` for gestures, drag interactions, meaningful enter/exit transitions, and structural motion.

Prefer native CSS transitions for simple hover, focus, color, opacity, or small state changes.

### date-fns
Use date-fns plus canonical project helpers.

A `YYYY-MM-DD` value represents a civil date. Do not convert civil dates through UTC unless the operation explicitly requires an instant in time.

### dnd-kit
Use dnd-kit for structural drag-and-drop and reordering.

Do not create a parallel drag-and-drop system.

### Lucide
Lucide is the canonical icon library.

Do not add a second icon library when Lucide provides a suitable icon.

## 4. Non-canonical technologies

Do not introduce without an explicit architecture decision:

- Tailwind;
- Bootstrap;
- Material UI;
- Chakra UI;
- shadcn as a design system;
- styled-components;
- Emotion;
- another router;
- another CSS framework;
- another global state manager.

The Tailwind migration is complete. Native CSS, semantic CSS custom properties, and CSS Modules are canonical. Do not reintroduce a CSS framework without an explicit architectural decision. Historical references to Next.js or Tailwind may remain only as migration context.

## 5. Dependency policy

A new dependency must answer:

1. what problem does it solve?
2. why can the current stack not solve it clearly?
3. does it duplicate another package?
4. is it actively maintained?
5. what is the cost of removing it later?

Prefer browser/platform APIs when they are sufficient.

Examples:

- prefer `crypto.randomUUID()` over an external UUID package when supported;
- prefer CSS transitions over an animation library for trivial motion;
- prefer native fetch over adding another HTTP client.

Unused dependencies must be removed.

## 6. Canonical domain contracts

Core entities must have a single source of truth.

Examples:

```text
Event
Task
Person
OptionalField
Task recurrence
Daily execution
Automation rules
```

Do not define local interfaces that duplicate canonical types.

Views may project domain data but must not persist parallel copies solely for presentation.

## 7. Actions and automation

Tasks and Events remain canonical entities.

"Ações do dia", "Esta semana", and "Este mês" are projections of the
canonical root entities, not separate persisted copies. Task placement is
derived from root Task nature, the three operational statuses, archive
lifecycle, recurrence/date, occurrence completion, Event association, and
root Task favorable conditions. The old generic manual `Hoje` / `Esta semana`
/ `Este mês` planning model is legacy compatibility where it conflicts with
the Task model; it is not a second canonical Task model.

Only root Tasks generate Projected Actions. Archived root Tasks are excluded
from operational projections and recurring archived Tasks do not generate
operational occurrences. An in-focus root Task has priority for the day
projection without mutating its recurrence or legacy planning metadata, and a
root Task must not appear twice across the visible action sections. Subtasks
never generate independent Actions.

Daily execution is distinct from Task lifecycle completion. Completing an
occurrence must not end a recurring Task. A completed Task remains persistent
and may be archived or restored without changing its operational status.

Automation rules evaluate favorable conditions and affect relevance or
highlighting. They do not create occurrences, change lifecycle status, or
silently remove an otherwise relevant/manual action when a condition is not
matched. Conditions belong to root Tasks; they do not own Subtask checkboxes
or create Subtask Actions. The effective visual state must respect lifecycle
precedence before favorable-condition highlighting.

For a Supertask, Subtasks are binary internal progress items. With at least
one Subtask, aggregate status is the source of truth: all incomplete means
`Não iniciada`, mixed means `Em foco`, and all complete means `Concluída`.
Only `Não iniciada` and `Concluída` are global commands, both confirmed by the
user; `Em foco` is derived from mixed progress. Recurring Subtask completion
is scoped to the current occurrence, not reset indiscriminately at midnight.

For the complete Task contract, including nature, recurrence, Event
association, daily execution, and Task/Supertask/Subtask structure, see
[`TASK_MODEL.md`](TASK_MODEL.md).

## 8. Reuse policy

Preferred order:

```text
reuse → extend/generalize → create
```

A new abstraction is justified when it reduces duplication or cognitive load for at least two real consumers.

Do not create generalized APIs in anticipation of unspecified future use.

A small amount of explicit duplication is preferable to a misleading abstraction.

## 9. Component policy

Create a React component when it has at least one of these:

- a reusable visual contract;
- reusable behavior;
- meaningful state;
- a clear conceptual responsibility;
- multiple real consumers.

Do not create a component merely to move a few lines of JSX into another file.

Keep domain-specific components near their domain.

## 10. Hook policy

A hook represents reusable behavior, not file organization.

Good examples:

```text
useEventDate
useAssociatePerson
useSelectableStringSetting
```

Avoid hooks that only wrap a single state variable or merely move component code without creating a reusable behavioral contract.

## 11. Persistence policy

All writers for the same entity must use the same canonical payload contract.

Do not allow different screens to create incompatible Event, Task, or Person documents.

Schema changes require:

1. evidence;
2. compatibility analysis;
3. migration strategy when historical data is affected;
4. tests for both current and legacy data when compatibility is retained.

The Task archive marker is the root-level `archivedAt?: Timestamp` wire. An
absent marker means Active; a valid Firestore Timestamp means Archived; and an
invalid legacy value is ignored defensively. Archive writes the current
Timestamp and restore deletes only the marker. It is never a fourth
operational status. The occurrence-scoped Subtask wire is
`lastCompletedOccurrenceDate?: string` using `YYYY-MM-DD` civil dates and the
existing recurrence engine's boundaries. No occurrence document or generated
occurrence identifier is introduced, and no bulk migration is performed.

Recurring root status uses the existing root completion marker
`lastActionCompletedDate?: string` plus the separate civil-date marker
`lastFocusedOccurrenceDate?: string` for `Em foco`. Both are evaluated by the
same occurrence-window helper. `getEffectiveTaskStatus(...)` is the read-safe
boundary for status consumers; reconciliation may persist a stale effective
status only after that derivation proves a new occurrence boundary. Archive
freezes this operational reconciliation while preserving status and markers.

New Subtasks are binary and deliberately lack root-Task capabilities such as
nature, schedule, recurrence, planning, focus date, Event association,
automation, conditions, and independent Actions. Hydration must preserve
legacy rich Subtask fields defensively; it must not erase them incidentally.

## 12. Configuration and instance identity

Surface identity is configuration, not technical identity.

The code uses neutral names such as:

```text
instance
brand
app
```

Do not encode a surface/instance name into:

- variables;
- CSS custom properties;
- storage keys;
- type names;
- contracts;
- component names;
- namespaces;
- persistence paths.

After the Vite migration, runtime public instance configuration uses:

```text
VITE_INSTANCE_NAME
VITE_INSTANCE_DESCRIPTION
```

## 13. Security and logging

Never log:

- access tokens;
- refresh tokens;
- authorization headers;
- passwords;
- private keys;
- secrets.

Development logs without operational value should be removed before merge.

Client-side route guards are UX controls, not data security boundaries. Firestore security must be enforced by Firebase rules/authentication.

## 14. Accessibility

Prefer semantic HTML.

Use `button` for actions and links for navigation.

Interactive elements must support keyboard use and visible `:focus-visible`.

Accessibility is part of implementation completeness, not a later polish stage.

## 15. File organization

Prefer organization by responsibility/domain rather than generic technical buckets when it improves locality.

Target direction:

```text
src/
  app/
  components/
    ui/
    auth/
  features/
    actions/
    events/
    people/
    tasks/
  config/
  hooks/
  types/
  utils/
  styles/
```

Do not reorganize files solely to match this tree. Move code when a work area benefits from the change.

## 16. Checkpoint discipline

Each checkpoint should have one narrow goal.

Do not combine unrelated:

- platform migration;
- visual redesign;
- authentication redesign;
- persistence migration;
- feature development;
- dependency cleanup.

Every checkpoint should be independently reviewable and reversible.

## 17. Repository and deployment discipline

The canonical workflow is:

```text
AUDIT → EVIDENCE → DECISION → REUSE → GENERALIZE only when justified
→ IMPLEMENT → VALIDATE → REVIEW DIFF → COMMIT → PUSH → PR → MERGE → SYNC MAIN
```

The local-first rule applies throughout this workflow. The coordinating
ChatGPT session must not directly write to GitHub through an API, MCP,
connector, or equivalent remote-write tool. Repository modifications happen
through the local coding-agent worktree.

Push only coherent, locally validated work. Do not push exploratory
checkpoints merely to preserve progress.

Repository writes are agent-owned. The coordinating ChatGPT session must not
directly mutate the GitHub repository through a GitHub API, MCP, connector, or
equivalent remote-write tooling. This prohibition includes:

- creating, updating, or deleting files;
- creating or moving refs;
- creating branches remotely;
- creating commits remotely;
- opening or modifying pull requests directly; and
- merging pull requests directly.

ChatGPT may use GitHub in read-only mode for audit, evidence, reviewing current
`main`, inspecting diffs, checking pull request state, and checking commit or
deployment status. Repository modifications must be executed by the coding
agent through the repository worktree.

For each checkpoint, use this local-first sequence:

1. synchronize local `main`;
2. confirm a clean worktree and `main == origin/main`;
3. create a local feature, fix, or documentation branch;
4. perform the coherent implementation on that branch;
5. validate locally;
6. review the complete diff;
7. run `git diff --check`; and
8. commit locally.

`IMPLEMENT` through local validation and diff review happen before the first
normal remote push.

A push to a Git-connected branch can trigger a Vercel deployment and consume
deployment or debugging capacity. Prefer local commits while a checkpoint is
being developed. Push only when the checkpoint is coherent and locally
validated; additional pushes should happen only when a real correction is
necessary after remote validation or review. Do not use Vercel deployments as
the normal inner development loop when local validation is sufficient. The
objective is to avoid unnecessary deployments, not to require exactly one push
under every circumstance.

## 18. Validation

Before commit:

```text
build
typecheck when available
tests when available
git diff --check
final diff audit
```

For feature work, validate the affected user flow.

For visual work, validate mobile from the beginning.

## 19. Git closure

An implementation is not finished merely because code exists, tests pass, a local commit
exists, the feature branch is pushed, or a pull request exists.

The complete cycle is finished only after:

1. coherent implementation;
2. relevant tests;
3. typecheck;
4. build;
5. `git diff --check`;
6. final diff audit;
7. push;
8. pull request;
9. merge;
10. `git fetch --prune`;
11. switch to `main`;
12. `git pull --ff-only`; and
13. verify `branch == main`, `HEAD == origin/main`, and a clean worktree.

After merge, do not leave the repository on the feature branch.

## 20. Rule of interpretation

When legacy code conflicts with this document, do not copy the legacy pattern automatically.

First decide whether the legacy implementation should be migrated toward this standard.

The architecture should make the next implementation simpler, not harder.
