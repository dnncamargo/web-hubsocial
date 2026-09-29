# Canonical Implementation Standard

Status: **normative**

This document defines the canonical engineering rules for the project. Existing code that conflicts with these rules is considered migration debt, not precedent.

## 1. Core rule

Every implementation follows:

```text
AUDIT → EVIDENCE → DECISION → REUSE → GENERALIZE → IMPLEMENT → VALIDATE
```

Before adding a component, hook, helper, style, dependency, persistence shape, or abstraction:

1. inspect the current implementation;
2. identify existing reusable contracts;
3. reuse first;
4. generalize only when multiple real consumers justify it;
5. create something new only when reuse/generalization would make the code harder to understand.

The preferred outcome is the smallest implementation that remains explicit, readable, and reusable.

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
Action planning
Automation rules
```

Do not define local interfaces that duplicate canonical types.

Views may project domain data but must not persist parallel copies solely for presentation.

## 7. Actions and automation

Tasks and Events remain canonical entities.

"Actions of the Day", "Actions of the Week", and "Actions of the Month" are projections of those entities, not separate persisted copies.

Automation rules affect relevance and highlighting. They do not silently remove an action that the user manually included.

Example:

```text
Task: wash clothes
Manual horizon: day
Rule: sunny weather

Sunny:
→ action remains visible and is highlighted

Not sunny:
→ action remains visible and loses the automation highlight
```

Automation evaluation must be deterministic and explainable to the UI.

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

Do not push partial exploratory work merely to preserve progress. The complete
canonical execution flow is:

```text
AUDIT → EVIDENCE → DECISION → REUSE → GENERALIZE → IMPLEMENT → VALIDATE
→ REVIEW DIFF → COMMIT → PUSH → PR → MERGE → SYNC MAIN
```

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

A checkpoint is complete only after:

1. the implementation is coherent;
2. relevant local validation passes;
3. `git diff --check` passes;
4. the final diff audit passes;
5. commits are complete;
6. the branch is pushed;
7. the pull request is opened and reviewed;
8. the pull request is merged;
9. remote `main` is verified;
10. the local repository returns to `main`;
11. `git pull --ff-only` is applied;
12. local `main == origin/main`; and
13. the worktree is clean.

After merge, do not leave the repository on the feature branch.

## 20. Rule of interpretation

When legacy code conflicts with this document, do not copy the legacy pattern automatically.

First decide whether the legacy implementation should be migrated toward this standard.

The architecture should make the next implementation simpler, not harder.
