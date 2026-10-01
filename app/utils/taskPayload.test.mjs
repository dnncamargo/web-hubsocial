import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildTaskDailyCompletionUpdate,
  buildTaskPayload,
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
  assert.deepEqual(payload.subtasks, [])
  assert.equal(payload.order, 3)
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
    eventAssociation: { eventId: 'event-1' },
  }])
})

test('builds explicit updates for schedule removal and daily completion changes', () => {
  const update = buildTaskUpdate({
    content: 'Tarefa editada',
    actionPlanning: {},
    automation: { match: 'all', rules: [] },
  })
  const completed = buildTaskDailyCompletionUpdate('2026-09-30')
  const cleared = buildTaskDailyCompletionUpdate(null)

  assert.equal(update.content, 'Tarefa editada')
  assert.equal('schedule' in update, true)
  assert.equal(completed.lastActionCompletedDate, '2026-09-30')
  assert.equal('lastActionCompletedDate' in cleared, true)
  assert.deepEqual(buildTaskStatusUpdate(2), { status: 2 })
})
