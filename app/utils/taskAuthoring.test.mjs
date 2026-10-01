import assert from 'node:assert/strict'
import test from 'node:test'
import {
  changeTaskFrequency,
  changeTaskNature,
  changeWeeklyMode,
  sortTaskWeekdays,
  synchronizeEventRelativeSchedule,
  synchronizeUpcomingEventRule,
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

test('changing the associated Event updates the temporal rule without changing leadDays', () => {
  assert.deepEqual(
    synchronizeEventRelativeSchedule(
      { type: 'eventRelative', eventId: 'event-a', leadDays: 14 },
      { eventId: 'event-b' },
    ),
    { type: 'eventRelative', eventId: 'event-b', leadDays: 14 },
  )
  assert.equal(
    synchronizeEventRelativeSchedule(
      { type: 'eventRelative', eventId: 'event-a', leadDays: 14 },
      undefined,
    ),
    undefined,
  )
})

test('changing or removing the associated Event preserves independent favorable conditions', () => {
  const automation = {
    match: 'any',
    rules: [
      { id: 'weekday', type: 'weekday', weekdays: ['monday'] },
      { id: 'weather', type: 'weather', condition: 'rainy' },
      { id: 'event', type: 'upcomingEvent', eventId: 'event-a', withinDays: 3 },
    ],
  }

  assert.deepEqual(
    synchronizeUpcomingEventRule(automation, 'event-b'),
    {
      ...automation,
      rules: [
        automation.rules[0],
        automation.rules[1],
        { ...automation.rules[2], eventId: 'event-b' },
      ],
    },
  )
  assert.deepEqual(
    synchronizeUpcomingEventRule(automation, undefined),
    { match: 'any', rules: [automation.rules[0], automation.rules[1]] },
  )
})

test('weekly weekday toggles preserve normalized order', () => {
  assert.deepEqual(
    toggleTaskWeekday({ type: 'weekly', weekdays: ['friday'] }, 'monday', true),
    { type: 'weekly', weekdays: ['monday', 'friday'] },
  )
})
