# Canonical Task Model

Status: **normative**

This document defines the canonical product semantics for Tasks, their nature,
operational status, recurrence, archiving, projections, favorable conditions,
Event association, and Task/Supertask/Subtask hierarchy.

Existing implementation that conflicts with this document is migration debt,
not product precedent. This document freezes product semantics; it does not
freeze the future TypeScript or Firestore representation of every concept.

## 1. Core model

A Task is a persistent root object. It is removed only by explicit deletion.
Changing its operational status does not delete or archive it. Archiving is an
independent lifecycle dimension and preserves the Task and its current status.

The model separates independent concerns:

```text
Task
├── Natureza
├── Status operacional (0, 1, 2)
├── Recorrência
├── Arquivamento
├── Execução da ocorrência atual
├── Associação a Event
├── Condições favoráveis
└── Estrutura Task / Supertask / Subtask
```

One concern must not be represented by silently changing the meaning of
another concern. In particular, recurrence is not lifecycle status, archive
is not status, daily focus is not completion, and Event association is not
automatically recurrence.

## 2. Task nature

Every root Task is one of these product natures:

- **Pontual** — a one-off Task;
- **Recorrente** — a Task whose recurrence rule produces eligible occurrences
  over time.

There is no separate `Contínua` or `Flexível` nature. “Without a specified
weekday” and “without a specified day” describe flexible recurrence rules
inside a recurring Task; they do not create another nature.

The current action horizon does not determine nature. A punctual Task shown in
`Ações do dia` does not become daily, and a recurring Task shown in `Esta
semana` does not become weekly.

The exact persisted representation of nature is intentionally deferred to a
future schema decision and implementation audit.

## 3. Operational status

A Task has exactly three operational states. There is no fourth operational
status:

| Persisted value | User-facing status | Meaning |
| ---: | --- | --- |
| `0` | Não iniciada | Work has not started. |
| `1` | Em foco | Work is selected for execution or is partially in progress. |
| `2` | Concluída | Work for the relevant Task or occurrence has finished. |

### 3.1. Punctual Tasks

For a punctual Task:

- `Não iniciada` means work has not started;
- `Em foco` means the work was selected for execution; and
- `Concluída` means the work has finished.

`Concluída` is terminal for that Task unless the user explicitly changes it in
the future. It is not deletion and it is not archiving.

The existing daily-focus rule remains applicable only to a simple punctual
Task without Subtasks:

```text
Em foco + not completed today → Não iniciada on the next civil day
Em foco + completed           → Concluída
```

The operational wire may carry `focusedOnDate` as the civil date
(`YYYY-MM-DD`) on which the Task entered focus. This rule is not a generic
midnight reset and does not override a Supertask aggregate or recurrence.

### 3.2. Recurring Tasks

For a recurring Task, the same three states describe the current occurrence:

- `Não iniciada` means the current occurrence has not started;
- `Em foco` means the current occurrence is partially or fully in execution;
  and
- `Concluída` means the current occurrence has been completed.

`Concluída` does not end the recurrence. The Task remains visually
`Concluída` until the recurrence engine starts the next occurrence. At that
boundary, the status becomes `Não iniciada`:

```text
previous occurrence = Concluída → next occurrence = Não iniciada
previous occurrence = Em foco    → next occurrence = Não iniciada
```

The boundary is the next real occurrence, not midnight:

- `daily` → the next civil day;
- weekly with selected weekdays → the next configured weekday;
- flexible weekly → the next civil Monday–Sunday week; and
- monthly → the next effective monthly occurrence.

No generic midnight reset is canonical. Completion of an occurrence remains
identifiable through the canonical occurrence/completion mechanism. Occurrence
documents are never persisted.

## 4. Recurring Task forms

A recurring Task remains one canonical root Task. Its occurrences are derived
from its recurrence rule; they are not separate persisted Tasks or Calendar
Events.

### 4.1. Daily

The Task occurs every day.

### 4.2. Weekly

A weekly Task can be expressed in either of these ways:

1. **Selected weekdays** — exact weekdays are selected, such as Monday and
   Wednesday.
2. **Flexible week** — the Task should happen during a Monday–Sunday civil
   week, but no exact weekday is required.

The second form is a flexible weekly recurrence rule, not a third Task nature.

### 4.3. Monthly

A monthly Task can be expressed in these ways:

1. **Civil day of month** — for example, day 15;
2. **Calendar position** — for example, the last Thursday of the month; or
3. **Flexible month** — one occurrence during the month without a fixed day.

Calendar position must not be approximated as a fixed day such as 27, 28, or
29. Flexible monthly recurrence is still monthly recurrence and must not be
called `Contínua`.

The exact persisted representation of recurrence forms remains subject to the
implementation audit. Current legacy schedule fields are migration inputs,
not a complete canonical schema.

## 5. Recurrence lifecycle

The following are separate facts:

```text
status of recurring Task ≠ existence of recurrence
```

While a recurring Task is active, it can continue to produce future
occurrences. Completing the current occurrence does not globally complete the
Task or terminate its recurrence. The completion of the current occurrence
must remain discoverable by the canonical occurrence/completion mechanism.

No occurrence document is persisted. Projection and completion use the Task's
canonical recurrence and completion data in memory and through the existing
wire boundary.

## 6. Archive lifecycle

Archiving replaces the superseded proposal of `status = 3` or
`Encerrada`. Archive is an independent lifecycle dimension:

```text
Task lifecycle: Active | Archived
```

Any root Task can be archived:

- punctual or recurring;
- with or without Subtasks; and
- `Não iniciada`, `Em foco`, or `Concluída`.

Archiving preserves the operational status. Valid combinations include:

```text
Não iniciada + Arquivada
Em foco       + Arquivada
Concluída     + Arquivada
```

The preferred domain representation is an optional archive marker equivalent
to:

```ts
archivedAt?: timestamp
```

The exact wire field and timestamp type are intentionally deferred to the
implementation audit. No bulk migration is implied by this decision.

When the archive marker is present:

- the Task is excluded from normal operational surfaces;
- it does not generate Projected Actions;
- recurrence does not generate operational occurrences;
- Calendar remains unchanged; and
- the Task data remains preserved.

Archiving does not mean completing.

### 6.1. Restore

An archived Task can be restored. Restore removes the archive marker and
preserves:

- nature;
- operational status;
- recurrence;
- planning;
- Event association and `eventRelative` data;
- favorable conditions; and
- Subtasks.

Restoring a recurring Task does not create retroactive occurrences or perform
backfill. It resumes from the current or next occurrence according to the
recurrence engine. Completion already belonging to the current occurrence may
remain valid.

### 6.2. Archive visibility and authoring

The normal Task list contains only the three operational sections:

```text
Não iniciadas | Em foco | Concluídas
```

Archived Tasks are not distributed among those sections. A secondary filter
below the main status line controls their visibility:

```text
[ ] Mostrar arquivadas
```

When enabled, archived Tasks appear in a separate section below the
operational sections:

```text
Arquivadas
```

Archive is not a normal quick card action and is not an option in the common
status selector. It belongs inside `Editar Task` as a confirmed secondary
action:

- active Task → `Arquivar tarefa`;
- archived Task → `Restaurar tarefa`.

Both punctual and recurring Tasks support these actions.

## 7. Actions are projections

`Ações do dia`, `Esta semana`, and `Este mês` are derived projections of
canonical root Tasks and Events. They are not a second independent persisted
planning model and must not create occurrence documents.

Only root Tasks generate Projected Actions. Subtasks are internal progress
items and never generate independent Actions.

Projection derives coherently from:

- root Task nature;
- operational status;
- archive lifecycle;
- recurrence and civil date;
- occurrence completion;
- Event association; and
- root Task favorable conditions.

An archived root Task is excluded before action projection. A root Task may
appear at most once across the visible operational sections. Projection
deduplication uses stable root Task identity, never title, date, or horizon.

`actionPlanning` remains legacy-compatible metadata where it does not conflict
with this model. It is not a second canonical Task model.

## 8. Favorable conditions

Favorable conditions answer:

> When is it a favorable moment to do this?

Conditions belong to the root Task. A Subtask does not have its own condition.
A favorable condition may highlight the root Task's Projected Action; it does
not individually alter Subtask checkboxes, create a Subtask Action, create an
occurrence, redefine recurrence, change lifecycle status, or place a Task in
Calendar.

The current persisted wire keeps the technical `automation` field for legacy
compatibility; it is the condition configuration boundary, not a second
scheduling engine. Supported rules remain weekday, current weather, and
upcoming Event, with `all` / `any` matching and explicit in-memory evaluation
states:

- `noConditions`;
- `matched`;
- `notMatched`; and
- `notEvaluable`.

An absent, failed, or timed-out weather result therefore leaves the root
Action visible with `notEvaluable`. Evaluation happens only after canonical
root projection and is never persisted.

## 9. Event association and planning

Event association and planning belong to the root Task. For example:

```text
Alugar terno
Nature: Pontual
Associated Event: Casamento do Raphael
Lead time: 14 days
```

The canonical association wire is independent from recurrence:

```ts
eventAssociation?: {
  eventId: string
}
```

The legacy `eventRelative` schedule remains a separate punctual temporal rule
whose `eventId` and `leadDays` determine its effective civil date. Canonical
writes may preserve both contracts with synchronized Event ids. Removing an
Event-relative rule may preserve an independent association; removing the
association deletes only `eventAssociation`.

New Subtasks do not individually have:

- nature;
- schedule or recurrence;
- `actionPlanning`;
- `focusedOnDate`;
- Event association or `eventRelative`;
- automation or favorable conditions.

Only a root Task participates in the explicit Task → Event flow. A Subtask
must be promoted before it can assume Task/Event capabilities. No conversion
is implicit.

## 10. Canonical hierarchy

The canonical depth is exactly one:

```text
Task / Supertask
├── Subtask
└── Subtask
```

Never:

```text
Task
└── Subtask
    └── Subtask
```

There is no recursive tree authoring. A root Task is never demoted into a
Subtask and an existing root Task is never attached below another root Task.

### 10.1. Creating hierarchy

Hierarchy is created only through the direct flow:

```text
Task → Criar subtask
```

Root Task actions are:

- `Criar subtask`;
- `Editar`; and
- `Excluir`.

Subtask actions are:

- `Promover`;
- `Editar`; and
- `Excluir`.

A Subtask cannot create another Subtask, become a child of another Task, or be
attached. It can be promoted to a root Task.

## 11. Subtask model

A Subtask is deliberately simpler than a root Task. A new Subtask has only:

- stable `id`;
- `content`;
- binary completion state;
- `position`; and
- an implicit/operational parent Task relationship.

The visible states are:

```text
Não feita | Concluída
```

There is no `Em foco` state for a Subtask. A checkbox is the preferred UI.
Subtasks represent internal progress of their root Task or current occurrence;
they do not represent independent plans.

### 11.1. Punctual Supertask

For a punctual Supertask, a Subtask checkbox is permanent for that Task:

```text
unchecked → Não feita
checked   → Concluída
```

There is no next occurrence that resets the checklist.

### 11.2. Recurring Supertask

For a recurring Supertask, the checkbox answers:

> Was this Subtask completed in the current occurrence?

Its completion is occurrence-scoped. For example:

```text
1 Oct: ☑ A  ☑ B  ☑ C → occurrence completed
2 Oct: ☐ A  ☐ B  ☐ C → new occurrence
```

The implementation must use the identity of the current occurrence to
determine each Subtask's completion. It must not require indiscriminate
midnight resets. The concrete wire for occurrence-scoped Subtask completion is
deferred to the implementation audit; this document does not invent a field.

### 11.3. Aggregate status

When `subtasks.length > 0`, Subtasks are the source of truth for the
Supertask's status for the Task or current occurrence:

| Subtask progress | Aggregate status |
| --- | --- |
| all incomplete | `Não iniciada` |
| mixed | `Em foco` |
| all complete | `Concluída` |

For a punctual Supertask, this is the definitive Task lifecycle. For a
recurring Supertask, it describes the current occurrence. A Supertask's
aggregate status has precedence over `focusedOnDate` rollover.

## 12. Global status command

Aggregate status also acts as a global command on a Supertask. The user may
choose only:

- `Não iniciada`; or
- `Concluída`.

Both operations require confirmation. After confirmation:

- `Não iniciada` marks all Subtasks not made; and
- `Concluída` marks all Subtasks complete.

`Em foco` is never a global command; it is derived exclusively from mixed
progress. For a recurring Supertask, these commands affect only the current
occurrence and do not terminate recurrence.

## 13. Focused date and recurrence boundaries

`focusedOnDate` remains relevant to simple punctual root Tasks. A Supertask's
aggregate status is not replaced by the daily focused-date rollover. For a
recurring root Task, transition to a new occurrence is governed by the
recurrence engine, not by `focusedOnDate`.

## 14. Calendar boundary

Calendar is an Event-only projection. It represents explicit temporal Event
documents, not everything relevant in Today or Actions.

Tasks are never projected directly into Calendar. This applies to root Tasks,
Supertasks, Subtasks, action-planning windows, recurrence, event-relative
dates, rollover, and favorable-condition matches.

Only explicit root Task → Event conversion creates an Event and makes the new
Event eligible for Event/Calendar surfaces. The original root Task is not
projected alongside it. A Subtask must be promoted before this conversion is
available.

## 15. Promotion

Promoting a Subtask creates a root Task. The status mapping is:

```text
Subtask Não feita  → root Task Não iniciada
Subtask Concluída  → root Task Concluída
```

After promotion, it gains all capabilities of a normal root Task:

- nature;
- planning;
- recurrence;
- Event association;
- favorable conditions;
- creating Subtasks; and
- Projected Actions.

Preserve the Subtask `id` and `content` when technically safe. No implicit
conversion to Event occurs.

## 16. Deletion

- Deleting a Subtask removes only that Subtask.
- Deleting a root Task without Subtasks requires the canonical confirmation
  and removes the root Task.
- Deleting a Supertask requires an explicit warning that all Subtasks will be
  deleted, then removes the root document and embedded Subtasks together.

There is no automatic promotion and no orphaned Subtask.

Archiving a Supertask archives the entire operational set through the root
Task. Subtasks do not need separate archive markers. Restoring the root makes
the root and its Subtasks accessible together.

## 17. Migration and legacy compatibility

Current data may contain Subtasks with capabilities that are no longer
canonical:

- operational status `1`;
- schedule or recurrence;
- `actionPlanning`;
- automation;
- Event association or `eventRelative`;
- `lastActionCompletedDate`; and
- nested Subtasks.

Readers and hydration must preserve these legacy fields defensively. There is
no bulk migration in this documentation checkpoint, and legacy fields must
not be deleted incidentally before an explicit policy exists.

Legacy Subtask status `1` is interpreted as `Não feita` in the new binary
model unless the implementation audit finds a safer transformation. New
canonical Subtask authoring never creates status `1`.

`groupId` remains a legacy opaque compatibility field. It is preserved when
present and is never used to derive or mutate parent/child relationships.
Legacy nested descendants are tolerated defensively by readers but are never
created by canonical authoring.

The following previous decisions are explicitly superseded:

1. Subtask as a semantically complete Task;
2. Subtask-owned recurrence;
3. Subtask-owned Event association;
4. Subtask-owned favorable conditions;
5. Subtask-generated independent Action;
6. attach/demote of an existing root Task into a Subtask; and
7. a fourth status named `Encerrada`.

The replacement contract is:

- Subtask is binary and simple;
- only root Tasks own planning, recurrence, Event, conditions, and Actions;
- Supertask status is aggregate progress; and
- Archive is orthogonal to the three operational statuses.

## 18. Current implementation boundary

The current persistence foundation keeps the existing `tasks-list` collection
and its established fields, including `content`, numeric status, `order`,
`createdAt`, embedded hierarchy, legacy planning, automation, daily execution,
operational punctual focus date, legacy schedule data, Event association, and
legacy completion data. Readers hydrate the Firestore document id separately
from document data, and writers use an explicit whitelist.

The implemented root archive wire is:

```ts
archivedAt?: Timestamp
```

An absent field hydrates as Active. A valid Firestore `Timestamp` hydrates as
Archived. Invalid legacy values are ignored defensively without fabricating an
archive marker, throwing during hydration, or writing during reads. Archive
and restore use partial update builders: archive writes `Timestamp.now()` and
restore deletes only `archivedAt`, preserving all other root fields.

The implemented embedded Subtask occurrence wire is:

```ts
lastCompletedOccurrenceDate?: string // YYYY-MM-DD civil date
```

For recurring parents, the domain resolves that marker through the existing
daily, weekly, flexible-week, and monthly recurrence engine. It does not use
the marker as a simple `marker === today` check for every frequency. No
occurrence document or generated occurrence identifier is persisted.

New Subtask creation emits only the minimal binary shape. Legacy Subtask
status `1` hydrates as effective status `0` while an internal compatibility
marker preserves an untouched wire round-trip; explicit canonical status
writes emit only `0` or `2`. Legacy rich fields and nested descendants remain
defensively round-trippable when an embedded update is made.

No bulk migration is performed.

The implemented root occurrence markers are:

```ts
lastActionCompletedDate?: string   // completion of the current occurrence
lastFocusedOccurrenceDate?: string // Em foco for the current occurrence
```

Both values are civil dates and are interpreted through the same recurrence
boundaries. `lastActionCompletedDate` is reused as the canonical completion
marker for a recurring root Task; `lastFocusedOccurrenceDate` is distinct
because `focusedOnDate` remains the punctual-only daily focus field. A
recurring root status without a marker for its current occurrence is
effective `Não iniciada`, rather than being treated as terminal.

The pure effective-status boundary is `getEffectiveTaskStatus(task,
targetDate)`. It preserves archived status for inspection, derives a
Supertask from occurrence-scoped Subtasks, and otherwise resolves recurring
root status against the current occurrence. Reconciliation uses the same
boundary and writes only when persisted status has become stale; hydration and
other read paths do not write. Archived Tasks are excluded from operational
projection and temporal reconciliation, preserving their status and markers
until restore.

The implemented Action projection is root-only: `projectActionsForDate(...)`
receives only root Tasks, excludes archived roots, and produces at most one
Projected Action per root. A Subtask's legacy schedule, planning, automation,
Event association, event-relative schedule, and nested descendants remain
preserved in the embedded wire but are inert while the item remains a
Subtask. Conditions are evaluated once for the root Action. The root Action's
operational state is derived from `getEffectiveTaskStatus(...)`, including the
occurrence-scoped aggregate for Supertasks. Recurring completion therefore
does not block projection after the next real occurrence boundary.

Completing a simple root Action uses the canonical root status writer. A
Supertask Action has bulk semantics: completing or reopening it must update
the current occurrence's Subtasks through the canonical bulk helper rather
than writing only the derived parent status. The existing Action surface does
not yet provide the required confirmation UI, so that mutation remains
explicitly gated until the authoring/UI checkpoint; no silent bulk completion
is performed.

Date-only values use `YYYY-MM-DD` civil-date semantics and are never shifted
through UTC. Invalid legacy schedules or unknown lifecycle values are hydrated
defensively rather than exposed as executable canonical rules.

No generic midnight reset or occurrence collection is introduced. The
recurrence engine proves the next real boundary for daily, selected-weekday,
flexible-week, and clamped-monthly schedules.
