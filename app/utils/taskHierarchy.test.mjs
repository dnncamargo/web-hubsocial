import assert from 'node:assert/strict'
import test from 'node:test'
import {
  promoteSubtask,
  removeSubtask,
  reorderSubtasks,
  validateTaskHierarchy,
} from './taskHierarchy.ts'

function task(id, extra = {}) {
  return {
    id,
    content: id,
    status: 0,
    nature: 'punctual',
    subtasks: [],
    ...extra,
  }
}

test('validates a root Task and a one-level Supertask', () => {
  const root = task('root')
  assert.deepEqual(validateTaskHierarchy(root), [])
  assert.deepEqual(validateTaskHierarchy({
    ...root,
    subtasks: [task('child', { parentTaskId: 'root' })],
  }), [])
})

test('rejects depth two, self-parent, and duplicate IDs', () => {
  const nested = task('root', {
    subtasks: [task('child', {
      parentTaskId: 'root',
      subtasks: [task('grandchild', { parentTaskId: 'child' })],
    })],
  })
  const depthIssues = validateTaskHierarchy(nested)

  assert.equal(depthIssues.some(issue => issue.code === 'nested-subtask'), true)
  assert.equal(
    validateTaskHierarchy(task('root', {
      subtasks: [task('same', { parentTaskId: 'root' }), task('same', { parentTaskId: 'root' })],
    })).some(issue => issue.code === 'duplicate-subtask-id'),
    true,
  )
})

test('promotion removes only the direct child and preserves its own configuration', () => {
  const parent = task('root', {
    subtasks: [task('child', {
      parentTaskId: 'root',
      status: 1,
      schedule: { type: 'weekly' },
      actionPlanning: { day: '2026-10-01' },
      automation: { match: 'all', rules: [] },
      eventAssociation: { eventId: 'event-1' },
    })],
  })
  const result = promoteSubtask(parent, 'child')

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.value.parent.subtasks, [])
  assert.equal(result.value.promoted.parentTaskId, null)
  assert.equal(result.value.promoted.status, 0)
  assert.deepEqual(result.value.promoted.schedule, { type: 'weekly' })
  assert.deepEqual(result.value.promoted.eventAssociation, { eventId: 'event-1' })
})

test('promotion can receive the effective occurrence status of the Subtask', () => {
  const parent = task('root', {
    subtasks: [task('child', { parentTaskId: 'root', status: 0 })],
  })
  const result = promoteSubtask(parent, 'child', 2)

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.value.promoted.status, 2)
})

test('promotion blocks legacy descendants instead of dropping them', () => {
  const parent = task('root', {
    subtasks: [task('child', {
      parentTaskId: 'root',
      subtasks: [task('grandchild', { parentTaskId: 'child' })],
    })],
  })
  const result = promoteSubtask(parent, 'child')

  assert.equal(result.ok, false)
  assert.equal(parent.subtasks?.[0].subtasks?.[0].id, 'grandchild')
})

test('removes one subtask and reorders direct subtasks deterministically', () => {
  const parent = task('root', {
    subtasks: [
      task('one', { parentTaskId: 'root' }),
      task('two', { parentTaskId: 'root' }),
      task('three', { parentTaskId: 'root' }),
    ],
  })
  const removed = removeSubtask(parent, 'two')
  assert.equal(removed.ok, true)
  if (!removed.ok) return
  assert.deepEqual(removed.value.parent.subtasks?.map(item => item.id), ['one', 'three'])
  assert.equal(removed.value.removed.id, 'two')

  const reordered = reorderSubtasks(removed.value.parent, 1, 0)
  assert.equal(reordered.ok, true)
  if (!reordered.ok) return
  assert.deepEqual(reordered.value.subtasks?.map(item => item.id), ['three', 'one'])
})
