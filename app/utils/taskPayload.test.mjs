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
    eventId: 'event-legacy',
    leadDays: 2,
  })
  assert.deepEqual(serializeTask(task), {
    content: 'Conflito',
    status: 0,
    eventAssociation: { eventId: 'event-legacy' },
    schedule: { type: 'eventRelative', eventId: 'event-legacy', leadDays: 2 },
  })
})

test('serializes independent association for punctual and recurring tasks', () => {
  const association = { eventId: 'event-1' }

  assert.deepEqual(buildTaskPayload({
    content: 'Pontual',
    status: 0,
    eventAssociation: association,
  }).eventAssociation, association)

  assert.deepEqual(buildTaskPayload({
    content: 'Diária',
    status: 0,
    schedule: { type: 'daily' },
    eventAssociation: association,
  }), {
    content: 'Diária',
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

test('event-relative writes synchronize the independent association and never include leadDays there', () => {
  const payload = buildTaskPayload({
    content: 'Antes do evento',
    status: 0,
    schedule: { type: 'eventRelative', eventId: 'event-rule', leadDays: 3 },
    eventAssociation: { eventId: 'event-other' },
  })

  assert.deepEqual(payload.eventAssociation, { eventId: 'event-rule' })
  assert.deepEqual(payload.schedule, {
    type: 'eventRelative',
    eventId: 'event-rule',
    leadDays: 3,
  })
  assert.equal('leadDays' in payload.eventAssociation, false)
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

test('nested completion writers update only the embedded child and preserve the parent', () => {
  const parent = hydrateTask('parent-1', {
    content: 'Projeto',
    status: 1,
    subtasks: [{ id: 'child-1', content: 'Etapa', status: 0 }],
  })
  const dailyUpdate = buildNestedTaskDailyCompletionUpdate(parent, 'child-1', '2026-10-01')
  const statusUpdate = buildNestedTaskStatusUpdate(parent, 'child-1', 2)

  assert.equal(dailyUpdate?.status, 1)
  assert.equal(dailyUpdate?.subtasks?.[0].lastActionCompletedDate, '2026-10-01')
  assert.equal(statusUpdate?.status, 1)
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
    subtasks: [{ ...current.subtasks[0], status: 0, focusedOnDate: undefined }],
  }
  const update = buildTaskFocusReconciliationUpdate(current, reconciled)

  assert.equal(update?.status, 0)
  assert.equal('focusedOnDate' in update, true)
  assert.equal('content' in update, false)
  assert.equal(update?.subtasks?.[0].status, 0)
  assert.equal(update?.subtasks?.[0].parentTaskId, 'root')
})
