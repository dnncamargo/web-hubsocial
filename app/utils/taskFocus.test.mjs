import assert from 'node:assert/strict'
import test from 'node:test'
import { projectActionsForDate } from './actionProjection.ts'
import {
  applyTaskStatusTransition,
  getCurrentCivilDate,
  reconcilePunctualTaskFocus,
  reconcileTaskFocusTree,
} from './taskFocus.ts'

function task(id, overrides = {}) {
  return {
    id,
    content: id,
    status: 0,
    nature: 'punctual',
    subtasks: undefined,
    ...overrides,
  }
}

test('entering focus stamps the current civil date and remains stable on the same day', () => {
  const focused = applyTaskStatusTransition(task('one'), 1, '2026-09-30')
  const repeated = applyTaskStatusTransition(focused, 1, '2026-09-30')

  assert.equal(focused.status, 1)
  assert.equal(focused.focusedOnDate, '2026-09-30')
  assert.equal(repeated.focusedOnDate, '2026-09-30')
})

test('leaving focus removes the operational date for not-started and completed states', () => {
  const focused = task('one', { status: 1, focusedOnDate: '2026-09-30' })

  assert.equal(applyTaskStatusTransition(focused, 0, '2026-10-01').focusedOnDate, undefined)
  assert.equal(applyTaskStatusTransition(focused, 2, '2026-10-01').focusedOnDate, undefined)
})

test('recurring tasks never acquire or retain focusedOnDate', () => {
  const recurring = task('daily', {
    nature: 'recurring',
    schedule: { type: 'daily' },
    status: 1,
    focusedOnDate: '2026-09-30',
  })

  assert.equal(applyTaskStatusTransition(recurring, 1, '2026-10-01').focusedOnDate, undefined)
  assert.equal(reconcilePunctualTaskFocus(recurring, '2026-10-01').task.focusedOnDate, undefined)
})

test('a punctual focus remains active on the stamped civil day', () => {
  const result = reconcilePunctualTaskFocus(
    task('one', { status: 1, focusedOnDate: '2026-10-01' }),
    '2026-10-01',
  )

  assert.equal(result.changed, false)
  assert.equal(result.task.status, 1)
})

test('a punctual focus rolls over on the next civil day and removes only its focus state', () => {
  const original = task('one', {
    status: 1,
    focusedOnDate: '2026-09-30',
    lastActionCompletedDate: '2026-09-29',
    actionPlanning: { day: '2026-09-30' },
    schedule: { type: 'eventRelative', eventId: 'event-1', leadDays: 1 },
  })
  const result = reconcilePunctualTaskFocus(original, '2026-10-01')

  assert.equal(result.changed, true)
  assert.equal(result.task.status, 0)
  assert.equal(result.task.focusedOnDate, undefined)
  assert.equal(result.task.lastActionCompletedDate, '2026-09-29')
  assert.deepEqual(result.task.actionPlanning, { day: '2026-09-30' })
  assert.deepEqual(result.task.schedule, { type: 'eventRelative', eventId: 'event-1', leadDays: 1 })
})

test('rollover compares civil strings across month and year boundaries without UTC conversion', () => {
  const month = reconcilePunctualTaskFocus(
    task('month', { status: 1, focusedOnDate: '2026-09-30' }),
    '2026-10-01',
  )
  const year = reconcilePunctualTaskFocus(
    task('year', { status: 1, focusedOnDate: '2025-12-31' }),
    '2026-01-01',
  )

  assert.equal(month.task.status, 0)
  assert.equal(year.task.status, 0)
  assert.equal(getCurrentCivilDate(new Date(2026, 9, 1, 23, 30)), '2026-10-01')
})

test('completed punctual tasks do not roll over on a later day', () => {
  const result = reconcilePunctualTaskFocus(
    task('done', { status: 2, focusedOnDate: '2026-09-30' }),
    '2026-10-01',
  )

  assert.equal(result.task.status, 2)
  assert.equal(result.task.focusedOnDate, undefined)
})

test('legacy focus without a date is preserved for the first day and initialized opportunistically', () => {
  const result = reconcilePunctualTaskFocus(task('legacy', { status: 1 }), '2026-10-01')

  assert.equal(result.task.status, 1)
  assert.equal(result.task.focusedOnDate, '2026-10-01')
  assert.equal(result.changed, true)
})

test('invalid focus dates are defensive and become a valid current-day marker', () => {
  const result = reconcilePunctualTaskFocus(
    task('invalid', { status: 1, focusedOnDate: '2026-02-30' }),
    '2026-03-01',
  )

  assert.equal(result.task.status, 1)
  assert.equal(result.task.focusedOnDate, '2026-03-01')
})

test('future focus dates are preserved defensively instead of being reset', () => {
  const result = reconcilePunctualTaskFocus(
    task('clock-skew', { status: 1, focusedOnDate: '2026-10-02' }),
    '2026-10-01',
  )

  assert.equal(result.changed, false)
  assert.equal(result.task.status, 1)
})

test('tree reconciliation resets a stale subtask without changing its parent', () => {
  const parent = task('parent', {
    status: 0,
    subtasks: [task('child', { status: 1, focusedOnDate: '2026-09-30', parentTaskId: 'parent' })],
  })
  const [reconciled] = reconcileTaskFocusTree([parent], '2026-10-01')

  assert.equal(reconciled.status, 0)
  assert.equal(reconciled.focusedOnDate, undefined)
  assert.equal(reconciled.subtasks[0].status, 0)
  assert.equal(reconciled.subtasks[0].focusedOnDate, undefined)
})

test('tree reconciliation is idempotent after the first rollover', () => {
  const first = reconcileTaskFocusTree(
    [task('one', { status: 1, focusedOnDate: '2026-09-30' })],
    '2026-10-01',
  )
  const second = reconcileTaskFocusTree(first, '2026-10-01')

  assert.equal(second[0], first[0])
  assert.equal(second[0].status, 0)
})

test('planning rollover remains available after focus rollover', () => {
  const [reconciled] = reconcileTaskFocusTree(
    [task('planned', {
      status: 1,
      focusedOnDate: '2026-09-30',
      actionPlanning: { day: '2026-09-30' },
    })],
    '2026-10-01',
  )
  const actions = projectActionsForDate([reconciled], '2026-10-01')

  assert.equal(actions.length, 1)
  assert.equal(actions[0].source, 'rollover')
})

test('a punctual task without planning produces no action after focus rollover', () => {
  const [reconciled] = reconcileTaskFocusTree(
    [task('unplanned', { status: 1, focusedOnDate: '2026-09-30' })],
    '2026-10-01',
  )

  assert.deepEqual(projectActionsForDate([reconciled], '2026-10-01'), [])
})
