import assert from 'node:assert/strict'
import test from 'node:test'
import {
  hasWeatherRules,
  projectActionsForDate,
  projectActionSources,
} from './actionProjection.ts'
import { evaluateAutomation } from './automation.ts'

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
  assert.equal(project(source).day[0].automation.status, 'noConditions')
})

test('keeps a weather-dependent action visible and unresolved without weather', () => {
  const source = taskSource({
    match: 'all',
    rules: [weatherRule],
  })
  const item = project(source).day[0]

  assert.equal(hasWeatherRules([['day', [source]]]), true)
  assert.equal(item.title, 'Lavar roupa')
  assert.equal(item.automation.status, 'notEvaluable')
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
  assert.equal(item.automation.status, 'matched')
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
  assert.equal(item.automation.status, 'notMatched')
  assert.equal(item.automation.highlighted, false)
  assert.deepEqual(item.automation.rules, [
    { ruleId: 'weather-1', status: 'notMatched' },
  ])
})

test('multiple favorable conditions distinguish all/any and unresolved context', () => {
  const weekdayRule = {
    id: 'weekday-1',
    type: 'weekday',
    weekdays: ['wednesday'],
  }
  const unresolvedWeatherRule = {
    id: 'weather-2',
    type: 'weather',
    condition: 'sunny',
  }

  const allItem = project(taskSource({
    match: 'all',
    rules: [weekdayRule, unresolvedWeatherRule],
  })).day[0]
  assert.equal(allItem.automation.status, 'notEvaluable')
  assert.equal(allItem.automation.highlighted, false)

  const anyItem = project(taskSource({
    match: 'any',
    rules: [weekdayRule, unresolvedWeatherRule],
  })).day[0]
  assert.equal(anyItem.automation.status, 'matched')
  assert.equal(anyItem.automation.highlighted, true)
})

test('invalid favorable rules become not evaluable without breaking the Action', () => {
  const evaluation = evaluateAutomation({
    match: 'all',
    rules: [null],
  })

  assert.equal(evaluation.status, 'notEvaluable')
  assert.equal(evaluation.highlighted, false)
  assert.deepEqual(evaluation.rules, [
    { ruleId: 'invalid-rule', status: 'unresolved' },
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

test('projects a direct subtask independently from its Supertask', () => {
  const child = task('child', { type: 'daily' }, { parentTaskId: 'root' })
  const root = task('root', undefined, {
    status: 1,
    subtasks: [child],
  })

  assert.deepEqual(taskActions([root], '2026-10-08'), [
    {
      taskId: 'root',
      horizon: 'day',
      source: 'status',
      completionMode: 'lifecycle',
    },
    {
      taskId: 'child',
      parentTaskId: 'root',
      horizon: 'day',
      source: 'recurring',
      completionMode: 'daily',
      effectiveDate: '2026-10-08',
    },
  ])
})

test('parent and subtask conditions are evaluated independently after projection', () => {
  const child = task('child', { type: 'daily' }, {
    parentTaskId: 'root',
    automation: { match: 'all', rules: [] },
  })
  const root = task('root', undefined, {
    status: 1,
    automation: { match: 'all', rules: [weatherRule] },
    subtasks: [child],
  })
  const projected = taskActions([root], '2026-10-08')
  const projection = projectActionSources(
    [['day', projected.map((action) => ({
      item: {
        key: action.parentTaskId
          ? `task:${action.parentTaskId}:subtask:${action.taskId}`
          : `task:${action.taskId}`,
        sourceType: 'task',
        sourceId: action.taskId,
        title: action.taskId,
        completed: false,
      },
      automation: action.taskId === 'root'
        ? root.automation
        : root.subtasks[0].automation,
    }))], ['week', []], ['month', []]],
    { referenceDate, events: [], weatherCondition: 'sunny' },
  )

  assert.deepEqual(
    projection.day.map((item) => [item.sourceId, item.automation.status]),
    [['root', 'matched'], ['child', 'noConditions']],
  )
})

test('projects multiple direct subtasks with distinct identities and suppresses completed children only', () => {
  const root = task('root')
  const first = task('first', { type: 'daily' }, { parentTaskId: 'root' })
  const second = task('second', { type: 'daily' }, { parentTaskId: 'root', status: 2 })
  const actions = taskActions([{ ...root, subtasks: [first, second] }], '2026-10-08')

  assert.equal(actions.length, 1)
  assert.equal(actions[0].taskId, 'first')
  assert.equal(actions[0].parentTaskId, 'root')
})

test('weekly flexible subtask uses its own completion window', () => {
  const child = task('child', { type: 'weekly' }, {
    parentTaskId: 'root',
    lastActionCompletedDate: '2026-10-05',
  })
  const root = task('root', undefined, { subtasks: [child] })

  assert.equal(taskActions([root], '2026-10-06').length, 0)
  assert.equal(taskActions([root], '2026-10-12').length, 1)
})
