import assert from 'node:assert/strict'
import test from 'node:test'
import {
  hasWeatherRules,
  projectActionSources,
} from './actionProjection.ts'

const referenceDate = new Date('2026-09-30T12:00:00-03:00')
const weatherRule = {
  id: 'weather-1',
  type: 'weather',
  condition: 'sunny',
}

function taskSource(automation) {
  return {
    item: {
      key: 'task:laundry',
      sourceType: 'task',
      sourceId: 'laundry',
      title: 'Lavar roupa',
      completed: false,
    },
    automation,
  }
}

function project(source, weatherCondition) {
  return projectActionSources(
    [['day', [source]], ['week', []], ['month', []]],
    {
      referenceDate,
      events: [],
      ...(weatherCondition ? { weatherCondition } : {}),
    },
  )
}

test('does not request weather when no action rule depends on it', () => {
  const source = taskSource({
    match: 'all',
    rules: [],
  })

  assert.equal(hasWeatherRules([['day', [source]]]), false)
  assert.equal(project(source).day[0].title, 'Lavar roupa')
})

test('keeps a weather-dependent action visible and unresolved without weather', () => {
  const source = taskSource({
    match: 'all',
    rules: [weatherRule],
  })
  const item = project(source).day[0]

  assert.equal(hasWeatherRules([['day', [source]]]), true)
  assert.equal(item.title, 'Lavar roupa')
  assert.equal(item.automation.highlighted, false)
  assert.deepEqual(item.automation.rules, [
    { ruleId: 'weather-1', status: 'unresolved' },
  ])
})

test('highlights a weather-dependent action after a matching response', () => {
  const source = taskSource({
    match: 'all',
    rules: [weatherRule],
  })
  const item = project(source, 'sunny').day[0]

  assert.equal(item.title, 'Lavar roupa')
  assert.equal(item.automation.highlighted, true)
  assert.deepEqual(item.automation.rules, [
    { ruleId: 'weather-1', status: 'matched' },
  ])
})

test('keeps a weather-dependent action visible when the condition does not match', () => {
  const source = taskSource({
    match: 'all',
    rules: [weatherRule],
  })
  const item = project(source, 'rainy').day[0]

  assert.equal(item.title, 'Lavar roupa')
  assert.equal(item.automation.highlighted, false)
  assert.deepEqual(item.automation.rules, [
    { ruleId: 'weather-1', status: 'notMatched' },
  ])
})
