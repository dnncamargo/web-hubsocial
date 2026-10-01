import assert from 'node:assert/strict'
import test from 'node:test'
import {
  changeTaskFrequency,
  changeTaskNature,
  changeWeeklyMode,
  sortTaskWeekdays,
  toggleTaskWeekday,
} from './taskAuthoring.ts'

test('punctual authoring removes recurring schedule but preserves event-relative rule', () => {
  assert.deepEqual(changeTaskNature({ type: 'daily' }, 'punctual'), undefined)
  assert.deepEqual(
    changeTaskNature({ type: 'eventRelative', eventId: 'event-1', leadDays: 3 }, 'punctual'),
    { type: 'eventRelative', eventId: 'event-1', leadDays: 3 },
  )
})

test('recurring authoring always has a valid frequency', () => {
  assert.deepEqual(changeTaskNature(undefined, 'recurring'), { type: 'daily' })
  assert.deepEqual(
    changeTaskNature({ type: 'eventRelative', eventId: 'event-1', leadDays: 3 }, 'recurring'),
    { type: 'daily' },
  )
})

test('frequency changes clear incompatible weekly and monthly fields', () => {
  assert.deepEqual(changeTaskFrequency('daily'), { type: 'daily' })
  assert.deepEqual(changeTaskFrequency('weekly'), { type: 'weekly' })
  assert.deepEqual(changeTaskFrequency('monthly'), { type: 'monthly', dayOfMonth: 1 })
})

test('weekly flexible and specific modes never leave an empty specific list', () => {
  assert.deepEqual(
    changeWeeklyMode({ type: 'weekly' }, 'specific'),
    { type: 'weekly', weekdays: ['monday'] },
  )
  assert.deepEqual(
    toggleTaskWeekday({ type: 'weekly', weekdays: ['monday'] }, 'monday', false),
    { type: 'weekly' },
  )
})

test('weekly weekdays are deduplicated and normalized to Monday-first order', () => {
  assert.deepEqual(
    sortTaskWeekdays(['friday', 'monday', 'friday', 'wednesday']),
    ['monday', 'wednesday', 'friday'],
  )
})

test('weekly weekday toggles preserve normalized order', () => {
  assert.deepEqual(
    toggleTaskWeekday({ type: 'weekly', weekdays: ['friday'] }, 'monday', true),
    { type: 'weekly', weekdays: ['monday', 'friday'] },
  )
})
