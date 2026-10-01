import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getNextTaskOccurrence,
  getTaskNature,
  isTaskScheduledForDate,
  validateTaskSchedule,
} from './taskSchedule.ts'

const task = (schedule, extra = {}) => ({ schedule, ...extra })

test('daily recurrence is true for any civil date and ignores status/execution fields', () => {
  const daily = task({ type: 'daily' }, {
    status: 2,
    lastActionCompletedDate: '2026-09-30',
  })

  assert.equal(isTaskScheduledForDate(daily, '2026-09-30'), true)
  assert.equal(isTaskScheduledForDate(daily, '2026-10-01'), true)
  assert.equal(getNextTaskOccurrence(daily, '2026-09-30'), '2026-10-01')
})

test('weekly selected weekdays use the civil weekday and cross week boundaries', () => {
  const weekly = task({ type: 'weekly', weekdays: ['monday', 'wednesday'] })

  assert.equal(isTaskScheduledForDate(weekly, '2026-09-30'), true)
  assert.equal(isTaskScheduledForDate(weekly, '2026-10-01'), false)
  assert.equal(isTaskScheduledForDate(weekly, '2026-10-05'), true)
  assert.equal(getNextTaskOccurrence(weekly, '2026-09-30'), '2026-10-05')
})

test('weekly flexible form remains a week-level rule without inventing a weekday', () => {
  const weekly = task({ type: 'weekly' })

  assert.equal(validateTaskSchedule(weekly.schedule), true)
  assert.equal(isTaskScheduledForDate(weekly, '2026-10-01'), false)
  assert.equal(getNextTaskOccurrence(weekly, '2026-10-01'), null)
})

test('monthly recurrence clamps to the final civil day of short months', () => {
  const monthly = task({ type: 'monthly', dayOfMonth: 31 })

  assert.equal(isTaskScheduledForDate(monthly, '2026-01-31'), true)
  assert.equal(isTaskScheduledForDate(monthly, '2026-01-30'), false)
  assert.equal(isTaskScheduledForDate(monthly, '2026-02-28'), true)
  assert.equal(isTaskScheduledForDate(monthly, '2026-03-30'), false)
  assert.equal(getNextTaskOccurrence(monthly, '2026-12-31'), '2027-01-31')
})

test('event-relative tasks calculate a punctual civil effective date', () => {
  const relative = task({ type: 'eventRelative', eventId: 'event-1', leadDays: 14 })
  const events = [{ id: 'event-1', startDate: '2027-01-05' }]

  assert.equal(isTaskScheduledForDate(relative, '2026-12-22', events), true)
  assert.equal(isTaskScheduledForDate(relative, '2026-12-23', events), false)
  assert.equal(getNextTaskOccurrence(relative, '2026-12-01', events), '2026-12-22')
  assert.equal(getNextTaskOccurrence(relative, '2026-12-22', events), null)
  assert.equal(isTaskScheduledForDate(relative, '2026-12-22'), false)
})

test('invalid schedules are rejected without producing occurrences', () => {
  const invalidSchedules = [
    { type: 'unknown' },
    { type: 'weekly', weekdays: ['monday', 'not-a-day'] },
    { type: 'monthly' },
    { type: 'monthly', dayOfMonth: 0 },
    { type: 'monthly', dayOfMonth: 32 },
    { type: 'monthly', dayOfMonth: 1.5 },
    { type: 'eventRelative', eventId: '', leadDays: 0 },
    { type: 'eventRelative', eventId: 'event-1', leadDays: -1 },
    { type: 'eventRelative', eventId: 'event-1', leadDays: '14' },
  ]

  for (const schedule of invalidSchedules) {
    assert.equal(validateTaskSchedule(schedule), false)
    assert.equal(isTaskScheduledForDate(task(schedule), '2026-10-01'), false)
    assert.equal(getNextTaskOccurrence(task(schedule), '2026-10-01'), null)
  }
})

test('nature is derived from schedule and never from lifecycle status', () => {
  assert.equal(getTaskNature(task({ type: 'daily' }, { status: 2 })), 'recurring')
  assert.equal(getTaskNature(task(undefined, { status: 1 })), 'punctual')
  assert.equal(getTaskNature(task({ type: 'eventRelative', eventId: 'event-1', leadDays: 0 })), 'punctual')
})

