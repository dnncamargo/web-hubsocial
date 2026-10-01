import test from 'node:test'
import assert from 'node:assert/strict'
import { Timestamp } from 'firebase/firestore'
import {
  buildTaskStatusUpdateForTask,
  buildSupertaskStatusUpdate,
  hydrateTask,
  isTaskArchived,
} from './taskPayload.ts'
import { getEffectiveTaskStatus, deriveSupertaskStatus } from './taskSubtasks.ts'
import {
  getTaskOccurrenceDateForDate,
  isTaskOccurrenceMarkerCurrent,
} from './taskSchedule.ts'
import { reconcileTaskFocusTree, reconcileTaskOperationalStatus } from './taskFocus.ts'
import { projectActionsForDate } from './actionProjection.ts'

function task(id, schedule, overrides = {}) {
  return {
    id,
    content: id,
    status: 0,
    nature: schedule ? 'recurring' : 'punctual',
    schedule,
    subtasks: [],
    ...overrides,
  }
}

function child(id, overrides = {}) {
  return {
    id,
    content: id,
    status: 0,
    nature: 'punctual',
    parentTaskId: 'parent',
    subtasks: undefined,
    ...overrides,
  }
}

test('daily recurring status 2 remains current, then becomes 0 at the next occurrence', () => {
  const completed = task('daily', { type: 'daily' }, {
    status: 2,
    lastActionCompletedDate: '2026-10-01',
  })
  assert.equal(getEffectiveTaskStatus(completed, '2026-10-01'), 2)
  assert.equal(getEffectiveTaskStatus(completed, '2026-10-02'), 0)
})

test('daily recurring focus 1 remains current, then becomes 0 at the next occurrence', () => {
  const focused = task('daily', { type: 'daily' }, {
    status: 1,
    lastFocusedOccurrenceDate: '2026-10-01',
  })
  assert.equal(getEffectiveTaskStatus(focused, '2026-10-01'), 1)
  assert.equal(getEffectiveTaskStatus(focused, '2026-10-02'), 0)
})

test('weekly specific completion and focus follow the next configured weekday', () => {
  const schedule = { type: 'weekly', weekdays: ['monday', 'wednesday'] }
  const completed = task('specific-done', schedule, {
    status: 2,
    lastActionCompletedDate: '2026-10-05',
  })
  const focused = task('specific-focus', schedule, {
    status: 1,
    lastFocusedOccurrenceDate: '2026-10-05',
  })
  assert.equal(getEffectiveTaskStatus(completed, '2026-10-06'), 2)
  assert.equal(getEffectiveTaskStatus(completed, '2026-10-07'), 0)
  assert.equal(getEffectiveTaskStatus(focused, '2026-10-06'), 1)
  assert.equal(getEffectiveTaskStatus(focused, '2026-10-07'), 0)
})

test('weekly flexible completion and focus follow the Monday–Sunday boundary', () => {
  const completed = task('flexible-done', { type: 'weekly' }, {
    status: 2,
    lastActionCompletedDate: '2026-10-07',
  })
  const focused = task('flexible-focus', { type: 'weekly' }, {
    status: 1,
    lastFocusedOccurrenceDate: '2026-10-07',
  })
  assert.equal(getEffectiveTaskStatus(completed, '2026-10-11'), 2)
  assert.equal(getEffectiveTaskStatus(completed, '2026-10-12'), 0)
  assert.equal(getEffectiveTaskStatus(focused, '2026-10-11'), 1)
  assert.equal(getEffectiveTaskStatus(focused, '2026-10-12'), 0)
})

test('monthly status uses the effective occurrence and the canonical clamp', () => {
  const monthly = task('monthly', { type: 'monthly', dayOfMonth: 15 }, {
    status: 2,
    lastActionCompletedDate: '2026-10-15',
  })
  const clamped = task('clamped', { type: 'monthly', dayOfMonth: 31 }, {
    status: 2,
    lastActionCompletedDate: '2026-02-28',
  })
  assert.equal(getEffectiveTaskStatus(monthly, '2026-11-14'), 2)
  assert.equal(getEffectiveTaskStatus(monthly, '2026-11-15'), 0)
  assert.equal(getEffectiveTaskStatus(clamped, '2026-02-28'), 2)
  assert.equal(getEffectiveTaskStatus(clamped, '2026-03-30'), 2)
  assert.equal(getEffectiveTaskStatus(clamped, '2026-03-31'), 0)
  assert.equal(getTaskOccurrenceDateForDate(monthly, '2027-01-14'), '2026-12-15')
  assert.equal(getTaskOccurrenceDateForDate(monthly, '2027-01-15'), '2027-01-15')
})

test('occurrence markers stay civil across a year boundary and DST-sensitive dates', () => {
  const schedule = { type: 'weekly', weekdays: ['monday'] }
  assert.equal(getTaskOccurrenceDateForDate({ schedule }, '2027-01-03'), '2026-12-28')
  assert.equal(isTaskOccurrenceMarkerCurrent(
    { schedule }, '2026-12-28', '2027-01-03', '2026-12-28',
  ), true)
  assert.equal(isTaskOccurrenceMarkerCurrent(
    { schedule }, '2026-12-28', '2027-01-04', '2027-01-04',
  ), false)
})

test('recurring Supertask aggregate wins over root status and rolls over without child rewrites', () => {
  const parent = task('parent', { type: 'daily' }, {
    status: 2,
    subtasks: [
      child('one', { lastCompletedOccurrenceDate: '2026-10-01' }),
      child('two', { lastCompletedOccurrenceDate: '2026-10-01' }),
    ],
  })
  assert.equal(deriveSupertaskStatus(parent, '2026-10-01'), 2)
  assert.equal(getEffectiveTaskStatus(parent, '2026-10-01'), 2)
  assert.equal(getEffectiveTaskStatus(parent, '2026-10-02'), 0)
  assert.equal(parent.subtasks[0].lastCompletedOccurrenceDate, '2026-10-01')
  assert.equal(parent.subtasks[1].lastCompletedOccurrenceDate, '2026-10-01')
})

test('recurring Supertask aggregate maps incomplete, partial, and complete progress', () => {
  const incomplete = task('incomplete', { type: 'daily' }, {
    subtasks: [child('one'), child('two')],
  })
  const partial = task('partial', { type: 'daily' }, {
    subtasks: [child('one', { lastCompletedOccurrenceDate: '2026-10-01' }), child('two')],
  })
  const complete = task('complete', { type: 'daily' }, {
    subtasks: [
      child('one', { lastCompletedOccurrenceDate: '2026-10-01' }),
      child('two', { lastCompletedOccurrenceDate: '2026-10-01' }),
    ],
  })
  assert.equal(getEffectiveTaskStatus(incomplete, '2026-10-01'), 0)
  assert.equal(getEffectiveTaskStatus(partial, '2026-10-01'), 1)
  assert.equal(getEffectiveTaskStatus(complete, '2026-10-01'), 2)
})

test('simple recurring writers set minimal status, focus, and completion markers', () => {
  const recurring = task('recurring', { type: 'daily' })
  const notStarted = buildTaskStatusUpdateForTask(recurring, 0, '2026-10-01')
  const focused = buildTaskStatusUpdateForTask(recurring, 1, '2026-10-01')
  const completed = buildTaskStatusUpdateForTask(recurring, 2, '2026-10-01')
  assert.equal(notStarted.status, 0)
  assert.equal(focused.status, 1)
  assert.equal(focused.lastFocusedOccurrenceDate, '2026-10-01')
  assert.equal(focused.lastActionCompletedDate._methodName, 'deleteField')
  assert.equal(completed.status, 2)
  assert.equal(completed.lastActionCompletedDate, '2026-10-01')
  assert.equal(completed.lastFocusedOccurrenceDate._methodName, 'deleteField')
})

test('root Action completion writes status 2 for the current occurrence and reopens next time', () => {
  const recurring = task('action-task', { type: 'daily' })
  const [action] = projectActionsForDate([recurring], '2026-10-01')
  const update = buildTaskStatusUpdateForTask(recurring, 2, action.effectiveDate)
  const completed = { ...recurring, ...update }

  assert.equal(update.status, 2)
  assert.equal(update.lastActionCompletedDate, '2026-10-01')
  assert.equal(getEffectiveTaskStatus(completed, '2026-10-01'), 2)
  assert.equal(getEffectiveTaskStatus(completed, '2026-10-02'), 0)
})

test('recurring Supertask bulk commands affect only the current occurrence', () => {
  const parent = task('parent', { type: 'daily' }, {
    subtasks: [child('one'), child('two')],
  })
  const update = buildSupertaskStatusUpdate(parent, 2, '2026-10-01')
  assert.equal(update.status, 2)
  assert.deepEqual(update.subtasks.map(item => item.lastCompletedOccurrenceDate), [
    '2026-10-01', '2026-10-01',
  ])
  assert.equal(update.subtasks.every(item => item.status === 2), true)
})

test('Supertask bulk commands update children instead of only the parent', () => {
  const parent = task('punctual-parent', undefined, {
    subtasks: [child('one'), child('two')],
  })
  const complete = buildSupertaskStatusUpdate(parent, 2, '2026-10-01')
  const reopen = buildSupertaskStatusUpdate(parent, 0, '2026-10-01')

  assert.equal(complete.status, 2)
  assert.deepEqual(complete.subtasks.map(item => item.status), [2, 2])
  assert.equal(reopen.status, 0)
  assert.deepEqual(reopen.subtasks.map(item => item.status), [0, 0])
})

test('archived recurring tasks preserve status and skip temporal reconciliation', () => {
  const archived = hydrateTask('archived', {
    content: 'Archived',
    status: 2,
    schedule: { type: 'daily' },
    lastActionCompletedDate: '2026-10-01',
    archivedAt: Timestamp.now(),
  }, '2026-10-02')
  assert.equal(isTaskArchived(archived), true)
  assert.equal(archived.status, 2)
  assert.equal(getEffectiveTaskStatus(archived, '2026-10-02'), 2)
  assert.deepEqual(projectActionsForDate([archived], '2026-10-02'), [])
  assert.equal(reconcileTaskOperationalStatus(archived, '2026-10-02').changed, false)
  assert.equal(reconcileTaskFocusTree([archived], '2026-10-02')[0], archived)
})
