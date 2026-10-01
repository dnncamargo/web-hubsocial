import type { TaskHierarchyIssue } from '../types/tasks'
import type { Task } from './interfaces'

export const MAX_CANONICAL_SUBTASK_DEPTH = 1

export interface TaskHierarchyEntry {
  task: Task
  parentTaskId?: string
  identity: string
}

export type HierarchyOperationResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string }

function isRoot(task: Pick<Task, 'parentTaskId'>): boolean {
  return task.parentTaskId === undefined || task.parentTaskId === null
}

function getDirectSubtasks(task: Pick<Task, 'subtasks'>): Task[] {
  return Array.isArray(task.subtasks) ? task.subtasks : []
}

export function validateTaskHierarchy(task: Task): TaskHierarchyIssue[] {
  const issues: TaskHierarchyIssue[] = []
  const visitedObjects = new WeakSet<object>()

  if (!isRoot(task)) {
    issues.push({ code: 'root-has-parent', path: 'parentTaskId' })
  }

  const visitSubtask = (subtask: Task, expectedParentId: string, path: string) => {
    if (visitedObjects.has(subtask)) return
    visitedObjects.add(subtask)

    if (!subtask.id || subtask.id.trim() === '') {
      issues.push({ code: 'missing-subtask-id', path: `${path}.id` })
    }
    if (subtask.id === task.id) {
      issues.push({ code: 'self-reference', path })
    }
    if (subtask.parentTaskId !== expectedParentId) {
      issues.push({ code: 'invalid-parent-link', path: `${path}.parentTaskId` })
    }

    const descendants = getDirectSubtasks(subtask)
    if (descendants.length > 0) {
      issues.push({ code: 'nested-subtask', path: `${path}.subtasks` })
    }

    const descendantIds = new Set<string>()
    descendants.forEach((descendant, index) => {
      if (descendantIds.has(descendant.id)) {
        issues.push({
          code: 'duplicate-subtask-id',
          path: `${path}.subtasks[${index}].id`,
        })
      }
      descendantIds.add(descendant.id)
      visitSubtask(descendant, subtask.id, `${path}.subtasks[${index}]`)
    })
  }

  const directIds = new Set<string>()
  getDirectSubtasks(task).forEach((subtask, index) => {
    const path = `subtasks[${index}]`
    if (directIds.has(subtask.id)) {
      issues.push({ code: 'duplicate-subtask-id', path: `${path}.id` })
    }
    directIds.add(subtask.id)
    visitSubtask(subtask, task.id, path)
  })

  return issues
}

export function getDirectTaskEntries(tasks: readonly Task[]): TaskHierarchyEntry[] {
  const entries: TaskHierarchyEntry[] = []
  const seenIdentities = new Set<string>()

  for (const task of tasks) {
    const rootIdentity = `root:${task.id}`
    if (!seenIdentities.has(rootIdentity)) {
      seenIdentities.add(rootIdentity)
      entries.push({ task, identity: rootIdentity })
    }

    for (const subtask of getDirectSubtasks(task)) {
      const identity = `subtask:${task.id}:${subtask.id}`
      if (seenIdentities.has(identity)) continue
      seenIdentities.add(identity)
      entries.push({ task: subtask, parentTaskId: task.id, identity })
    }
  }

  return entries
}

export function attachSubtask(
  parent: Task,
  child: Task,
): HierarchyOperationResult<Task> {
  if (!isRoot(parent)) return { ok: false, reason: 'A subtask não pode receber outra subtask.' }
  if (!isRoot(child)) return { ok: false, reason: 'A tarefa já pertence a uma Supertask.' }
  if (parent.id === child.id) return { ok: false, reason: 'Uma tarefa não pode ser filha de si mesma.' }
  if (getDirectSubtasks(parent).some(subtask => subtask.id === child.id)) {
    return { ok: false, reason: 'Esta subtask já pertence à Supertask.' }
  }
  if (getDirectSubtasks(child).length > 0) {
    return { ok: false, reason: 'Uma tarefa com subtasks não pode ser anexada como subtask.' }
  }

  return {
    ok: true,
    value: {
      ...parent,
      subtasks: [
        ...getDirectSubtasks(parent),
        { ...child, parentTaskId: parent.id },
      ],
    },
  }
}

export function removeSubtask(
  parent: Task,
  subtaskId: string,
): HierarchyOperationResult<{ parent: Task; removed: Task }> {
  const subtasks = getDirectSubtasks(parent)
  const index = subtasks.findIndex(subtask => subtask.id === subtaskId)
  if (index === -1) return { ok: false, reason: 'A subtask não foi encontrada.' }

  return {
    ok: true,
    value: {
      parent: {
        ...parent,
        subtasks: subtasks.filter((_, currentIndex) => currentIndex !== index),
      },
      removed: subtasks[index],
    },
  }
}

export function promoteSubtask(
  parent: Task,
  subtaskId: string,
): HierarchyOperationResult<{ parent: Task; promoted: Task }> {
  const removed = removeSubtask(parent, subtaskId)
  if (!removed.ok) return removed

  if (getDirectSubtasks(removed.value.removed).length > 0) {
    return {
      ok: false,
      reason: 'Esta subtask possui descendants legados e não pode ser promovida sem revisão.',
    }
  }

  return {
    ok: true,
    value: {
      parent: removed.value.parent,
      promoted: {
        ...removed.value.removed,
        parentTaskId: null,
      },
    },
  }
}

export function reorderSubtasks(
  parent: Task,
  fromIndex: number,
  toIndex: number,
): HierarchyOperationResult<Task> {
  const subtasks = getDirectSubtasks(parent)
  if (
    fromIndex < 0
    || fromIndex >= subtasks.length
    || toIndex < 0
    || toIndex >= subtasks.length
  ) {
    return { ok: false, reason: 'Índice de reordenação inválido.' }
  }

  const next = [...subtasks]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)

  return { ok: true, value: { ...parent, subtasks: next } }
}

export function updateSubtask(
  parent: Task,
  subtaskId: string,
  updater: (subtask: Task) => Task,
): Task | null {
  const subtasks = getDirectSubtasks(parent)
  const index = subtasks.findIndex(subtask => subtask.id === subtaskId)
  if (index === -1) return null

  return {
    ...parent,
    subtasks: subtasks.map((subtask, currentIndex) =>
      currentIndex === index ? updater(subtask) : subtask),
  }
}

export function updateAllSubtasks(
  parent: Task,
  updater: (subtask: Task) => Task,
): Task {
  return {
    ...parent,
    subtasks: getDirectSubtasks(parent).map(updater),
  }
}
