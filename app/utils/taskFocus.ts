import type { Task } from './interfaces.ts'
import type { TaskStatus } from '../types/tasks.ts'
import { formatLocalDate } from './dateHelpers.ts'
import { parseCivilDate } from './datePresentation.ts'
import {
  getTaskOccurrenceDateForDate,
} from './taskSchedule.ts'
import { getEffectiveTaskStatus } from './taskSubtasks.ts'

export function getCurrentCivilDate(date: Date = new Date()): string {
  return formatLocalDate(date)
}

export function isValidCivilDate(value: unknown): value is string {
  return parseCivilDate(value) !== null
}

export function applyTaskStatusTransition(
  task: Task,
  status: TaskStatus,
  currentCivilDate: string = getCurrentCivilDate(),
): Task {
  const nextTask: Task = { ...task, status }

  if (task.nature === 'recurring') {
    const occurrenceDate = getTaskOccurrenceDateForDate(task, currentCivilDate)
    const marker = occurrenceDate ?? currentCivilDate

    if (status === 1) {
      nextTask.lastFocusedOccurrenceDate = marker
      delete nextTask.lastActionCompletedDate
    } else if (status === 2) {
      nextTask.lastActionCompletedDate = marker
      delete nextTask.lastFocusedOccurrenceDate
    } else {
      delete nextTask.lastFocusedOccurrenceDate
      delete nextTask.lastActionCompletedDate
    }
    delete nextTask.focusedOnDate
  } else if (status === 1 && isValidCivilDate(currentCivilDate)) {
    nextTask.focusedOnDate = currentCivilDate
    delete nextTask.lastFocusedOccurrenceDate
  } else {
    delete nextTask.focusedOnDate
    delete nextTask.lastFocusedOccurrenceDate
  }

  return nextTask
}

export interface TaskFocusReconciliation {
  task: Task
  changed: boolean
}

export function reconcileTaskOperationalStatus(
  task: Task,
  currentCivilDate: string,
): TaskFocusReconciliation {
  if (task.archivedAt !== undefined || !isValidCivilDate(currentCivilDate)) {
    return { task, changed: false }
  }

  if (task.nature === 'punctual' && (task.subtasks?.length ?? 0) === 0) {
    return reconcilePunctualTaskFocus(task, currentCivilDate)
  }

  const effectiveStatus = getEffectiveTaskStatus(task, currentCivilDate)
  const persistedStatus = task.persistedStatus ?? task.status
  const changed = task.status !== effectiveStatus || persistedStatus !== effectiveStatus

  if (!changed) return { task, changed: false }

  return {
    task: { ...task, status: effectiveStatus },
    changed: true,
  }
}

export function reconcilePunctualTaskFocus(
  task: Task,
  currentCivilDate: string,
): TaskFocusReconciliation {
  if (!isValidCivilDate(currentCivilDate)) {
    return { task, changed: false }
  }

  if (task.nature !== 'punctual') {
    if (task.focusedOnDate === undefined) return { task, changed: false }
    const nextTask = { ...task }
    delete nextTask.focusedOnDate
    return { task: nextTask, changed: true }
  }

  if (task.status !== 1) {
    if (task.focusedOnDate === undefined) return { task, changed: false }
    const nextTask = { ...task }
    delete nextTask.focusedOnDate
    return { task: nextTask, changed: true }
  }

  const storedDate = isValidCivilDate(task.focusedOnDate)
    ? task.focusedOnDate
    : undefined

  if (!storedDate) {
    return {
      task: { ...task, focusedOnDate: currentCivilDate },
      changed: task.focusedOnDate !== currentCivilDate,
    }
  }

  if (storedDate >= currentCivilDate) {
    return { task, changed: false }
  }

  const nextTask: Task = { ...task, status: 0 }
  delete nextTask.focusedOnDate
  return { task: nextTask, changed: true }
}

export function reconcileTaskFocusTree(
  tasks: readonly Task[],
  currentCivilDate: string,
): Task[] {
  return tasks.map(task => {
    const rootReconciliation = reconcileTaskOperationalStatus(task, currentCivilDate)
    const rootTask = rootReconciliation.task
    const subtasks = rootTask.subtasks

    if (!subtasks) {
      return rootTask
    }

    // A recurring Supertask is governed by occurrence-scoped child markers;
    // changing the civil date must never reset every child in a loop.
    if (rootTask.nature === 'recurring') return rootTask

    let nextSubtasks: Task[] | undefined
    subtasks.forEach((subtask, index) => {
      const reconciliation = reconcilePunctualTaskFocus(subtask, currentCivilDate)
      if (reconciliation.changed) {
        nextSubtasks ??= [...subtasks]
        nextSubtasks[index] = reconciliation.task
      }
    })

    if (!nextSubtasks) return rootTask

    const nextRoot = { ...rootTask, subtasks: nextSubtasks }
    return {
      ...nextRoot,
      status: getEffectiveTaskStatus(nextRoot, currentCivilDate),
    }
  })
}
