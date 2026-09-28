# Roadmap

Status: **canonical execution roadmap**

Last refreshed against `main`: `df723ba295d70023afe82fd75d5877503b4845cc`

This document records execution order, completed checkpoints, migration debt, and the next work areas.

Architecture and implementation rules remain normative in:

- `docs/IMPLEMENTATION_STANDARD.md`
- `docs/VISUAL_CONTRACT.md`

The source of truth for implementation state is always the current code on `main`.

---

## 1. Execution rule

Work areas follow:

```text
AUDIT → EVIDENCE → DECISION → REUSE → GENERALIZE → IMPLEMENT → VALIDATE → REVIEW DIFF → PR → MERGE → SYNC MAIN
```

Roadmap items describe sequencing, not permission to skip the canonical implementation standard.

Each checkpoint should remain narrow enough to review, validate, and revert independently.

---

## 2. Origin of this roadmap

The initial modernization audit started from a large local refactor snapshot and identified five immediate checkpoints:

1. restore a compilable base without discarding useful extractions;
2. eliminate competing domain contracts;
3. consolidate duplicated hooks and reusable behavior;
4. correct small bugs exposed by the extraction;
5. postpone visual reuse until the logic was stable.

That sequence remains the historical baseline for the roadmap.

The current code has advanced substantially beyond that initial state, so the items below record which parts were completed, superseded, or remain active.

---

## 3. Initial refactor checkpoints

### 3.1. Base stabilization

**Status: DONE**

The original audit found hook-order problems in Event/Person modals and an incomplete `useTaskForm`.

Current state:

- Event and Person modal hooks are called before conditional `return null` branches.
- `useEventForm` and `usePersonForm` are active form abstractions.
- the broken `useTaskForm` no longer exists;
- current production builds and Vercel deployments pass.

No rollback to the pre-refactor monolith is required.

---

### 3.2. Canonical domain contracts

**Status: DONE for the originally identified duplication**

The original audit found competing `OptionalField` and `Person` contracts.

Current state:

- canonical `OptionalField` lives in `app/types/optionalFields.ts`;
- `app/utils/interfaces.ts` imports that canonical type instead of redefining it;
- `useAssociatePerson` imports the canonical `Person` contract;
- the old parallel `useFetchPeople` implementation no longer exists.

Future schema work must continue to follow the single-source rule in `IMPLEMENTATION_STANDARD.md`.

---

### 3.3. Reuse of selectable persisted settings

**Status: DONE**

The original audit found nearly identical implementations for Event categories and Person relationships.

Current state:

- `useSelectableStringSetting` contains the shared persisted-string behavior;
- `useEventCategories` adapts it for categories;
- `usePersonRelationships` adapts it for relationships.

This is the intended reuse pattern: one shared behavioral core with small domain adapters.

---

### 3.4. Small extraction bugs

**Status: DONE for the originally identified bugs**

Verified current state:

- `TaskListField` updates canonical `TaskItem.text`;
- duplicate `additionalEmail` renderer branches are gone;
- `EventCard` passes `event.endTime` to `formatDate(...)`.

These items are historical and should not be reopened unless a regression appears.

---

### 3.5. Visual primitives from the original snapshot

**Status: SUPERSEDED / PARTIAL**

The original snapshot contained empty placeholder files such as `Button.tsx`, `Card.tsx`, and `Modal.tsx`.

Those placeholders are no longer present.

The visual strategy is now defined by `docs/VISUAL_CONTRACT.md`:

- native CSS;
- semantic custom properties;
- CSS Modules;
- shared visual contracts only when reuse is proven;
- no speculative component library.

The remaining work is not to resurrect those placeholders. It is to migrate real surfaces away from Tailwind and extract shared primitives only when actual consumers justify them.

---

## 4. Functional foundation completed after the initial audit

### 4.1. Canonical implementation and visual contracts

**Status: DONE**

The project now has normative documents for:

- implementation rules;
- reuse/generalization policy;
- persistence contracts;
- target stack;
- accessibility;
- responsive behavior;
- visual hierarchy;
- motion;
- CSS architecture.

---

### 4.2. Action Planning

**Status: DONE**

Tasks and Events can carry optional `actionPlanning`.

Canonical horizons:

```text
day
week
month
```

Actions remain projections of Task/Event data rather than separately persisted Action entities.

The dashboard derives Day, Week, and Month projections from the canonical entities.

---

### 4.3. Automation foundation

**Status: DONE**

Canonical rule support currently includes:

- weekday;
- weather;
- upcoming event;
- `all` / `any` matching;
- matched / notMatched / unresolved evaluation.

Automation changes relevance/highlighting and does not silently remove manually planned actions.

Weather evaluation uses Open-Meteo only when weather rules are relevant.

---

### 4.4. Shared Event persistence direction

**Status: DONE**

Event creation, editing, dashboard/history/detail projections converge on:

```text
users/{uid}/events-history
```

A future agenda should project these same canonical Event documents rather than introduce a parallel agenda store.

---

## 5. Platform modernization completed

### 5.1. Motion

**Status: DONE**

Canonical imports use:

```ts
import { motion } from 'motion/react'
```

---

### 5.2. Node

**Status: DONE**

Target runtime:

```text
Node 24.x
```

---

### 5.3. React

**Status: DONE**

Current target:

```text
React 19.3
React DOM 19.3
```

---

### 5.4. Firebase

**Status: DONE**

Current target:

```text
Firebase 12.19
```

---

### 5.5. Next.js → Vite + React Router

**Status: DONE**

The application now uses:

```text
Vite
React Router
SPA routing on Vercel
```

The old Next.js application shell and routing were removed.

---

### 5.6. Public environment variables

**Status: DONE**

Firebase client configuration now uses only:

```text
VITE_FIREBASE_*
```

Legacy `NEXT_PUBLIC_*` support has been removed from the codebase.

Instance identity uses:

```text
VITE_INSTANCE_NAME
VITE_INSTANCE_DESCRIPTION
```

---

### 5.7. Google OAuth stabilization

**Status: DONE for current login flow**

The login flow now uses the existing `@react-oauth/google` provider/hook instead of manually racing Google Identity Services script initialization.

The current OAuth domain set must include the intended development/production origins and any Preview origin used for authenticated validation.

---

### 5.8. Product identity

**Status: DONE for current surface identity**

Current surface identity:

```text
Name: Nxt_Planner
Version: 2.0.1
Production domain: https://nxtplanner.vercel.app
Brand font: Oxanium
```

The Google/Firebase project ID may retain the historical `web-crm` identifier. That technical vestige is accepted and is not a migration requirement.

The npm package name also still contains `web-crm`; it is not currently a blocking product-identity issue.

---

## 6. Immediate execution queue

The following sequence is the current required roadmap.

### 6.1. Platform 6A — Fix the Vite development port

**Status: DONE**

Add an explicit dev-server contract:

```ts
server: {
  port: 5173,
  strictPort: true,
}
```

Reason:

Google OAuth authorizes an exact origin. Vite must not silently move development to `5174`, `5175`, etc. when `5173` is occupied.

Acceptance:

- local dev starts at `http://localhost:5173`;
- if the port is unavailable, startup fails explicitly;
- build behavior is unchanged;
- OAuth local origin remains stable.

This checkpoint should remain isolated from icon/CSS work.

---

### 6.2. Platform 6B — Heroicons → Lucide

**Status: DONE**

Lucide is the canonical icon library, but Heroicons still has active consumers.

Goals:

- audit every `@heroicons/react` import;
- map each icon to a semantically equivalent Lucide icon;
- preserve accessible names and button semantics;
- remove `@heroicons/react` only after zero consumers remain;
- avoid visual redesign in the same checkpoint.

Acceptance:

- no `@heroicons/react` runtime imports;
- Lucide is the single icon dependency;
- relevant pages render without icon regressions;
- package lock is updated cleanly.

---

### 6.3. Visual 1 — Tailwind migration foundation

**Status: QUEUED**

Tailwind remains the largest intentional platform/visual migration debt.

Do not mechanically translate utility classes one-to-one.

First audit:

- global tokens already present;
- repeated button/input/modal/list/card intent;
- current global semantic classes;
- component-local styling;
- responsive behavior;
- dependencies on Tailwind-generated utilities.

Then define only the shared contracts required by real current consumers.

Target:

```text
native CSS
semantic CSS custom properties
CSS Modules
small shared global foundation
```

---

### 6.4. Visual 2 — Migrate representative surfaces

**Status: QUEUED**

Use representative surfaces to prove the visual contracts before a full sweep.

Preferred order:

1. application shell/navigation;
2. Dashboard / Actions of the Day;
3. authentication/login;
4. one representative form/modal;
5. one representative operational list/card.

Validate both desktop and mobile before expanding the migration.

---

### 6.5. Visual 3 — Complete Tailwind removal

**Status: QUEUED**

After the contracts are proven:

- migrate remaining Events surfaces;
- migrate Tasks surfaces;
- migrate People surfaces;
- migrate optional fields and editors;
- migrate remaining shared UI;
- remove obsolete Tailwind configuration and dependency only after zero utility dependence remains;
- reassess PostCSS/autoprefixer based on actual remaining use.

No new CSS framework replaces Tailwind.

---

### 6.6. Visual 4 — Canonical workspace shell

**Status: QUEUED**

Implement the mature workspace described in `VISUAL_CONTRACT.md`.

Desktop target:

- persistent left sidebar;
- contextual top bar;
- broad operational workspace;
- Actions of the Day dominant;
- Week secondary;
- Month tertiary;
- context/weather supporting rather than dominant.

Mobile target:

- compact header/context;
- persistent bottom navigation;
- same domain projections as desktop;
- no desktop-sidebar-as-drawer by default.

---

## 7. Product work after platform/visual stabilization

These areas are valid future directions but should not interrupt the immediate migration queue without an explicit reprioritization.

### 7.1. Agenda projection

**Status: FUTURE**

Build Agenda as another projection of canonical Event data from:

```text
users/{uid}/events-history
```

Do not create a parallel persisted Agenda entity merely for presentation.

---

### 7.2. Actions refinement

**Status: FUTURE**

Potential future work should build on the existing Day/Week/Month projections rather than introducing a second planning model.

Any reorder/drag behavior should use the canonical dnd-kit stack when structural drag-and-drop is required.

---

### 7.3. Automation refinement

**Status: FUTURE**

Extend automation only from concrete use cases.

Preserve:

- deterministic evaluation;
- explainable UI state;
- manual inclusion independent from automation match;
- unresolved external data as unresolved rather than false.

Do not introduce a generic visual programming system without evidence.

---

## 8. Technical debt register

These items are real but are not all immediate blockers.

### 8.1. Authentication/session ownership

**Status: DEBT**

Current code still relies heavily on browser-local values such as:

```text
googleAccessToken
firebaseUid
userInfo
```

Future auth cleanup should audit:

- Firebase Auth state as the canonical authenticated-session source;
- Google access-token lifecycle and renewal;
- stale/expired localStorage behavior;
- logout cleanup;
- recovery after reload;
- whether the Google OAuth client ID should move to a public `VITE_GOOGLE_CLIENT_ID` configuration value.

Do not mix this with visual migration unless a blocking auth bug requires it.

---

### 8.2. Firestore security verification

**Status: DEBT / EXTERNAL VERIFICATION REQUIRED**

The repository does not currently provide enough evidence to treat client-side route protection as a data-security boundary.

Before making security claims, verify the deployed Firestore rules independently.

---

### 8.3. Development logs

**Status: DEBT**

Some development `console.log` / `console.warn` calls remain.

Remove non-operational logs when touching the relevant work area.

Never log tokens, credentials, authorization headers, or secrets.

---

### 8.4. Legacy technical names

**Status: ACCEPTED / LOW PRIORITY**

Historical names such as `web-crm` may remain in technical identifiers where renaming provides no material product benefit.

Do not perform migrations solely for cosmetic cleanup of immutable/external identifiers.

---

### 8.5. Utility/dependency cleanup

**Status: DEBT**

Examples to evaluate only when touching the area:

- `uuid` usage versus supported `crypto.randomUUID()`;
- unused package removal;
- Tailwind/PostCSS cleanup after CSS migration;
- package-level names that no longer describe the surface product.

Dependency removal must be evidence-based.

---

## 9. Non-goals during the immediate migration queue

Until Platform 6A/6B and Visual 1–4 are complete, avoid mixing in:

- new state-management infrastructure;
- another router;
- another CSS framework;
- speculative design-system abstractions;
- parallel persistence schemas;
- broad auth redesign unless required by a real blocker;
- unrelated feature expansion.

---

## 10. Definition of completion

A roadmap checkpoint is complete only when:

1. the current implementation was audited;
2. reuse was considered before creation;
3. implementation is narrow and legible;
4. relevant build/type/tests pass;
5. user-visible behavior is validated where applicable;
6. `git diff --check` / final diff audit is clean;
7. the change is committed and pushed;
8. a PR is opened and reviewed;
9. the PR is merged;
10. remote `main` is verified;
11. local `main` is synchronized with `origin/main`;
12. the worktree is clean.

---

## 11. Current next action

The next implementation checkpoint is:

```text
Visual 1 — Tailwind migration foundation
```

After that:

```text
Visual 2–4 — migrate representative surfaces, complete Tailwind removal, and implement the canonical workspace shell
```
