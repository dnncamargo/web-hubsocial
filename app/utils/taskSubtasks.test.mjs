import assert from 'node:assert/strict'
import test from 'node:test'
import { Timestamp } from 'firebase/firestore'
import {
  buildTaskArchiveUpdate,
  buildTaskRestoreUpdate,
  buildNestedTaskStatusUpdate,
  hydrateTask,
  isTaskArchived,
  serializeTask,
} from './taskPayload.ts'
import {
  createCanonicalSubtask,
  deriveSupertaskStatus,
  getCanonicalSubtaskStatus,
  isSubtaskCompletedForOccurrence,
  setSupertaskCompleted,
  setSupertaskNotStarted,
} from './taskSubtasks.ts'

function task(id, overrides = {}) {
  const schedule = overrides.schedule
  return {
    id,
    content: id,
    status: 0,
    nature: schedule && ['daily', 'weekly', 'monthly'].includes(schedule.type)
      ? 'recurring'
      : 'punctual',
    subtasks: [],
    ...overrides,
  }
}

function child(id, overrides = {}) {
  return task(id, { parentTaskId: 'parent', ...overrides })
}

test('archive is an independent Timestamp marker and restore removes only that marker', () => {
  const archiveUpdate = buildTaskArchiveUpdate()
  const restoreUpdate = buildTaskRestoreUpdate()

  assert.equal(archiveUpdate.archivedAt instanceof Timestamp, true)
  assert.equal('archivedAt' in restoreUpdate, true)
  assert.equal(isTaskArchived({ archivedAt: archiveUpdate.archivedAt }), true)
  assert.equal(isTaskArchived({ archivedAt: undefined }), false)
  assert.equal(isTaskArchived({ archivedAt: 'legacy-invalid' }), false)
})

test('archive hydration preserves status, recurrence, planning, Event, conditions, and Subtasks', () => {
  const archivedAt = Timestamp.fromDate(new Date('2026-10-01T12:00:00Z'))
  const source = {
    content: 'Recurring parent',
    status: 1,
    archivedAt,
    schedule: { type: 'weekly', weekdays: ['monday'] },
    actionPlanning: { week: '2026-W40' },
    automation: { match: 'all', rules: [] },
    eventAssociation: { eventId: 'event-1' },
    subtasks: [{ id: 'child', content: 'Child', status: 0 }],
  }
  const hydrated = hydrateTask('parent', source, '2026-10-01')
  const roundTrip = serializeTask(hydrated)

  assert.equal(isTaskArchived(hydrated), true)
  assert.equal(hydrated.status, 0)
  assert.deepEqual(hydrated.schedule, source.schedule)
  assert.deepEqual(hydrated.actionPlanning, source.actionPlanning)
  assert.deepEqual(hydrated.automation, source.automation)
  assert.deepEqual(hydrated.eventAssociation, source.eventAssociation)
  assert.equal(hydrated.subtasks?.[0].id, 'child')
  assert.equal(roundTrip.archivedAt, archivedAt)
})

test('archive works for punctual Tasks, recurring Tasks, and Supertasks without a status 3', () => {
  const punctual = hydrateTask('punctual', {
    content: 'Punctual',
    status: 2,
    archivedAt: Timestamp.now(),
  })
  const recurring = hydrateTask('recurring', {
    content: 'Recurring',
    status: 2,
    schedule: { type: 'daily' },
    archivedAt: Timestamp.now(),
  })
  const supertask = hydrateTask('super', {
    content: 'Super',
    status: 2,
    archivedAt: Timestamp.now(),
    subtasks: [{ id: 'child', content: 'Child', status: 2 }],
  }, '2026-10-01')

  assert.equal(isTaskArchived(punctual), true)
  assert.equal(isTaskArchived(recurring), true)
  assert.equal(isTaskArchived(supertask), true)
  assert.notEqual(punctual.status, 3)
  assert.notEqual(recurring.status, 3)
  assert.notEqual(supertask.status, 3)
})

test('new canonical Subtasks contain only stable identity, content, binary status, and parent', () => {
  const fresh = createCanonicalSubtask('  Step  ', 'parent', 'child')

  assert.deepEqual(fresh, {
    id: 'child',
    content: 'Step',
    status: 0,
    parentTaskId: 'parent',
  })
  assert.equal('schedule' in fresh, false)
  assert.equal('subtasks' in fresh, false)
  assert.equal(getCanonicalSubtaskStatus(fresh), 0)
  assert.equal(getCanonicalSubtaskStatus({ status: 2 }), 2)
  assert.equal(getCanonicalSubtaskStatus({ status: 1 }), 0)
})

test('legacy status 1 is interpreted as not made while untouched rich fields round-trip', () => {
  const taskWithLegacyChild = hydrateTask('parent', {
    content: 'Parent',
    status: 0,
    subtasks: [{
      id: 'child',
      content: 'Legacy child',
      status: 1,
      schedule: { type: 'daily' },
      actionPlanning: { day: '2026-10-01' },
      automation: { match: 'all', rules: [] },
      eventAssociation: { eventId: 'event-1' },
      lastActionCompletedDate: '2026-09-30',
      focusedOnDate: '2026-09-30',
      subtasks: [{ id: 'grandchild', content: 'Nested legacy', status: 1 }],
    }],
  }, '2026-10-01')
  const legacyChild = taskWithLegacyChild.subtasks[0]
  const roundTrip = serializeTask(taskWithLegacyChild).subtasks[0]

  assert.equal(legacyChild.status, 0)
  assert.equal(legacyChild.legacySubtaskStatus, 1)
  assert.equal(taskWithLegacyChild.status, 0)
  assert.equal(roundTrip.status, 1)
  assert.deepEqual(roundTrip.schedule, { type: 'daily' })
  assert.deepEqual(roundTrip.actionPlanning, { day: '2026-10-01' })
  assert.deepEqual(roundTrip.automation, { match: 'all', rules: [] })
  assert.deepEqual(roundTrip.eventAssociation, { eventId: 'event-1' })
  assert.equal(roundTrip.lastActionCompletedDate, '2026-09-30')
  assert.equal(roundTrip.focusedOnDate, '2026-09-30')
  assert.equal(roundTrip.subtasks[0].id, 'grandchild')
})

test('explicit Subtask status updates preserve rich legacy fields without creating status 1', () => {
  const parent = hydrateTask('parent', {
    content: 'Parent',
    status: 0,
    subtasks: [{
      id: 'child',
      content: 'Legacy child',
      status: 1,
      schedule: { type: 'daily' },
      actionPlanning: { day: '2026-10-01' },
      automation: { match: 'all', rules: [] },
      eventAssociation: { eventId: 'event-1' },
      lastActionCompletedDate: '2026-09-30',
      focusedOnDate: '2026-09-30',
    }],
  }, '2026-10-01')
  const update = buildNestedTaskStatusUpdate(parent, 'child', 2, '2026-10-01')
  const updatedChild = update.subtasks[0]

  assert.equal(update.status, 2)
  assert.equal(updatedChild.status, 2)
  assert.equal(updatedChild.schedule.type, 'daily')
  assert.deepEqual(updatedChild.actionPlanning, { day: '2026-10-01' })
  assert.deepEqual(updatedChild.automation, { match: 'all', rules: [] })
  assert.deepEqual(updatedChild.eventAssociation, { eventId: 'event-1' })
  assert.equal(updatedChild.lastActionCompletedDate, '2026-09-30')
  assert.equal(updatedChild.focusedOnDate, '2026-09-30')
  assert.notEqual(updatedChild.status, 1)
})

test('punctual Subtasks use permanent binary status', () => {
  const parent = task('parent', { nature: 'punctual' })
  const notMade = child('not-made', { status: 0 })
  const done = child('done', { status: 2 })

  assert.equal(isSubtaskCompletedForOccurrence(parent, notMade, '2026-10-01'), false)
  assert.equal(isSubtaskCompletedForOccurrence(parent, done, '2026-10-01'), true)
})

test('daily recurring Subtasks complete only for the marked civil occurrence', () => {
  const parent = task('daily-parent', { schedule: { type: 'daily' } })
  const completed = child('child', { lastCompletedOccurrenceDate: '2026-10-01' })

  assert.equal(isSubtaskCompletedForOccurrence(parent, completed, '2026-10-01'), true)
  assert.equal(isSubtaskCompletedForOccurrence(parent, completed, '2026-10-02'), false)
})

test('weekly specific completion remains until the next configured weekday', () => {
  const parent = task('weekly-parent', {
    schedule: { type: 'weekly', weekdays: ['monday', 'wednesday'] },
  })
  const completedMonday = child('child', { lastCompletedOccurrenceDate: '2026-10-05' })

  assert.equal(isSubtaskCompletedForOccurrence(parent, completedMonday, '2026-10-06'), true)
  assert.equal(isSubtaskCompletedForOccurrence(parent, completedMonday, '2026-10-07'), false)
})

test('weekly flexible completion remains through Sunday and restarts on Monday', () => {
  const parent = task('flexible-parent', { schedule: { type: 'weekly' } })
  const completedWednesday = child('child', { lastCompletedOccurrenceDate: '2026-10-07' })

  assert.equal(isSubtaskCompletedForOccurrence(parent, completedWednesday, '2026-10-09'), true)
  assert.equal(isSubtaskCompletedForOccurrence(parent, completedWednesday, '2026-10-11'), true)
  assert.equal(isSubtaskCompletedForOccurrence(parent, completedWednesday, '2026-10-12'), false)
})

test('monthly completion uses effective occurrence dates and clamps short months', () => {
  const parent = task('monthly-parent', { schedule: { type: 'monthly', dayOfMonth: 31 } })
  const october = child('october', { lastCompletedOccurrenceDate: '2026-10-31' })
  const february = child('february', { lastCompletedOccurrenceDate: '2026-02-28' })

  assert.equal(isSubtaskCompletedForOccurrence(parent, october, '2026-11-01'), true)
  assert.equal(isSubtaskCompletedForOccurrence(parent, october, '2026-11-30'), false)
  assert.equal(isSubtaskCompletedForOccurrence(parent, february, '2026-02-28'), true)
  assert.equal(isSubtaskCompletedForOccurrence(parent, february, '2026-03-01'), true)
  assert.equal(isSubtaskCompletedForOccurrence(parent, february, '2026-03-31'), false)
})

test('Supertask aggregate status ignores persisted parent status and focused date', () => {
  const parent = task('parent', {
    status: 2,
    focusedOnDate: '2026-09-30',
    subtasks: [child('one', { status: 0 }), child('two', { status: 2 })],
  })

  assert.equal(deriveSupertaskStatus(parent, '2026-10-01'), 1)
  assert.equal(hydrateTask('parent', {
    content: 'Parent',
    status: 2,
    focusedOnDate: '2026-09-30',
    subtasks: [
      { id: 'one', content: 'One', status: 0 },
      { id: 'two', content: 'Two', status: 0 },
    ],
  }, '2026-10-01').status, 0)
})

test('Supertask aggregate maps all incomplete, all complete, and mixed progress', () => {
  const allIncomplete = task('incomplete', {
    subtasks: [child('one', { status: 0 }), child('two', { status: 1 })],
  })
  const allComplete = task('complete', {
    subtasks: [child('one', { status: 2 }), child('two', { status: 2 })],
  })
  const mixed = task('mixed', {
    subtasks: [child('one', { status: 0 }), child('two', { status: 2 })],
  })

  assert.equal(deriveSupertaskStatus(allIncomplete, '2026-10-01'), 0)
  assert.equal(deriveSupertaskStatus(allComplete, '2026-10-01'), 2)
  assert.equal(deriveSupertaskStatus(mixed, '2026-10-01'), 1)
})

test('global punctual commands set every Subtask and the parent without a focus state', () => {
  const parent = task('parent', {
    status: 1,
    focusedOnDate: '2026-10-01',
    subtasks: [child('one', { status: 0 }), child('two', { status: 2 })],
  })

  const notStarted = setSupertaskNotStarted(parent, '2026-10-01')
  const completed = setSupertaskCompleted(parent, '2026-10-01')

  assert.equal(notStarted.status, 0)
  assert.deepEqual(notStarted.subtasks.map(item => item.status), [0, 0])
  assert.equal(completed.status, 2)
  assert.deepEqual(completed.subtasks.map(item => item.status), [2, 2])
})

test('global recurring commands affect only the current occurrence', () => {
  const parent = task('parent', {
    status: 1,
    schedule: { type: 'daily' },
    subtasks: [child('one', { status: 0 }), child('two', { status: 0 })],
  })

  const completed = setSupertaskCompleted(parent, '2026-10-01')
  const notStarted = setSupertaskNotStarted(completed, '2026-10-02')

  assert.equal(completed.status, 2)
  assert.deepEqual(completed.subtasks.map(item => item.lastCompletedOccurrenceDate), [
    '2026-10-01',
    '2026-10-01',
  ])
  assert.equal(notStarted.status, 0)
  assert.deepEqual(notStarted.subtasks.map(item => item.lastCompletedOccurrenceDate), [
    undefined,
    undefined,
  ])
})
