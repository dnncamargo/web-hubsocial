import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildTaskDailyCompletionUpdate,
  buildNestedTaskDailyCompletionUpdate,
  buildNestedTaskStatusUpdate,
  buildTaskPayload,
  buildTaskFocusReconciliationUpdate,
  buildTaskStatusUpdate,
  buildTaskUpdate,
  deriveTaskNature,
  getTaskAuthoringAutomation,
  hydrateTask,
  serializeTask,
} from './taskPayload.ts'

const baseTask = {
  id: 'task-1',
  content: 'Preparar relatório',
  status: 1,
  nature: 'punctual',
  order: 3,
  subtasks: [],
  createdAt: new Date('2026-09-30T12:00:00Z'),
  actionPlanning: { day: '2026-09-30' },
  automation: { match: 'all', rules: [] },
}

test('builds the decided wire payload without the runtime document id or domain-only nature', () => {
  const payload = buildTaskPayload({
    content: '  Preparar relatório  ',
    status: 0,
    order: 2,
    createdAt: baseTask.createdAt,
    actionPlanning: {},
    automation: { match: 'all', rules: [] },
  })

  assert.equal(payload.content, 'Preparar relatório')
  assert.equal(payload.status, 0)
  assert.equal('id' in payload, false)
  assert.equal('nature' in payload, false)
})

test('serializes the canonical task fields and excludes top-level runtime extras', () => {
  const payload = serializeTask({
    ...baseTask,
    legacyUnknownField: 'ignore me',
  })

  assert.equal('id' in payload, false)
  assert.equal('legacyUnknownField' in payload, false)
  assert.equal('parentTaskId' in payload, false)
  assert.deepEqual(payload.subtasks, [])
  assert.equal(payload.order, 3)
})

test('preserves legacy groupId without using it as hierarchy and does not generate it for new Tasks', () => {
  const legacy = hydrateTask('legacy-group', {
    content: 'Grupo legado',
    status: 0,
    groupId: 'legacy-1',
  })
  assert.equal(serializeTask(legacy).groupId, 'legacy-1')

  const fresh = buildTaskPayload({ content: 'Nova', status: 0 })
  assert.equal('groupId' in fresh, false)
})

test('hydrates legacy statuses defensively and derives punctual nature without a recurrence', () => {
  const task = hydrateTask('legacy-1', {
    content: 'Tarefa legada',
    status: 99,
    schedule: { type: 'not-a-schedule' },
  })

  assert.equal(task.id, 'legacy-1')
  assert.equal(task.status, 0)
  assert.equal(task.nature, 'punctual')
  assert.equal(task.schedule, undefined)
})

test('derives recurring nature only from recurring schedule forms', () => {
  assert.equal(deriveTaskNature({ type: 'daily' }), 'recurring')
  assert.equal(deriveTaskNature({ type: 'weekly', weekdays: ['monday'] }), 'recurring')
  assert.equal(deriveTaskNature({ type: 'monthly', dayOfMonth: 15 }), 'recurring')
  assert.equal(
    deriveTaskNature({ type: 'eventRelative', eventId: 'event-1', leadDays: 7 }),
    'punctual',
  )
})

test('forward-normalizes legacy event-relative data into independent association', () => {
  const task = hydrateTask('task-event', {
    content: 'Alugar terno',
    status: 0,
    schedule: { type: 'eventRelative', eventId: 'event-1', leadDays: 14 },
  })

  assert.equal(task.nature, 'punctual')
  assert.deepEqual(task.eventAssociation, { eventId: 'event-1' })
  assert.deepEqual(serializeTask(task).schedule, {
    type: 'eventRelative',
    eventId: 'event-1',
    leadDays: 14,
  })
  assert.deepEqual(serializeTask(task).eventAssociation, { eventId: 'event-1' })
})

test('hydrates canonical association without changing recurrence or derived nature', () => {
  for (const schedule of [
    undefined,
    { type: 'daily' },
    { type: 'weekly', weekdays: ['monday'] },
    { type: 'monthly', dayOfMonth: 31 },
  ]) {
    const task = hydrateTask('task-canonical', {
      content: 'Tarefa associada',
      status: 0,
      ...(schedule ? { schedule } : {}),
      eventAssociation: { eventId: 'event-1' },
    })

    assert.deepEqual(task.eventAssociation, { eventId: 'event-1' })
    assert.deepEqual(task.schedule, schedule)
    assert.equal(task.nature, schedule?.type === 'daily'
      || schedule?.type === 'weekly'
      || schedule?.type === 'monthly' ? 'recurring' : 'punctual')
  }
})

test('canonical association wins defensively when it conflicts with legacy event-relative data', () => {
  const task = hydrateTask('task-conflict', {
    content: 'Conflito',
    status: 0,
    eventAssociation: { eventId: 'event-canonical' },
    schedule: { type: 'eventRelative', eventId: 'event-legacy', leadDays: 2 },
  })

  assert.deepEqual(task.eventAssociation, { eventId: 'event-canonical' })
  assert.deepEqual(task.schedule, {
    type: 'eventRelative',
    eventId: 'event-canonical',
    leadDays: 2,
  })
  assert.deepEqual(serializeTask(task), {
    content: 'Conflito',
    status: 0,
    automation: {
      match: 'all',
      rules: [{
        id: 'task-event-condition',
        type: 'upcomingEvent',
        eventId: 'event-canonical',
        withinDays: 2,
      }],
    },
    eventAssociation: { eventId: 'event-canonical' },
    schedule: { type: 'eventRelative', eventId: 'event-canonical', leadDays: 2 },
  })
})

test('canonicalizes every Event-dependent rule from the association and preserves independent conditions', () => {
  const task = hydrateTask('task-event-context', {
    content: 'Preparar evento',
    status: 0,
    eventAssociation: { eventId: 'event-canonical' },
    schedule: { type: 'eventRelative', eventId: 'event-legacy', leadDays: 14 },
    automation: {
      match: 'any',
      rules: [
        { id: 'weekday', type: 'weekday', weekdays: ['friday'] },
        { id: 'weather', type: 'weather', condition: 'sunny' },
        { id: 'event', type: 'upcomingEvent', eventId: 'event-other', withinDays: 3 },
      ],
    },
  })

  assert.equal(task.eventAssociation.eventId, 'event-canonical')
  assert.equal(task.schedule.eventId, 'event-canonical')
  assert.equal(task.schedule.leadDays, 14)
  assert.equal(task.automation.match, 'any')
  assert.deepEqual(task.automation.rules, [
    { id: 'weekday', type: 'weekday', weekdays: ['friday'] },
    { id: 'weather', type: 'weather', condition: 'sunny' },
    { id: 'event', type: 'upcomingEvent', eventId: 'event-canonical', withinDays: 3 },
  ])
})

test('legacy Subtask Event consumers round-trip independently during parent serialization', () => {
  const task = hydrateTask('parent', {
    content: 'Parent',
    status: 0,
    eventAssociation: { eventId: 'root-event' },
    schedule: { type: 'eventRelative', eventId: 'root-legacy', leadDays: 5 },
    automation: {
      match: 'all',
      rules: [{ id: 'root-event', type: 'upcomingEvent', eventId: 'root-other', withinDays: 2 }],
    },
    subtasks: [{
      id: 'legacy-child',
      content: 'Legacy child',
      status: 1,
      eventAssociation: { eventId: 'subtask-association' },
      schedule: { type: 'eventRelative', eventId: 'subtask-relative', leadDays: 7 },
      automation: {
        match: 'any',
        rules: [
          { id: 'weekday', type: 'weekday', weekdays: ['monday'] },
          { id: 'subtask-event', type: 'upcomingEvent', eventId: 'subtask-upcoming', withinDays: 3 },
        ],
      },
    }],
  })

  const payload = serializeTask({ ...task, eventAssociation: { eventId: 'root-updated' } })
  const legacyChild = payload.subtasks[0]

  assert.deepEqual(payload.eventAssociation, { eventId: 'root-updated' })
  assert.equal(payload.schedule.eventId, 'root-updated')
  assert.equal(payload.automation.rules.find(rule => rule.type === 'upcomingEvent').eventId, 'root-updated')
  assert.deepEqual(legacyChild.eventAssociation, { eventId: 'subtask-association' })
  assert.equal(legacyChild.schedule.eventId, 'subtask-relative')
  assert.equal(legacyChild.automation.rules.find(rule => rule.type === 'upcomingEvent').eventId, 'subtask-upcoming')
})

test('serializes independent association for punctual and recurring tasks', () => {
  const association = { eventId: 'event-1' }

  assert.deepEqual(buildTaskPayload({
    content: 'Pontual',
    status: 0,
    eventAssociation: association,
  }), {
    content: 'Pontual',
    status: 0,
    automation: {
      match: 'all',
      rules: [{ id: 'task-event-condition', type: 'upcomingEvent', eventId: 'event-1', withinDays: 3 }],
    },
    schedule: { type: 'eventRelative', eventId: 'event-1', leadDays: 3 },
    eventAssociation: association,
  })

  assert.deepEqual(buildTaskPayload({
    content: 'Diária',
    status: 0,
    schedule: { type: 'daily' },
    eventAssociation: association,
  }), {
    content: 'Diária',
    automation: {
      match: 'all',
      rules: [{ id: 'task-event-condition', type: 'upcomingEvent', eventId: 'event-1', withinDays: 3 }],
    },
    status: 0,
    eventAssociation: association,
    schedule: { type: 'daily' },
  })
})

test('removes an association through the update boundary and preserves it when changing frequency', () => {
  const removed = buildTaskUpdate({
    content: 'Sem Event',
    actionPlanning: {},
    automation: { match: 'all', rules: [] },
    schedule: { type: 'daily' },
    eventAssociation: undefined,
  })
  const kept = buildTaskUpdate({
    content: 'Frequência alterada',
    actionPlanning: {},
    automation: { match: 'all', rules: [] },
    schedule: { type: 'monthly', dayOfMonth: 31 },
    eventAssociation: { eventId: 'event-1' },
  })

  assert.equal('eventAssociation' in removed, true)
  assert.deepEqual(kept.eventAssociation, { eventId: 'event-1' })
  assert.deepEqual(kept.schedule, { type: 'monthly', dayOfMonth: 31 })
})

test('Event-dependent writers synchronize to the association and never include leadDays there', () => {
  const payload = buildTaskPayload({
    content: 'Antes do evento',
    status: 0,
    schedule: { type: 'eventRelative', eventId: 'event-rule', leadDays: 3 },
    eventAssociation: { eventId: 'event-other' },
  })

  assert.deepEqual(payload.eventAssociation, { eventId: 'event-other' })
  assert.deepEqual(payload.schedule, {
    type: 'eventRelative',
    eventId: 'event-other',
    leadDays: 3,
  })
  assert.equal('leadDays' in payload.eventAssociation, false)
})

test('editing the canonical Event condition updates every materialized consumer', () => {
  const update = buildTaskUpdate({
    content: 'Antes do novo evento',
    actionPlanning: {},
    automation: {
      match: 'all',
      rules: [
        { id: 'weekday', type: 'weekday', weekdays: ['friday'] },
        { id: 'event', type: 'upcomingEvent', eventId: 'event-a', withinDays: 3 },
      ],
    },
    schedule: { type: 'eventRelative', eventId: 'event-a', leadDays: 14 },
    eventAssociation: { eventId: 'event-b' },
  })

  assert.deepEqual(update.eventAssociation, { eventId: 'event-b' })
  assert.deepEqual(update.schedule, {
    type: 'eventRelative', eventId: 'event-b', leadDays: 3,
  })
  assert.deepEqual(update.automation, {
    match: 'all',
    rules: [
      { id: 'weekday', type: 'weekday', weekdays: ['friday'] },
      { id: 'event', type: 'upcomingEvent', eventId: 'event-b', withinDays: 3 },
    ],
  })
})

test('removing the Event condition removes only Event-dependent capabilities', () => {
  const update = buildTaskUpdate({
    content: 'Sem Event',
    actionPlanning: { day: '2026-10-01' },
    automation: {
      match: 'any',
      rules: [
        { id: 'weekday', type: 'weekday', weekdays: ['monday'] },
        { id: 'weather', type: 'weather', condition: 'rainy' },
      ],
    },
    schedule: undefined,
    eventAssociation: undefined,
  })

  assert.equal('schedule' in update, true)
  assert.equal('eventAssociation' in update, true)
  assert.deepEqual(update.automation, {
    match: 'any',
    rules: [
      { id: 'weekday', type: 'weekday', weekdays: ['monday'] },
      { id: 'weather', type: 'weather', condition: 'rainy' },
    ],
  })
  assert.equal(update.schedule?.type, undefined)
})

test('incomplete Event conditions cannot persist Event-dependent capabilities', () => {
  const payload = buildTaskPayload({
    content: 'Sem contexto',
    status: 0,
    automation: {
      match: 'all',
      rules: [{ id: 'event', type: 'upcomingEvent', eventId: '', withinDays: 3 }],
    },
  })

  assert.equal(payload.schedule, undefined)
  assert.equal(payload.eventAssociation, undefined)
  assert.deepEqual(payload.automation, { match: 'all', rules: [] })
})

test('legacy Event forms hydrate into one authoring condition without read-time migration', () => {
  const relativeOnly = hydrateTask('relative-only', {
    content: 'Legacy relative',
    status: 0,
    schedule: { type: 'eventRelative', eventId: 'event-a', leadDays: 14 },
  })
  const upcomingOnly = hydrateTask('upcoming-only', {
    content: 'Legacy upcoming',
    status: 0,
    automation: {
      match: 'all',
      rules: [{ id: 'event', type: 'upcomingEvent', eventId: 'event-a', withinDays: 5 }],
    },
  })
  const divergent = hydrateTask('divergent', {
    content: 'Legacy divergent',
    status: 0,
    schedule: { type: 'eventRelative', eventId: 'event-a', leadDays: 25 },
    automation: {
      match: 'all',
      rules: [{ id: 'event', type: 'upcomingEvent', eventId: 'event-a', withinDays: 3 }],
    },
  })

  assert.deepEqual(
    getTaskAuthoringAutomation(relativeOnly).rules.find(rule => rule.type === 'upcomingEvent'),
    { id: 'legacy-event-condition', type: 'upcomingEvent', eventId: 'event-a', withinDays: 14 },
  )
  assert.equal(
    getTaskAuthoringAutomation(upcomingOnly).rules.find(rule => rule.type === 'upcomingEvent').withinDays,
    5,
  )
  assert.equal(
    getTaskAuthoringAutomation(divergent).rules.find(rule => rule.type === 'upcomingEvent').withinDays,
    3,
  )
  assert.equal(divergent.schedule.leadDays, 25)
})

test('canonical Event condition synchronizes every root consumer and preserves recurrence', () => {
  const punctual = buildTaskPayload({
    content: 'Pontual',
    status: 0,
    automation: {
      match: 'all',
      rules: [{ id: 'event', type: 'upcomingEvent', eventId: 'event-a', withinDays: 3 }],
    },
  })
  const updated = buildTaskUpdate({
    content: 'Pontual',
    actionPlanning: {},
    automation: {
      match: 'all',
      rules: [{ id: 'event', type: 'upcomingEvent', eventId: 'event-b', withinDays: 7 }],
    },
    eventAssociation: { eventId: 'event-b' },
  })
  const recurring = buildTaskPayload({
    content: 'Recorrente',
    status: 0,
    schedule: { type: 'weekly', weekdays: ['monday'] },
    automation: {
      match: 'all',
      rules: [{ id: 'event', type: 'upcomingEvent', eventId: 'event-a', withinDays: 3 }],
    },
  })

  assert.deepEqual(punctual.eventAssociation, { eventId: 'event-a' })
  assert.deepEqual(punctual.schedule, {
    type: 'eventRelative', eventId: 'event-a', leadDays: 3,
  })
  assert.deepEqual(updated.eventAssociation, { eventId: 'event-b' })
  assert.deepEqual(updated.schedule, {
    type: 'eventRelative', eventId: 'event-b', leadDays: 7,
  })
  assert.equal(updated.automation.rules.find(rule => rule.type === 'upcomingEvent').withinDays, 7)
  assert.deepEqual(recurring.schedule, { type: 'weekly', weekdays: ['monday'] })
})

test('round-trips the decided nested hierarchy and association without using ids interchangeably', () => {
  const task = hydrateTask('parent-1', {
    content: 'Projeto',
    status: 0,
    subtasks: [{
      id: 'child-1',
      content: 'Etapa',
      status: 1,
      eventAssociation: { eventId: 'event-1' },
    }],
  })

  const payload = serializeTask(task)
  assert.equal('id' in payload, false)
  assert.deepEqual(payload.subtasks, [{
    id: 'child-1',
    content: 'Etapa',
    status: 1,
    parentTaskId: 'parent-1',
    eventAssociation: { eventId: 'event-1' },
  }])
})

test('round-trips the punctual operational focus date and rejects it for recurring tasks', () => {
  const punctual = hydrateTask('punctual', {
    content: 'Pontual em foco',
    status: 1,
    focusedOnDate: '2026-10-01',
  })
  const recurring = hydrateTask('recurring', {
    content: 'Diária em foco',
    status: 1,
    focusedOnDate: '2026-10-01',
    schedule: { type: 'daily' },
  })

  assert.equal(punctual.focusedOnDate, '2026-10-01')
  assert.equal(serializeTask(punctual).focusedOnDate, '2026-10-01')
  assert.equal(recurring.focusedOnDate, undefined)
  assert.equal('focusedOnDate' in serializeTask(recurring), false)
})

test('hydrates malformed hierarchy defensively without dropping valid siblings or nested descendants', () => {
  const task = hydrateTask('parent-1', {
    content: 'Projeto',
    status: 0,
    subtasks: [
      null,
      { id: 'child-1', content: 'Etapa', status: 1, parentTaskId: 'wrong-parent' },
      {
        id: 'child-2',
        content: 'Legado aninhado',
        status: 0,
        parentTaskId: 'parent-1',
        subtasks: [{ id: 'grandchild', content: 'Descendente', status: 0, parentTaskId: 'child-2' }],
      },
    ],
  })

  assert.deepEqual(task.subtasks?.map(subtask => subtask.id), ['child-1', 'child-2'])
  assert.equal(task.subtasks?.[1].subtasks?.[0].id, 'grandchild')
  assert.equal(task.hierarchyIssues?.some(issue => issue.code === 'missing-subtask-id'), true)
  assert.equal(task.hierarchyIssues?.some(issue => issue.code === 'invalid-parent-link'), true)
  assert.equal(task.hierarchyIssues?.some(issue => issue.code === 'nested-subtask'), true)
})

test('nested completion writers update the child and derive the parent aggregate', () => {
  const parent = hydrateTask('parent-1', {
    content: 'Projeto',
    status: 1,
    subtasks: [{ id: 'child-1', content: 'Etapa', status: 0 }],
  })
  const dailyUpdate = buildNestedTaskDailyCompletionUpdate(parent, 'child-1', '2026-10-01')
  const statusUpdate = buildNestedTaskStatusUpdate(parent, 'child-1', 2)

  assert.equal(dailyUpdate?.status, 2)
  assert.equal('lastActionCompletedDate' in (dailyUpdate?.subtasks?.[0] ?? {}), false)
  assert.equal(statusUpdate?.status, 2)
  assert.equal(statusUpdate?.subtasks?.[0].status, 2)
  assert.equal(statusUpdate?.subtasks?.[0].parentTaskId, 'parent-1')
})

test('builds explicit updates for schedule removal and daily completion changes', () => {
  const update = buildTaskUpdate({
    content: 'Tarefa editada',
    actionPlanning: {},
    automation: { match: 'all', rules: [] },
  })
  const recurringUpdate = buildTaskUpdate({
    content: 'Tarefa recorrente',
    actionPlanning: {},
    automation: { match: 'all', rules: [] },
    schedule: { type: 'daily' },
  })
  const completed = buildTaskDailyCompletionUpdate('2026-09-30')
  const cleared = buildTaskDailyCompletionUpdate(null)

  assert.equal(update.content, 'Tarefa editada')
  assert.equal('schedule' in update, true)
  assert.equal('focusedOnDate' in recurringUpdate, true)
  assert.equal(completed.lastActionCompletedDate, '2026-09-30')
  assert.equal('lastActionCompletedDate' in cleared, true)
  assert.equal(buildTaskStatusUpdate(2).status, 2)
  assert.equal('focusedOnDate' in buildTaskStatusUpdate(2), true)
})

test('focus reconciliation emits only the changed root fields and canonical nested array', () => {
  const current = hydrateTask('root', {
    content: 'Projeto',
    status: 1,
    focusedOnDate: '2026-09-30',
    subtasks: [{ id: 'child', content: 'Etapa', status: 1, focusedOnDate: '2026-09-30' }],
  })
  const reconciled = {
    ...current,
    status: 0,
    focusedOnDate: undefined,
    subtasks: [{
      ...current.subtasks[0],
      status: 0,
      legacySubtaskStatus: undefined,
      focusedOnDate: undefined,
    }],
  }
  const update = buildTaskFocusReconciliationUpdate(current, reconciled)

  assert.equal(update.status, 0)
  assert.equal('focusedOnDate' in update, true)
  assert.equal('content' in update, false)
  assert.equal(update?.subtasks?.[0].status, 0)
  assert.equal(update?.subtasks?.[0].parentTaskId, 'root')
})
