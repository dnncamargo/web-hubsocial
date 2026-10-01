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

test('keeps event association independent while preserving the legacy event-relative wire field', () => {
  const task = hydrateTask('task-event', {
    content: 'Alugar terno',
    status: 0,
    schedule: { type: 'eventRelative', eventId: 'event-1', leadDays: 14 },
  })

  assert.equal(task.nature, 'punctual')
  assert.deepEqual(task.eventAssociation, { eventId: 'event-1', leadDays: 14 })
  assert.deepEqual(serializeTask(task).schedule, {
    type: 'eventRelative',
    eventId: 'event-1',
    leadDays: 14,
  })
})

test('round-trips the decided nested hierarchy while keeping the parent document id out of the payload', () => {
  const task = hydrateTask('parent-1', {
    content: 'Projeto',
    status: 0,
    subtasks: [{ id: 'child-1', content: 'Etapa', status: 1 }],
  })

  const payload = serializeTask(task)
  assert.equal('id' in payload, false)
  assert.deepEqual(payload.subtasks, [{
    id: 'child-1',
    content: 'Etapa',
    status: 1,
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
