# Canonical Task Model

Status: **normative**

This document defines the canonical product semantics for Tasks, their nature,
lifecycle, recurrence, projections, daily execution, favorable conditions,
Event association, and Task hierarchy.

Existing implementation that conflicts with this document is migration debt,
not product precedent. This document freezes product semantics; it does not
freeze the future TypeScript or Firestore representation of every concept.

## 1. Core model

A Task is a persistent object. A Task is removed only when explicitly deleted.
Changing its status does not delete or archive it. A completed Task remains
persisted, remains visible in the Tasks workspace, and may be reopened.

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

One concern must not be represented by silently changing the meaning of
another concern. In particular, recurrence is not lifecycle status, daily
execution is not lifecycle completion, and Event association is not
automatically recurrence.

## 2. Task nature

Every Task is one of these product natures:

- **Pontual** — a one-off Task;
- **Recorrente** — a Task whose plan produces eligible occurrences over time.

There is no separate `Contínua` or `Flexível` nature. “Without a specified
weekday” and “without a specified day” describe flexible recurrence rules
inside a recurring Task; they do not create another nature.

The current action horizon does not determine nature. A punctual Task shown in
`Ações do dia` does not become daily, and a recurring Task shown in `Esta
semana` does not become weekly.

The exact persisted representation of nature is intentionally deferred to a
future schema decision and migration audit.

## 3. Lifecycle status

The canonical user-facing Task statuses are:

| Persisted value | User-facing status | Meaning |
| ---: | --- | --- |
| `0` | Não iniciada | The Task has not started. |
| `1` | Em foco | This plan/Task is active. |
| `2` | Concluída | The Task lifecycle is complete. |

The persisted numeric values remain `0`, `1`, and `2` for this documentation
checkpoint. The later implementation migration may change labels and behavior
without renaming those existing numeric values in stored data.

`Concluída` is not deleted or archived. A completed Task may be reopened to
`Não iniciada` or `Em foco`. Only explicit deletion removes it.

## 4. Recurring Task forms

A recurring Task remains one canonical Task. Its occurrences are derived from
its recurrence rule; they are not separate persisted Tasks or Calendar Events.

### 4.1. Diária

The Task occurs every day.

### 4.2. Semanal

A weekly Task can be expressed in either of these ways:

1. **Selected weekdays** — exact weekdays are selected, such as:
   - Robótica: Monday and Wednesday;
   - Pedagogia: Tuesday and Friday;
   - trash: Tuesday, Thursday, and Saturday;
   - cleaning: Saturday.
2. **Within the week without a specified weekday** — the Task should happen
   during that week, but no exact weekday is required.

The second form is a flexible weekly recurrence rule, not a third Task nature.

### 4.3. Mensal

A monthly Task can be expressed in either of these ways:

1. **Civil day of month** — for example, a credit card bill on day 15;
2. **Calendar position** — for example, the last Thursday of the month; or
3. **Within the month without a specified day** — for example, skin care once
   during the month.

Calendar position is a real calendar rule. It must not be approximated as a
fixed day such as 27, 28, or 29. The third form is simply monthly recurrence
without a fixed day and must not be called `Contínua`.

The exact persisted representation of these recurrence forms is intentionally
deferred. Current legacy schedule fields are migration inputs, not a complete
canonical schema.

## 5. Punctual Task behavior

A punctual Task does not use the generic persisted manual planning choices
`Hoje`, `Esta semana`, and `Este mês` as its canonical planning model.

A punctual Task normally starts as `Não iniciada`. When the user brings it into
current attention, it becomes `Em foco` and belongs in `Ações do dia`.

At the end of the civil day, a punctual Task in focus follows this rule:

```text
Em foco + NOT feita hoje → Não iniciada
Em foco + feita hoje     → Concluída
```

This rollover applies to punctual Tasks only. It does not turn the daily
execution of a recurring Task into global lifecycle completion.

## 6. Recurring Task daily execution

“Feita hoje” is a daily execution state, separate from lifecycle status.

For a recurring Task, completing today's occurrence satisfies today's work but
does not globally complete the Task. For example:

```text
Robótica
Status: Em foco
Recurrence: Monday + Wednesday

Monday completed → today's occurrence is satisfied
Wednesday         → the Task appears again
```

The recurring Task remains `Em foco` unless the user explicitly changes its
lifecycle status. At the end of the day, the daily execution state clears or
expires for the next occurrence; it must not complete the recurring Task.

The exact persisted representation of daily execution is intentionally
deferred. The product meaning must remain date-scoped and must not be replaced
by a lifecycle status mutation.

## 7. Actions are projections

`Ações do dia`, `Esta semana`, and `Este mês` are derived projections of
canonical Tasks and Events. They are not a second independent persisted
planning model and must not create occurrence documents.

Projection derives coherently from:

- Task nature;
- Task status;
- recurrence and civil date;
- daily execution;
- Event association; and
- favorable conditions.

The old generic manual `Hoje` / `Esta semana` / `Este mês` planning model is
legacy or migration debt wherever it conflicts with this contract. Existing
planning metadata may be read for compatibility during migration, but it does
not define the canonical nature or recurrence of a Task.

For visible placement, lifecycle priority comes first:

```text
1. completed Task → suppressed from active action projections
2. Em foco → Ações do dia
3. otherwise eligible recurring occurrence → its applicable day/week/month view
```

An `Em foco` Task is promoted to `Ações do dia` even when legacy planning or
legacy schedule data points to a wider horizon. This is a presentation rule.
It must not mutate the original recurrence or legacy planning metadata.

A canonical Task appears at most once across the visible sections. Projection
deduplication uses stable Task identity, never the title, date, or horizon.
The action row should retain a subtle `Em foco` indication so the reason for
the day projection is understandable.

## 8. Favorable conditions

Favorable conditions answer:

> When is it a favorable moment to do this?

They are independent from recurrence and lifecycle. Examples include:

```text
Lavar roupa
→ recurring within the week
→ favorable condition: sunny

Colocar plantas na chuva
→ recurring according to its plan
→ favorable condition: rain
```

A favorable condition changes attention or highlighting. It does not create a
new Task occurrence, redefine recurrence, change lifecycle status, or place a
Task in Calendar. A manually relevant Task is not silently removed because a
condition is not currently satisfied.

## 9. Event association

Event association is an independent Task dimension. For example:

```text
Alugar terno
Nature: Pontual
Associated Event: Casamento do Raphael
Lead time: 14 days
```

The Task remains a Task. The associated Event provides context and may
determine when the Task becomes relevant or highlighted. This relationship is
not itself Task recurrence and does not automatically put the Task into
Calendar.

Only the explicit Task → Event conversion creates an Event. The canonical
association wire is independent from recurrence:

```ts
eventAssociation?: {
  eventId: string
}
```

`eventAssociation` represents context only and does not contain `leadDays`.
The legacy `eventRelative` schedule remains a separate punctual temporal rule
whose `eventId` and `leadDays` determine its effective civil date. Canonical
writes persist both fields for an Event-relative Task and synchronize their
Event ids. Removing an Event-relative rule may preserve an independent
association; removing the association deletes only `eventAssociation`.

## 10. Task structure

The canonical hierarchy is:

- normal Task;
- Supertask; and
- Subtask.

A Task with one or more subtasks is called a Supertask. A Subtask is a full
Task object embedded in the root Task document's `subtasks[]` array. The
embedded Subtask carries its own `id`, `parentTaskId`, status, nature,
schedule, automation, planning, daily execution, and Event association.

The canonical depth is exactly one level:

```text
Supertask
├── Subtask
└── Subtask
```

A Subtask cannot receive another Subtask. `parentTaskId` is the operational
backlink to the root Task; the embedded position is the storage relationship.
`groupId` is not part of this hierarchy. It is a legacy opaque compatibility
field preserved when present, never generated for new Tasks, and never used to
derive or mutate parent/child relationships.

A Task may attach to a root Task and become a Subtask. Unlinking or promoting
a Subtask makes it a normal standalone Task while preserving its logical Task
identity and its own configuration. Attach, promotion, removal, validation,
and direct-subtask reordering use the canonical hierarchy domain helpers.

Legacy documents may contain nested descendants or malformed backlinks. Read
hydration preserves those descendants defensively and reports hierarchy
issues in runtime only; it does not write or migrate them. Authoring refuses
operations that would create depth greater than one or silently discard
descendants.

Deleting a Supertask deletes its Subtasks. Converting a Supertask to an Event
carries its Subtasks into the Event as a Task List in OptionalFields.

This document does not change current status-propagation rules for parents and
children. Any future redesign of group-wide status behavior is a separate
decision and implementation checkpoint.

Supertasks and Subtasks are independently scheduled Tasks. A Subtask may
produce its own Action when eligible, and its completion does not complete the
parent or siblings automatically. A parent Action likewise does not complete
its children.

## 11. Tasks and Calendar

A recurring Task does not become a Calendar Event. These remain Tasks and are
projected in Actions according to recurrence:

- Robótica on Monday and Wednesday;
- a bill on day 15; and
- a report on the last Thursday of the month.

Only explicit Task → Event conversion creates an Event and makes the result
eligible for the Event/Calendar surfaces.

## 12. Deletion and reopening

```text
Concluída ≠ deleted
```

A completed Task remains persisted and visible in the Tasks workspace. It may
be reopened to `Não iniciada` or `Em foco`. Only explicit deletion removes a
Task.

## 13. Migration rule

## 13.1. Current foundation boundary

The current persistence foundation keeps the existing `tasks-list` wire
collection and its decided fields: `content`, numeric `status`, `order`,
`createdAt`, hierarchy, legacy planning, automation, daily execution, legacy
`schedule` data, and canonical `eventAssociation`. Readers hydrate the
Firestore document id separately
from document data, and writers use an explicit whitelist, so the top-level
runtime `id` is never written as a document field.

`nature` is currently a domain-only value derived in memory: daily, weekly,
and monthly schedules are `recurring`; no schedule and legacy
event-relative schedules are `punctual`. Canonical `eventAssociation` takes
precedence during hydration. If absent, valid legacy event-relative data
derives the runtime association without mutating the source document. If both
are present but disagree, hydration preserves the conflict defensively; a
later canonical write synchronizes the association to the event-relative rule.
Legacy event-relative data therefore round-trips with forward normalization,
without a bulk migration.

Nested subtask ids remain part of the existing decided hierarchy wire format;
they are not the top-level Firestore document id. `groupId` remains an opaque
legacy field and is preserved by the whitelist without participating in
hierarchy operations. Root documents contain embedded direct subtasks only in
the canonical model; nested legacy descendants are tolerated but not
authorable.

Malformed or unknown lifecycle status values hydrate defensively as `0`, and
invalid legacy schedules are ignored rather than exposed as executable rules.

## 13.2. Scheduling engine checkpoint

### Implemented

The pure scheduling domain currently validates and evaluates the schedule
forms that the existing wire can represent:

- `daily` is recurring and occurs on every valid civil date;
- `weekly` with selected weekdays compares civil weekdays, including multiple
  selected days;
- `weekly` without weekdays is one flexible execution per civil week
  (Monday–Sunday): it remains available until completed, then is suppressed for
  the rest of that week and becomes available again the following Monday;
- `monthly` by `dayOfMonth` compares civil days and clamps 29, 30, or 31 to
  the final day of a shorter month;
- `eventRelative` is punctual and calculates one effective civil date by
  subtracting `leadDays` from the related Event date; and
- no schedule is punctual and has no calendar occurrence.

`getNextTaskOccurrence` uses an exclusive `afterDate` boundary. The
date-specific recurrence functions do not read Task status. The weekly
flexible window uses the Monday civil date as its internal comparison key and
does not persist that key. `lastActionCompletedDate` suppresses daily,
selected-weekday, and monthly occurrences by occurrence date; it suppresses a
flexible weekly occurrence for the remainder of its Monday–Sunday week.

Schedule validation rejects unknown or incomplete objects, invalid weekdays,
duplicate weekdays, non-integer monthly days outside 1–31, and event-relative
lead times outside the current 0–365-day editor contract. Invalid legacy
schedules are ignored during hydration and are not emitted by writers.

All date comparisons use `YYYY-MM-DD` civil-date semantics. Date-only strings
are validated and operated on as local civil calendar values; they are never
parsed with `new Date('YYYY-MM-DD')` or shifted through UTC.

### Planned

The following normative forms remain outside the current wire and are not
invented by this checkpoint:

- monthly calendar positions such as the last Thursday of a month;
- no-fixed-day monthly recurrence;
- an absolute-date punctual schedule; and
- migration markers and backfill fields.

Persisted Actions, Calendar integration, and the remaining hierarchy UI remain
future work.

### Legacy compatibility

The existing `tasks-list` schedule wire is preserved. Event-relative schedules
continue to round-trip in their legacy shape and hydrate to an independent
Event association. New and edited documents also persist the canonical
`eventAssociation` field; an Event-relative write emits both contracts with
the same Event id. Flexible weekly schedules continue to project at the week
horizon without creating seven occurrences. No historical migration is
required by this checkpoint.

## 13.3. Action projection checkpoint

### Implemented

`projectActionsForDate` is a pure projection over hydrated Tasks and explicit
Event context. It returns at most one runtime Action per Task; no Action or
occurrence document is persisted.

The projection now applies these rules:

- `status === 2` suppresses every Task Action, including recurring Tasks;
- recurring daily, selected-weekday, and monthly occurrences are suppressed
  when their occurrence date equals `lastActionCompletedDate`;
- flexible weekly recurrence is one Action window per Monday–Sunday week and
  is suppressed after a completion recorded within that same civil week;
- punctual Tasks use current manual day planning, future planning is excluded,
  and an open past day plan rolls over to the target date;
- punctual Tasks without planning remain absent unless they are explicitly
  `Em foco`, which promotes them to the day projection;
- event-relative Tasks receive resolved Event context, project on their
  effective date, and roll over after that date while still open; and
- root Tasks and their direct embedded Subtasks are projected independently;
  a Subtask uses only its own status, recurrence, daily execution, planning,
  automation, and Event association; and
- status, schedule, planning, and completion matches are resolved before
  favorable-condition highlighting.

Projected Actions carry their source and completion mode in memory. Recurring
completion writes use `lastActionCompletedDate`; punctual completion writes
use lifecycle `status`. Neither path creates a persisted Action.

### Planned

Calendar integration, persisted daily-execution history beyond the current
date field, and broader hierarchy UI remain future work.

### Legacy compatibility

`actionPlanning` remains readable for existing Tasks and is interpreted in the
projection layer. It does not replace recurrence or create a parallel Action
model. Existing weather/automation evaluation remains a post-projection
highlighting step; unavailable weather does not remove the base Action.

This checkpoint freezes product semantics and the decided association wire.
Do not yet invent or freeze exact TypeScript or Firestore representations for:

- Task nature;
- monthly calendar-position recurrence;
- no-fixed-day monthly recurrence; or
- migration fields and backfill markers.

Those representations require a separate `AUDIT → EVIDENCE → DECISION`
checkpoint covering historical documents and compatibility.

When existing implementation behavior conflicts with this document, it is
migration debt. New work must follow this model and must not use legacy
manual-horizon behavior, recurring completion as global completion, or Event
association encoded as recurrence as precedent for new features.
