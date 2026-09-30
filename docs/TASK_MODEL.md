# Canonical Task Model

Status: **normative**

This document defines the canonical product semantics for Tasks, their
recurrence, lifecycle, projections, daily execution, favorable conditions,
Event association, and subtask structure.

Existing implementation that conflicts with this document is migration debt,
not product precedent.

## 1. Core model

A Task is a persistent object.

A Task is removed only when explicitly deleted. Changing its status does not
delete or archive it. A completed Task remains available in the Tasks
workspace and can be reopened.

The model separates independent concerns:

```text
Task
├── Natureza
├── Status
├── Recorrência
├── Execução diária
├── Associação a Event
├── Condições favoráveis
└── Estrutura Task / Supertask / Subtask
```

These concerns must not be represented by copies of the Task or by one field
silently changing the meaning of another field.

## 2. Identity and persistence

The stable Task identity is the persisted Task identifier. A projection may
have a view-specific key, but deduplication and updates must use the stable
Task identifier rather than the title, date, or projected horizon.

Tasks, recurring occurrences, daily execution state, and action projections
have different responsibilities:

| Concept | Canonical meaning |
| --- | --- |
| Task | The persistent product object. |
| `status` | Lifecycle state of the Task. |
| `schedule` | Recurrence or Event-relative occurrence rule. |
| `actionPlanning` | Explicit planning metadata retained on the Task; it is not a separate Action entity. |
| Daily execution | Whether the Task's projected action was completed on a particular civil day. |
| Action projection | A derived display of canonical Tasks and Events. |

No occurrence document or parallel persisted Action object is created merely
to render a Task in an action horizon.

## 3. Natureza

Natureza describes what the object is in the product's domain. A Task remains
a Task regardless of whether it is one-off, recurring, Event-relative,
standalone, or structurally attached to another Task.

Natureza must not be inferred from the current action horizon. A Task shown in
`Ações do dia` is not thereby converted into a daily Task, and a Task shown in
`Esta semana` is not thereby converted into a weekly Task.

## 4. Lifecycle status

Task status is a lifecycle concern with these canonical values:

| Value | Label | Meaning |
| ---: | --- | --- |
| `0` | Não iniciada | The Task has not started. |
| `1` | Em andamento | The Task is active and in progress. |
| `2` | Concluída | The Task lifecycle is complete. |

Status changes do not delete, archive, or recreate the Task. A completed Task
can be reopened by changing its status.

`Concluída` Tasks are suppressed from action projections under the frozen
completion semantics. This suppression is a projection rule; it does not
remove the Task from the Tasks workspace or from persistence.

Status is also independent from favorable-condition evaluation. In-progress
attention and favorable-condition attention are different meanings, and a
completed Task must never be visually promoted by an automation match.

## 5. Recorrência and schedule

The optional `schedule` is the canonical occurrence rule. Current supported
schedule forms are:

- `daily`: an occurrence on the current civil day;
- `weekly`: selected weekdays, or a flexible weekly occurrence when no
  weekdays are selected;
- `monthly`: a civil day of the month, clamped to the final day of shorter
  months; and
- `eventRelative`: an occurrence relative to a persisted Event, using the
  Event identifier and a non-negative lead time in days.

Recurrence derives occurrences from the canonical Task. It does not create
separate recurring Task records or occurrence documents.

Schedule evaluation is date-based and uses civil date keys (`YYYY-MM-DD`),
Monday-based week keys, and `YYYY-MM` month keys where a planning period is
needed. A schedule remains unchanged when the resulting occurrence is shown
in a different visible section.

`actionPlanning` may remain on existing Tasks as explicit planning metadata
and migration-compatible user intent. It is not the Task's recurrence model,
does not replace `schedule`, and is never rewritten only because a projection
was promoted to `Ações do dia`.

## 6. Daily execution

Daily execution answers a different question from lifecycle status:

> Was this projected action completed for the current civil day?

Daily completion is not equivalent to `Task.status = 2`.

Completing an action for today must not silently complete the Task lifecycle.
Likewise, changing the lifecycle status must not be used as a substitute for
the daily execution record. The daily state is date-scoped and must expire or
be reset when the relevant civil day changes.

The projection may expose this state as `completedToday` and may present a
`Concluída hoje` indication. That indication describes execution of today's
projection; it does not claim that the canonical Task is lifecycle-complete.

## 7. Action projections and precedence

`Ações do dia`, `Esta semana`, and `Este mês` are derived views over canonical
Tasks and Events. They are not independent lists and must not be persisted as
copies of Tasks.

For an eligible, non-completed Task, visible placement follows this canonical
precedence:

```text
1. status = Em andamento → Ações do dia
2. otherwise eligible for Hoje → Ações do dia
3. otherwise eligible for Esta semana → Esta semana
4. otherwise eligible for Este mês → Este mês
```

`status = 1` is a presentation priority. It promotes a Task into `Ações do
dia` even when its manual or scheduled planning horizon is weekly or monthly.
The original `actionPlanning` and `schedule` remain intact; promotion must not
mutate either one.

A canonical Task appears at most once across the visible action sections.
Deduplication uses the stable Task identifier. For example:

```text
Weekly Task + Em andamento
→ Ações do dia only

Monthly Task + Em andamento
→ Ações do dia only

Weekly Task + Não iniciada
→ its eligible weekly/day occurrence
```

An in-progress Task retains a subtle `Em andamento` indication in its action
row so the reason for the day promotion is understandable. This status
indication is separate from automation or favorable-condition highlighting.

Completed Tasks follow the frozen completion semantics: they remain persistent
and reopenable, but are not emitted as active action projections.

## 8. Condições favoráveis and automation

Favorable conditions are contextual evaluation, not recurrence and not
lifecycle. Current rule families include weekday, weather, and upcoming Event
conditions, with deterministic `all` / `any` matching and an explicit
matched, not-matched, or unresolved result.

An automation match can explain or highlight an already relevant Task. It
does not create a Task occurrence, change its status, move its schedule, or
silently remove a manually planned Task when the condition is not met.

The UI must keep these meanings distinct:

```text
Task status       = lifecycle identity
Daily completion  = today's execution state
Automation        = contextual relevance / attention
```

For visual attention, lifecycle precedence is completed, in progress,
favorable condition, then normal. Factual automation evaluation must not be
corrupted merely to implement that visual precedence.

## 9. Associação a Event

An Event is a separate canonical persistent object. A Task may refer to an
Event without copying the Event into the Task.

The Event-relative schedule uses `schedule.eventId` and `leadDays` to derive a
Task occurrence before the Event. Upcoming-Event favorable conditions may also
refer to an Event identifier. In both cases, the referenced Event remains the
source of its own dates and data.

Missing or deleted referenced Events do not justify inventing a replacement
Task occurrence or duplicating Event data. The relationship must remain
explainable to the projection layer.

## 10. Estrutura Task / Supertask / Subtask

A Supertask is not a second domain entity. It is a Task acting as a parent for
one or more Subtasks.

A Subtask is a Task-shaped child with a stable identifier and a parent
relationship. The parent relationship must be explicit and preserved when a
Task is made into or removed from a group. Reordering a Task or changing its
group is a structural operation, not creation of a new logical Task.

The following rules apply:

- parent and child status are independently meaningful unless the user
  explicitly chooses a group-wide status operation;
- a parent may expose its Subtasks without turning them into separate action
  copies;
- promoting a Subtask to a standalone Task preserves its stable identity and
  canonical fields;
- deleting a parent or grouped structure is an explicit destructive action and
  must not be inferred from a status change; and
- action projection deduplication still uses each canonical Task identifier.

## 11. Migration rule

When existing implementation behavior conflicts with this document, the
behavior is migration debt. New work must follow this model and must not use
legacy manual horizon behavior, duplicated occurrence records, or lifecycle
mutation as precedent for new features.
