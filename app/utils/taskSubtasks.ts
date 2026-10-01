import type { SubtaskStatus, TaskStatus } from '../types/tasks.ts'
import type { Task } from './interfaces.ts'
import {
  getTaskOccurrenceDateForDate,
  isTaskOccurrenceMarkerCurrent,
} from './taskSchedule.ts'
import { updateSubtask } from './taskHierarchy.ts'

export interface CanonicalSubtask {
  id: string
  content: string
  status: SubtaskStatus
  parentTaskId: string
}

export function createCanonicalSubtask(
  content: string,
  parentTaskId: string,
  id: string = crypto.randomUUID(),
): CanonicalSubtask {
  return {
    id,
    content: content.trim(),
    status: 0,
    parentTaskId,
  }
}

export function getCanonicalSubtaskStatus(subtask: Pick<Task, 'status'>): SubtaskStatus {
  return subtask.status === 2 ? 2 : 0
}

export function getSubtaskOccurrenceMarker(
  parentTask: Pick<Task, 'nature' | 'schedule'>,
  targetDate: string,
): string | null {
  return parentTask.nature === 'recurring'
    ? getTaskOccurrenceDateForDate(parentTask, targetDate)
    : null
}

export function isSubtaskCompletedForOccurrence(
  parentTask: Pick<Task, 'nature' | 'schedule'>,
  subtask: Pick<Task, 'status' | 'lastCompletedOccurrenceDate'>,
  targetDate: string,
): boolean {
  if (parentTask.nature !== 'recurring') {
    return getCanonicalSubtaskStatus(subtask) === 2
  }

  const marker = subtask.lastCompletedOccurrenceDate
  if (!marker) return false

  return isTaskOccurrenceMarkerCurrent(
    parentTask,
    marker,
    targetDate,
    getTaskOccurrenceDateForDate(parentTask, targetDate) ?? undefined,
  )
}

export function getEffectiveTaskStatus(
  task: Pick<
    Task,
    | 'status'
    | 'nature'
    | 'schedule'
    | 'subtasks'
    | 'archivedAt'
    | 'lastActionCompletedDate'
    | 'lastFocusedOccurrenceDate'
  >,
  targetDate: string,
): TaskStatus {
  // Archive is orthogonal to status. Keep the stored value inspectable while
  // operational consumers exclude the task through isTaskArchived().
  if (task.archivedAt) return task.status

  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : []
  if (subtasks.length > 0) return deriveSupertaskStatus(task, targetDate)
  if (task.nature !== 'recurring') return task.status

  const occurrenceDate = getTaskOccurrenceDateForDate(task, targetDate)
  if (!occurrenceDate) return 0

  if (task.status === 2) {
    return isTaskOccurrenceMarkerCurrent(
      task,
      task.lastActionCompletedDate,
      targetDate,
      occurrenceDate,
    ) ? 2 : 0
  }

  if (task.status === 1) {
    return isTaskOccurrenceMarkerCurrent(
      task,
      task.lastFocusedOccurrenceDate,
      targetDate,
      occurrenceDate,
    ) ? 1 : 0
  }

  return 0
}

export function deriveSupertaskStatus(
  task: Pick<Task, 'status' | 'nature' | 'schedule' | 'subtasks'>,
  targetDate: string,
): TaskStatus {
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : []
  if (subtasks.length === 0) return task.status

  const completed = subtasks.map(subtask =>
    isSubtaskCompletedForOccurrence(task, subtask, targetDate),
  )

  if (completed.every(Boolean)) return 2
  if (completed.every(value => !value)) return 0
  return 1
}

export function updateSubtaskCompletionForOccurrence(
  parentTask: Task,
  subtaskId: string,
  completed: boolean,
  targetDate: string,
): Task | null {
  const marker = completed
    ? getSubtaskOccurrenceMarker(parentTask, targetDate)
    : null

  if (parentTask.nature === 'recurring' && completed && !marker) return null

  return updateSubtask(parentTask, subtaskId, subtask => {
    const nextSubtask: Task = {
      ...subtask,
      status: completed ? 2 : 0,
    }
    delete nextSubtask.legacySubtaskStatus

    if (parentTask.nature === 'recurring') {
      if (marker) {
        nextSubtask.lastCompletedOccurrenceDate = marker
      } else {
        delete nextSubtask.lastCompletedOccurrenceDate
      }
    }

    return nextSubtask
  })
}

function setAllSubtaskCompletion(
  task: Task,
  completed: boolean,
  targetDate: string,
): Task | null {
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : []
  const marker = completed ? getSubtaskOccurrenceMarker(task, targetDate) : null

  if (task.nature === 'recurring' && completed && !marker) return null

  return {
    ...task,
    status: completed ? 2 : 0,
    subtasks: subtasks.map(subtask => {
      const nextSubtask: Task = {
        ...subtask,
        status: completed ? 2 : 0,
      }
      delete nextSubtask.legacySubtaskStatus

      if (task.nature === 'recurring') {
        if (marker) {
          nextSubtask.lastCompletedOccurrenceDate = marker
        } else {
          delete nextSubtask.lastCompletedOccurrenceDate
        }
      }

      return nextSubtask
    }),
  }
}

export function setSupertaskNotStarted(task: Task, targetDate: string): Task | null {
  return setAllSubtaskCompletion(task, false, targetDate)
}

export function setSupertaskCompleted(task: Task, targetDate: string): Task | null {
  return setAllSubtaskCompletion(task, true, targetDate)
}
