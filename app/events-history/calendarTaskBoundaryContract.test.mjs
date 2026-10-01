import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const appRoot = fileURLToPath(new URL('../', import.meta.url))
const readAppFile = (...parts) => readFileSync(join(appRoot, ...parts), 'utf8')

const eventsHistory = readAppFile('events-history', 'page.tsx')
const calendarMonth = readAppFile('events-history', 'components', 'EventCalendarMonth.tsx')
const editTaskModal = readAppFile('tasks-list', 'components', 'EditTaskModal.tsx')
const taskModel = readFileSync(
  join(appRoot, '..', 'docs', 'TASK_MODEL.md'),
  'utf8',
)

test('Calendar remains an Event-only projection boundary', () => {
  assert.match(eventsHistory, /EventCalendarMonth events=\{visibleEvents\}/)
  assert.doesNotMatch(eventsHistory, /projectTasksForCalendar|projectActionsForDate|tasks-list|Task\[\]/)
  assert.match(calendarMonth, /interface EventCalendarMonthProps[\s\S]*events: Event\[\]/)
  assert.doesNotMatch(calendarMonth, /Task|Action|actionPlanning|eventRelative|eventAssociation/)
})

test('Task calendar exclusion covers operational, temporal, hierarchy, and condition paths', () => {
  for (const phrase of [
    'Tasks are never projected directly into the Calendar.',
    'legacy `actionPlanning` windows',
    '`eventRelative` effective dates',
    '`eventAssociation` context',
    'rollover and favorable-condition matches',
    'root Tasks, Supertasks, and Subtasks',
    'Task-to-Calendar integration is intentionally',
  ]) {
    assert.match(taskModel, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('Only explicit Task to Event conversion creates a Calendar-visible entity', () => {
  assert.match(editTaskModal, /Agendar como evento/)
  assert.match(editTaskModal, /transaction\.set\(eventReference, buildEventFromTask\(/)
  assert.match(editTaskModal, /transaction\.delete\(taskReference\)/)
  assert.match(taskModel, /Only explicit Task → Event conversion creates an Event/)
})
