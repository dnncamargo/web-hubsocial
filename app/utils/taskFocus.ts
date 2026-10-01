import type { Task } from './interfaces.ts'
import type { TaskStatus } from '../types/tasks.ts'
import { formatLocalDate } from './dateHelpers.ts'
import { parseCivilDate } from './datePresentation.ts'

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

  if (task.nature === 'punctual' && status === 1 && isValidCivilDate(currentCivilDate)) {
    nextTask.focusedOnDate = currentCivilDate
  } else {
    delete nextTask.focusedOnDate
  }

  return nextTask
}

export interface TaskFocusReconciliation {
  task: Task
  changed: boolean
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
    const rootReconciliation = reconcilePunctualTaskFocus(task, currentCivilDate)
    const rootTask = rootReconciliation.task
    const subtasks = rootTask.subtasks

    if (!subtasks) {
      return rootTask
    }

    let nextSubtasks: Task[] | undefined
    subtasks.forEach((subtask, index) => {
      const reconciliation = reconcilePunctualTaskFocus(subtask, currentCivilDate)
      if (reconciliation.changed) {
        nextSubtasks ??= [...subtasks]
        nextSubtasks[index] = reconciliation.task
      }
    })

    return nextSubtasks ? { ...rootTask, subtasks: nextSubtasks } : rootTask
  })
}
