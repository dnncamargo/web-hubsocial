import assert from 'node:assert/strict'
import test from 'node:test'
import {
  hasWeatherRules,
  projectActionsForDate,
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

function task(id, schedule, extra = {}) {
  return {
    id,
    content: id,
    status: 0,
    nature: schedule && ['daily', 'weekly', 'monthly'].includes(schedule.type)
      ? 'recurring'
      : 'punctual',
    subtasks: undefined,
    ...(schedule ? { schedule } : {}),
    ...extra,
  }
}

function taskActions(tasks, targetDate, events = []) {
  return projectActionsForDate(tasks, targetDate, { events })
}

test('projects daily execution, suppresses the completed date, and reprojects the next day', () => {
  const daily = task('daily', { type: 'daily' })

  assert.deepEqual(taskActions([daily], '2026-09-30'), [{
    taskId: 'daily',
    horizon: 'day',
    source: 'recurring',
    completionMode: 'daily',
    effectiveDate: '2026-09-30',
  }])
  assert.deepEqual(
    taskActions([{ ...daily, lastActionCompletedDate: '2026-09-30' }], '2026-09-30'),
    [],
  )
  assert.equal(taskActions([{ ...daily, lastActionCompletedDate: '2026-09-30' }], '2026-10-01').length, 1)
})

test('weekly selected weekdays keep later occurrences after an earlier completion', () => {
  const weekly = task('weekly', {
    type: 'weekly',
    weekdays: ['monday', 'wednesday'],
  })

  assert.equal(taskActions([{ ...weekly, lastActionCompletedDate: '2026-10-05' }], '2026-10-05').length, 0)
  assert.deepEqual(
    taskActions([{ ...weekly, lastActionCompletedDate: '2026-10-05' }], '2026-10-07'),
    [{
      taskId: 'weekly',
      horizon: 'day',
      source: 'recurring',
      completionMode: 'daily',
      effectiveDate: '2026-10-07',
    }],
  )
})

test('weekly flexible recurrence remains available until completion and reappears next week', () => {
  const weekly = task('flexible', { type: 'weekly' })

  assert.equal(taskActions([weekly], '2026-10-05')[0].horizon, 'week')
  assert.equal(taskActions([weekly], '2026-10-11')[0].horizon, 'week')
  assert.equal(
    taskActions([{ ...weekly, lastActionCompletedDate: '2026-10-05' }], '2026-10-06').length,
    0,
  )
  assert.equal(
    taskActions([{ ...weekly, lastActionCompletedDate: '2026-10-08' }], '2026-10-11').length,
    0,
  )
  assert.equal(
    taskActions([{ ...weekly, lastActionCompletedDate: '2026-10-07' }], '2026-10-08').length,
    0,
  )
  assert.equal(
    taskActions([{ ...weekly, lastActionCompletedDate: '2026-10-08' }], '2026-10-12').length,
    1,
  )
  assert.equal(
    taskActions([{ ...weekly, lastActionCompletedDate: '2026-10-11' }], '2026-10-12').length,
    1,
  )
})

test('weekly flexible boundaries remain civil across year changes and ignore future completion dates', () => {
  const weekly = task('flexible-year', { type: 'weekly' })

  assert.equal(
    taskActions([{ ...weekly, lastActionCompletedDate: '2026-12-30' }], '2027-01-03').length,
    0,
  )
  assert.equal(
    taskActions([{ ...weekly, lastActionCompletedDate: '2026-12-30' }], '2027-01-04').length,
    1,
  )
  assert.equal(
    taskActions([{ ...weekly, lastActionCompletedDate: '2027-01-04' }], '2027-01-03').length,
    1,
  )
  assert.equal(taskActions([weekly], '2027-01-01')[0].horizon, 'week')
})

test('monthly recurrence uses the projected occurrence date for completion', () => {
  const monthly = task('monthly', { type: 'monthly', dayOfMonth: 31 })

  assert.equal(taskActions([monthly], '2026-02-28')[0].effectiveDate, '2026-02-28')
  assert.equal(
    taskActions([{ ...monthly, lastActionCompletedDate: '2026-02-28' }], '2026-02-28').length,
    0,
  )
  assert.equal(
    taskActions([{ ...monthly, lastActionCompletedDate: '2026-02-28' }], '2026-03-31').length,
    1,
  )
})

test('punctual planning distinguishes today, future, rollover, and no planning', () => {
  const planned = task('planned', undefined, {
    actionPlanning: { day: '2026-10-07' },
  })

  assert.equal(taskActions([planned], '2026-10-07')[0].source, 'planned')
  assert.equal(taskActions([planned], '2026-10-08')[0].source, 'rollover')
  assert.equal(taskActions([planned], '2026-10-06').length, 0)
  assert.equal(taskActions([task('unplanned')], '2026-10-08').length, 0)
  assert.equal(taskActions([{ ...task('focused'), status: 1 }], '2026-10-08')[0].source, 'status')
})

test('completed Tasks never project, including recurring Tasks', () => {
  const tasks = [
    { ...task('daily-done', { type: 'daily' }), status: 2 },
    { ...task('flexible-done', { type: 'weekly' }), status: 2 },
  ]

  assert.deepEqual(taskActions(tasks, '2026-10-08'), [])
})

test('event-relative Tasks use resolved Event context and roll over only after the effective date', () => {
  const relative = task('relative', {
    type: 'eventRelative',
    eventId: 'event-1',
    leadDays: 2,
  })
  const events = [{ id: 'event-1', startDate: '2026-10-10' }]

  assert.equal(taskActions([relative], '2026-10-08', events)[0].source, 'eventRelative')
  assert.equal(taskActions([relative], '2026-10-09', events)[0].source, 'rollover')
  assert.equal(taskActions([relative], '2026-10-07', events).length, 0)
  assert.equal(taskActions([relative], '2026-10-08').length, 0)
})

test('one Task produces one projected Action even when multiple rules match', () => {
  const duplicateCandidate = task('one', { type: 'daily' }, {
    status: 1,
    actionPlanning: { day: '2026-10-08' },
  })
  const actions = taskActions([duplicateCandidate], '2026-10-08')

  assert.equal(actions.length, 1)
  assert.equal(actions[0].source, 'status')
})

test('the task projector is deterministic for the same civil input', () => {
  const tasks = [
    task('daily', { type: 'daily' }),
    task('flexible', { type: 'weekly' }),
  ]

  assert.deepEqual(
    taskActions(tasks, '2026-10-08'),
    taskActions(tasks, '2026-10-08'),
  )
})
