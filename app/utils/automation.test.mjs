import assert from 'node:assert/strict'
import test from 'node:test'
import {
  evaluateAutomation,
  getDayPeriod,
  normalizeAutomationRuleSet,
} from './automation.ts'
import { buildTaskPayload, hydrateTask } from './taskPayload.ts'

const dayPeriodRule = (periods) => ({
  id: 'day-period',
  type: 'dayPeriod',
  periods,
})

const evaluate = (periods, hour, minute = 0) => evaluateAutomation(
  { match: 'all', rules: [dayPeriodRule(periods)] },
  { referenceDate: new Date(2026, 0, 15, hour, minute) },
)

test('day period resolves local referenceDate boundaries', () => {
  const cases = [
    [5, 59, 'night'],
    [6, 0, 'morning'],
    [11, 59, 'morning'],
    [12, 0, 'afternoon'],
    [17, 59, 'afternoon'],
    [18, 0, 'night'],
    [23, 59, 'night'],
    [0, 0, 'night'],
  ]

  for (const [hour, minute, expected] of cases) {
    assert.equal(getDayPeriod(new Date(2026, 0, 15, hour, minute)), expected)
  }
})

test('afternoon plus night matches both periods and rejects morning', () => {
  const periods = ['afternoon', 'night']
  const expected = [
    [5, 59, 'matched'],
    [6, 0, 'notMatched'],
    [11, 59, 'notMatched'],
    [12, 0, 'matched'],
    [17, 59, 'matched'],
    [18, 0, 'matched'],
    [23, 59, 'matched'],
    [0, 0, 'matched'],
  ]

  for (const [hour, minute, status] of expected) {
    assert.equal(evaluate(periods, hour, minute).status, status)
  }
})

test('single and combined morning/afternoon selections match independently', () => {
  assert.equal(evaluate(['morning'], 6).status, 'matched')
  assert.equal(evaluate(['morning'], 12).status, 'notMatched')
  assert.equal(evaluate(['morning', 'afternoon'], 10).status, 'matched')
  assert.equal(evaluate(['morning', 'afternoon'], 15).status, 'matched')
  assert.equal(evaluate(['morning', 'afternoon'], 20).status, 'notMatched')
})

test('day period normalization removes duplicates, invalid values, and empty rules', () => {
  assert.deepEqual(
    normalizeAutomationRuleSet({
      match: 'all',
      rules: [dayPeriodRule(['night', 'afternoon', 'night', 'dawn'])],
    }),
    {
      match: 'all',
      rules: [dayPeriodRule(['afternoon', 'night'])],
    },
  )
  assert.deepEqual(
    normalizeAutomationRuleSet({
      match: 'all',
      rules: [dayPeriodRule(['dawn'])],
    }),
    { match: 'all', rules: [] },
  )
})

test('invalid or empty active day periods are unresolved and never become payload rules', () => {
  const invalid = evaluateAutomation(
    { match: 'all', rules: [dayPeriodRule(['dawn'])] },
    { referenceDate: new Date(2026, 0, 15, 12) },
  )
  assert.equal(invalid.rules[0].status, 'unresolved')

  const payload = buildTaskPayload({
    content: 'Task',
    status: 0,
    nature: 'punctual',
    automation: { match: 'all', rules: [dayPeriodRule([])] },
  })
  assert.deepEqual(payload.automation.rules, [])
})

test('multiple periods are one internal OR condition inside external all/any matching', () => {
  const friday = new Date(2026, 0, 16, 14)
  const ruleSet = {
    rules: [
      dayPeriodRule(['afternoon', 'night']),
      { id: 'weekday', type: 'weekday', weekdays: ['friday'] },
    ],
  }

  assert.equal(
    evaluateAutomation({ ...ruleSet, match: 'all' }, { referenceDate: friday }).status,
    'matched',
  )
  assert.equal(
    evaluateAutomation({ ...ruleSet, match: 'any' }, {
      referenceDate: new Date(2026, 0, 15, 14),
    }).status,
    'matched',
  )
  assert.equal(
    evaluateAutomation({ ...ruleSet, match: 'all' }, {
      referenceDate: new Date(2026, 0, 15, 14),
    }).status,
    'notMatched',
  )
})

test('task hydration and payload preserve canonical multi-period rules', () => {
  const valid = hydrateTask('task-valid', {
    content: 'Task',
    status: 0,
    nature: 'punctual',
    automation: {
      match: 'all',
      rules: [dayPeriodRule(['night', 'afternoon', 'night'])],
    },
  })
  const payload = buildTaskPayload({
    content: 'Task',
    status: 0,
    nature: 'punctual',
    automation: {
      match: 'all',
      rules: [dayPeriodRule(['night', 'afternoon', 'night'])],
    },
  })

  assert.deepEqual(valid.automation.rules, [dayPeriodRule(['afternoon', 'night'])])
  assert.deepEqual(payload.automation.rules, [dayPeriodRule(['afternoon', 'night'])])
})
