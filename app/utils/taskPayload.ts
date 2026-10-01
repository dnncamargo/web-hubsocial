import { deleteField, Timestamp } from 'firebase/firestore'
import type { UpdateData } from 'firebase/firestore'
import type { ActionPlanning } from '../types/actions'
import type {
  AutomationRule,
  AutomationRuleSet,
} from '../types/automation'
import type {
  TaskEventAssociation,
  TaskSchedule,
  TaskStatus,
} from '../types/tasks'
import type { Task } from './interfaces'
import {
  getCurrentCivilDate,
  isValidCivilDate,
} from './taskFocus.ts'
import {
  deriveTaskNature,
  normalizeTaskSchedule,
} from './taskSchedule.ts'
import { validateTaskHierarchy } from './taskHierarchy.ts'
import {
  deriveSupertaskStatus,
  setSupertaskCompleted,
  setSupertaskNotStarted,
  updateSubtaskCompletionForOccurrence,
} from './taskSubtasks.ts'

export { deriveTaskNature } from './taskSchedule.ts'

const weekdayNames = new Set([
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
])

export interface TaskDocumentData {
  content: string
  status: TaskStatus
  order?: number
  groupId?: string
  subtasks?: TaskNestedDocument[]
  parentTaskId?: string | null
  createdAt?: Date | Timestamp
  lastActionCompletedDate?: string
  archivedAt?: Timestamp
  focusedOnDate?: string
  actionPlanning?: ActionPlanning
  automation?: AutomationRuleSet
  schedule?: TaskSchedule
  eventAssociation?: TaskEventAssociation
}

export interface TaskNestedDocument {
  id: string
  content: string
  status: TaskStatus
  groupId?: string
  subtasks?: TaskNestedDocument[]
  parentTaskId?: string | null
  createdAt?: Date | Timestamp
  lastActionCompletedDate?: string
  lastCompletedOccurrenceDate?: string
  focusedOnDate?: string
  actionPlanning?: ActionPlanning
  automation?: AutomationRuleSet
  schedule?: TaskSchedule
  eventAssociation?: TaskEventAssociation
}

export interface TaskPayloadInput {
  content: string
  status: TaskStatus
  order?: number
  groupId?: string
  subtasks?: Task[]
  parentTaskId?: string | null
  createdAt?: Date | Timestamp
  lastActionCompletedDate?: string
  archivedAt?: Timestamp
  focusedOnDate?: string
  actionPlanning?: ActionPlanning
  automation?: AutomationRuleSet
  schedule?: TaskSchedule
  eventAssociation?: TaskEventAssociation
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeStatus(value: unknown): TaskStatus {
  return value === 1 || value === 2 ? value : 0
}

function normalizeSubtaskStatus(value: unknown): 0 | 2 {
  return value === 2 ? 2 : 0
}

function normalizeArchivedAt(value: unknown): Timestamp | undefined {
  if (!(value instanceof Timestamp) || !Number.isFinite(value.toMillis())) return undefined
  return value
}

function isAutomationRule(value: unknown): value is AutomationRule {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.type !== 'string') {
    return false
  }

  if (value.type === 'weekday') {
    return Array.isArray(value.weekdays)
      && value.weekdays.every(weekday => typeof weekday === 'string' && weekdayNames.has(weekday))
  }

  if (value.type === 'weather') {
    return ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy'].includes(String(value.condition))
  }

  return value.type === 'upcomingEvent'
    && typeof value.eventId === 'string'
    && typeof value.withinDays === 'number'
}

function normalizeAutomation(value: unknown): AutomationRuleSet | undefined {
  if (!isRecord(value)) return undefined

  const rules = Array.isArray(value.rules)
    ? value.rules.filter(isAutomationRule)
    : []

  return {
    match: value.match === 'any' ? 'any' : 'all',
    rules,
  }
}

function deriveEventAssociation(
  schedule: TaskSchedule | undefined,
): TaskEventAssociation | undefined {
  if (!schedule || schedule.type !== 'eventRelative') return undefined

  return {
    eventId: schedule.eventId,
  }
}

function normalizeEventAssociation(value: unknown): TaskEventAssociation | undefined {
  if (!isRecord(value) || typeof value.eventId !== 'string' || value.eventId.trim() === '') {
    return undefined
  }

  return { eventId: value.eventId.trim() }
}

function resolveEventAssociation(
  value: unknown,
  schedule: TaskSchedule | undefined,
): TaskEventAssociation | undefined {
  return normalizeEventAssociation(value) ?? deriveEventAssociation(schedule)
}

function normalizeFocusedOnDate(
  value: unknown,
  nature: Task['nature'],
  status: Task['status'],
): string | undefined {
  return nature === 'punctual' && status === 1 && isValidCivilDate(value) ? value : undefined
}

function serializeEventAssociation(
  association: TaskEventAssociation | undefined,
  schedule: TaskSchedule | undefined,
): TaskEventAssociation | undefined {
  // eventRelative is a temporal rule that necessarily carries its Event
  // context. Canonical writes keep both contracts synchronized.
  return deriveEventAssociation(schedule) ?? normalizeEventAssociation(association)
}

export function isTaskArchived(task: Pick<Task, 'archivedAt'>): boolean {
  return normalizeArchivedAt(task.archivedAt) !== undefined
}

function normalizeSubtask(value: unknown): Task | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null

  const schedule = normalizeTaskSchedule(value.schedule)
  const nature = deriveTaskNature(schedule)
  const status = normalizeSubtaskStatus(value.status)
  return {
    id: value.id,
    content: typeof value.content === 'string' ? value.content : '',
    status,
    nature,
    ...(value.status === 1 ? { legacySubtaskStatus: 1 as const } : {}),
    ...(typeof value.groupId === 'string' ? { groupId: value.groupId } : {}),
    ...(Array.isArray(value.subtasks)
      ? { subtasks: value.subtasks.map(normalizeSubtask).filter((item): item is Task => item !== null) }
      : { subtasks: undefined }),
    ...(typeof value.parentTaskId === 'string' || value.parentTaskId === null
      ? { parentTaskId: value.parentTaskId }
      : {}),
    ...(value.createdAt !== undefined ? { createdAt: value.createdAt as Task['createdAt'] } : {}),
    ...(typeof value.lastActionCompletedDate === 'string'
      ? { lastActionCompletedDate: value.lastActionCompletedDate }
      : {}),
    ...(isValidCivilDate(value.lastCompletedOccurrenceDate)
      ? { lastCompletedOccurrenceDate: value.lastCompletedOccurrenceDate }
      : {}),
    ...(isValidCivilDate(value.focusedOnDate)
      ? { focusedOnDate: value.focusedOnDate }
      : {}),
    ...(isRecord(value.actionPlanning) ? { actionPlanning: value.actionPlanning as ActionPlanning } : {}),
    ...(normalizeAutomation(value.automation)
      ? { automation: normalizeAutomation(value.automation) }
      : {}),
    ...(schedule ? { schedule } : {}),
    ...(resolveEventAssociation(value.eventAssociation, schedule)
      ? { eventAssociation: resolveEventAssociation(value.eventAssociation, schedule) }
      : {}),
  }
}

export function hydrateTask(
  id: string,
  data: Record<string, unknown>,
  targetDate: string = getCurrentCivilDate(),
): Task {
  const schedule = normalizeTaskSchedule(data.schedule)
  const nature = deriveTaskNature(schedule)
  const status = normalizeStatus(data.status)
  const rawSubtasks = Array.isArray(data.subtasks) ? data.subtasks : []
  const subtasks = Array.isArray(data.subtasks)
    ? data.subtasks.map(normalizeSubtask).filter((item): item is Task => item !== null)
    : undefined
  const eventAssociation = resolveEventAssociation(data.eventAssociation, schedule)

  const hydratedTask: Task = {
    id,
    content: typeof data.content === 'string' ? data.content : '',
    status,
    nature,
    ...(typeof data.order === 'number' ? { order: data.order } : {}),
    ...(typeof data.groupId === 'string' ? { groupId: data.groupId } : {}),
    subtasks,
    ...(typeof data.parentTaskId === 'string' || data.parentTaskId === null
      ? { parentTaskId: data.parentTaskId }
      : {}),
    ...(data.createdAt !== undefined ? { createdAt: data.createdAt as Task['createdAt'] } : {}),
    ...(typeof data.lastActionCompletedDate === 'string'
      ? { lastActionCompletedDate: data.lastActionCompletedDate }
      : {}),
    ...(normalizeArchivedAt(data.archivedAt)
      ? { archivedAt: normalizeArchivedAt(data.archivedAt) }
      : {}),
    ...(normalizeFocusedOnDate(data.focusedOnDate, nature, status)
      ? { focusedOnDate: normalizeFocusedOnDate(data.focusedOnDate, nature, status) }
      : {}),
    ...(isRecord(data.actionPlanning) ? { actionPlanning: data.actionPlanning as ActionPlanning } : {}),
    ...(normalizeAutomation(data.automation)
      ? { automation: normalizeAutomation(data.automation) }
      : {}),
    ...(schedule ? { schedule } : {}),
    ...(eventAssociation ? { eventAssociation } : {}),
  }

  const effectiveTask = {
    ...hydratedTask,
    status: deriveSupertaskStatus(hydratedTask, targetDate),
  }

  const hierarchyIssues = validateTaskHierarchy(effectiveTask)
  rawSubtasks.forEach((value, index) => {
    if (!isRecord(value) || typeof value.id !== 'string' || value.id.trim() === '') {
      hierarchyIssues.push({ code: 'missing-subtask-id', path: `subtasks[${index}].id` })
    }
  })

  return hierarchyIssues.length > 0
    ? { ...effectiveTask, hierarchyIssues }
    : effectiveTask
}

function serializeNestedTask(task: Task, expectedParentTaskId?: string): TaskNestedDocument {
  const schedule = normalizeTaskSchedule(task.schedule)
  const eventAssociation = serializeEventAssociation(task.eventAssociation, schedule)
  const status = task.legacySubtaskStatus === 1 && task.status === 0
    ? 1
    : task.status === 2 ? 2 : 0

  return {
    id: task.id,
    content: task.content,
    status,
    ...(task.groupId !== undefined ? { groupId: task.groupId } : {}),
    ...(task.subtasks !== undefined
      ? { subtasks: task.subtasks.map(subtask => serializeNestedTask(subtask, task.id)) }
      : {}),
    ...(expectedParentTaskId !== undefined
      ? { parentTaskId: expectedParentTaskId }
      : task.parentTaskId !== undefined ? { parentTaskId: task.parentTaskId } : {}),
    ...(task.createdAt !== undefined ? { createdAt: task.createdAt } : {}),
    ...(task.lastActionCompletedDate !== undefined
      ? { lastActionCompletedDate: task.lastActionCompletedDate }
      : {}),
    ...(isValidCivilDate(task.lastCompletedOccurrenceDate)
      ? { lastCompletedOccurrenceDate: task.lastCompletedOccurrenceDate }
      : {}),
    ...(isValidCivilDate(task.focusedOnDate)
      ? { focusedOnDate: task.focusedOnDate }
      : {}),
    ...(task.actionPlanning !== undefined ? { actionPlanning: task.actionPlanning } : {}),
    ...(task.automation !== undefined ? { automation: task.automation } : {}),
    ...(schedule ? { schedule } : {}),
    ...(eventAssociation ? { eventAssociation } : {}),
  }
}

export function serializeTaskSubtask(task: Task): TaskNestedDocument {
  return serializeNestedTask(task)
}

export function serializeTask(task: Task): TaskDocumentData {
  const schedule = normalizeTaskSchedule(task.schedule)
  const nature = deriveTaskNature(schedule)
  const eventAssociation = serializeEventAssociation(task.eventAssociation, schedule)
  const effectiveStatus = deriveSupertaskStatus(task, getCurrentCivilDate())

  return {
    content: task.content,
    status: effectiveStatus,
    ...(task.order !== undefined ? { order: task.order } : {}),
    ...(task.groupId !== undefined ? { groupId: task.groupId } : {}),
    ...(task.subtasks !== undefined
      ? { subtasks: task.subtasks.map(subtask => serializeNestedTask(subtask, task.id)) }
      : {}),
    ...(task.createdAt !== undefined ? { createdAt: task.createdAt } : {}),
    ...(task.lastActionCompletedDate !== undefined
      ? { lastActionCompletedDate: task.lastActionCompletedDate }
      : {}),
    ...(normalizeArchivedAt(task.archivedAt)
      ? { archivedAt: normalizeArchivedAt(task.archivedAt) }
      : {}),
    ...(normalizeFocusedOnDate(task.focusedOnDate, nature, effectiveStatus)
      ? { focusedOnDate: normalizeFocusedOnDate(task.focusedOnDate, nature, effectiveStatus) }
      : {}),
    ...(task.actionPlanning !== undefined ? { actionPlanning: task.actionPlanning } : {}),
    ...(task.automation !== undefined ? { automation: task.automation } : {}),
    ...(schedule ? { schedule } : {}),
    ...(eventAssociation ? { eventAssociation } : {}),
  }
}

export function buildTaskPayload(input: TaskPayloadInput): TaskDocumentData {
  return serializeTask({
    id: '',
    nature: deriveTaskNature(input.schedule),
    subtasks: input.subtasks,
    ...input,
    content: input.content.trim(),
  })
}

export function buildTaskUpdate(input: Pick<TaskPayloadInput, 'content' | 'actionPlanning' | 'automation' | 'schedule' | 'eventAssociation'>): UpdateData<TaskDocumentData> {
  const schedule = normalizeTaskSchedule(input.schedule)
  const eventAssociation = serializeEventAssociation(input.eventAssociation, schedule)

  return {
    content: input.content.trim(),
    actionPlanning: input.actionPlanning ?? {},
    automation: input.automation ?? { match: 'all', rules: [] },
    ...(deriveTaskNature(schedule) === 'recurring'
      ? { focusedOnDate: deleteField() }
      : {}),
    ...(schedule ? { schedule } : { schedule: deleteField() }),
    ...(eventAssociation
      ? { eventAssociation }
      : { eventAssociation: deleteField() }),
  }
}

export function buildTaskArchiveUpdate(): UpdateData<TaskDocumentData> {
  return { archivedAt: Timestamp.now() }
}

export function buildTaskRestoreUpdate(): UpdateData<TaskDocumentData> {
  return { archivedAt: deleteField() }
}

export function buildTaskDailyCompletionUpdate(
  completedDate: string | null,
): UpdateData<TaskDocumentData> {
  return completedDate
    ? { lastActionCompletedDate: completedDate }
    : { lastActionCompletedDate: deleteField() }
}

export function buildTaskStatusUpdate(
  status: TaskStatus,
  focusedOnDate?: string,
): UpdateData<TaskDocumentData> {
  return {
    status,
    ...(status === 1 && isValidCivilDate(focusedOnDate)
      ? { focusedOnDate }
      : { focusedOnDate: deleteField() }),
  }
}

export function buildNestedTaskDailyCompletionUpdate(
  parentTask: Task,
  subtaskId: string,
  completedDate: string,
): UpdateData<TaskDocumentData> | null {
  const updatedParent = updateSubtaskCompletionForOccurrence(
    parentTask,
    subtaskId,
    true,
    completedDate,
  )

  return updatedParent
    ? serializeTask({
      ...updatedParent,
      status: deriveSupertaskStatus(updatedParent, completedDate),
    })
    : null
}

export function buildNestedTaskStatusUpdate(
  parentTask: Task,
  subtaskId: string,
  status: TaskStatus,
  focusedOnDate?: string,
): UpdateData<TaskDocumentData> | null {
  const targetDate = isValidCivilDate(focusedOnDate)
    ? focusedOnDate
    : getCurrentCivilDate()
  const updatedParent = updateSubtaskCompletionForOccurrence(
    parentTask,
    subtaskId,
    status === 2,
    targetDate,
  )

  return updatedParent
    ? serializeTask({
      ...updatedParent,
      status: deriveSupertaskStatus(updatedParent, targetDate),
    })
    : null
}

export function buildSupertaskStatusUpdate(
  parentTask: Task,
  status: 0 | 2,
  targetDate: string = getCurrentCivilDate(),
): UpdateData<TaskDocumentData> | null {
  const updatedTask = status === 2
    ? setSupertaskCompleted(parentTask, targetDate)
    : setSupertaskNotStarted(parentTask, targetDate)

  return updatedTask ? serializeTask(updatedTask) : null
}

export function buildTaskFocusReconciliationUpdate(
  currentTask: Task,
  reconciledTask: Task,
): UpdateData<TaskDocumentData> | null {
  const update: UpdateData<TaskDocumentData> = {}

  if (currentTask.status !== reconciledTask.status) {
    update.status = reconciledTask.status
  }

  if (currentTask.focusedOnDate !== reconciledTask.focusedOnDate) {
    update.focusedOnDate = reconciledTask.focusedOnDate ?? deleteField()
  }

  if (currentTask.subtasks !== reconciledTask.subtasks) {
    update.subtasks = serializeTask(reconciledTask).subtasks ?? []
  }

  return Object.keys(update).length > 0 ? update : null
}
