import { deleteField } from 'firebase/firestore'
import type { Timestamp, UpdateData } from 'firebase/firestore'
import type { ActionPlanning } from '../types/actions'
import type {
  AutomationRule,
  AutomationRuleSet,
  WeekdayName,
} from '../types/automation'
import type {
  TaskEventAssociation,
  TaskNature,
  TaskSchedule,
  TaskStatus,
} from '../types/tasks'
import type { Task } from './interfaces'

export interface TaskDocumentData {
  content: string
  status: TaskStatus
  order?: number
  groupId?: string
  subtasks?: TaskNestedDocument[]
  parentTaskId?: string | null
  createdAt?: Date | Timestamp
  lastActionCompletedDate?: string
  actionPlanning?: ActionPlanning
  automation?: AutomationRuleSet
  schedule?: TaskSchedule
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
  actionPlanning?: ActionPlanning
  automation?: AutomationRuleSet
  schedule?: TaskSchedule
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
  actionPlanning?: ActionPlanning
  automation?: AutomationRuleSet
  schedule?: TaskSchedule
}

const weekdayNames = new Set([
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeStatus(value: unknown): TaskStatus {
  return value === 1 || value === 2 ? value : 0
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

function normalizeSchedule(value: unknown): TaskSchedule | undefined {
  if (!isRecord(value) || typeof value.type !== 'string') return undefined

  if (value.type === 'daily') return { type: 'daily' }

  if (value.type === 'weekly') {
    const weekdays = Array.isArray(value.weekdays)
      ? value.weekdays.filter(
        (weekday): weekday is WeekdayName =>
          typeof weekday === 'string' && weekdayNames.has(weekday),
      )
      : undefined

    return weekdays && weekdays.length > 0
      ? { type: 'weekly', weekdays }
      : { type: 'weekly' }
  }

  if (value.type === 'monthly' && typeof value.dayOfMonth === 'number') {
    return { type: 'monthly', dayOfMonth: value.dayOfMonth }
  }

  if (
    value.type === 'eventRelative'
    && typeof value.eventId === 'string'
    && typeof value.leadDays === 'number'
  ) {
    return {
      type: 'eventRelative',
      eventId: value.eventId,
      leadDays: value.leadDays,
    }
  }

  return undefined
}

export function deriveTaskNature(schedule: TaskSchedule | undefined): TaskNature {
  return schedule && ['daily', 'weekly', 'monthly'].includes(schedule.type)
    ? 'recurring'
    : 'punctual'
}

function deriveEventAssociation(
  schedule: TaskSchedule | undefined,
): TaskEventAssociation | undefined {
  if (!schedule || schedule.type !== 'eventRelative') return undefined

  return {
    eventId: schedule.eventId,
    leadDays: schedule.leadDays,
  }
}

function normalizeSubtask(value: unknown): Task | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null

  const schedule = normalizeSchedule(value.schedule)
  return {
    id: value.id,
    content: typeof value.content === 'string' ? value.content : '',
    status: normalizeStatus(value.status),
    nature: deriveTaskNature(schedule),
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
    ...(isRecord(value.actionPlanning) ? { actionPlanning: value.actionPlanning as ActionPlanning } : {}),
    ...(normalizeAutomation(value.automation)
      ? { automation: normalizeAutomation(value.automation) }
      : {}),
    ...(schedule ? { schedule } : {}),
    ...(deriveEventAssociation(schedule)
      ? { eventAssociation: deriveEventAssociation(schedule) }
      : {}),
  }
}

export function hydrateTask(id: string, data: Record<string, unknown>): Task {
  const schedule = normalizeSchedule(data.schedule)
  const subtasks = Array.isArray(data.subtasks)
    ? data.subtasks.map(normalizeSubtask).filter((item): item is Task => item !== null)
    : undefined
  const eventAssociation = deriveEventAssociation(schedule)

  return {
    id,
    content: typeof data.content === 'string' ? data.content : '',
    status: normalizeStatus(data.status),
    nature: deriveTaskNature(schedule),
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
    ...(isRecord(data.actionPlanning) ? { actionPlanning: data.actionPlanning as ActionPlanning } : {}),
    ...(normalizeAutomation(data.automation)
      ? { automation: normalizeAutomation(data.automation) }
      : {}),
    ...(schedule ? { schedule } : {}),
    ...(eventAssociation ? { eventAssociation } : {}),
  }
}

function serializeNestedTask(task: Task): TaskNestedDocument {
  return {
    id: task.id,
    content: task.content,
    status: task.status,
    ...(task.groupId !== undefined ? { groupId: task.groupId } : {}),
    ...(task.subtasks !== undefined
      ? { subtasks: task.subtasks.map(serializeNestedTask) }
      : {}),
    ...(task.parentTaskId !== undefined ? { parentTaskId: task.parentTaskId } : {}),
    ...(task.createdAt !== undefined ? { createdAt: task.createdAt } : {}),
    ...(task.lastActionCompletedDate !== undefined
      ? { lastActionCompletedDate: task.lastActionCompletedDate }
      : {}),
    ...(task.actionPlanning !== undefined ? { actionPlanning: task.actionPlanning } : {}),
    ...(task.automation !== undefined ? { automation: task.automation } : {}),
    ...(task.schedule !== undefined ? { schedule: task.schedule } : {}),
  }
}

export function serializeTaskSubtask(task: Task): TaskNestedDocument {
  return serializeNestedTask(task)
}

export function serializeTask(task: Task): TaskDocumentData {
  return {
    content: task.content,
    status: task.status,
    ...(task.order !== undefined ? { order: task.order } : {}),
    ...(task.groupId !== undefined ? { groupId: task.groupId } : {}),
    ...(task.subtasks !== undefined
      ? { subtasks: task.subtasks.map(serializeNestedTask) }
      : {}),
    ...(task.parentTaskId !== undefined ? { parentTaskId: task.parentTaskId } : {}),
    ...(task.createdAt !== undefined ? { createdAt: task.createdAt } : {}),
    ...(task.lastActionCompletedDate !== undefined
      ? { lastActionCompletedDate: task.lastActionCompletedDate }
      : {}),
    ...(task.actionPlanning !== undefined ? { actionPlanning: task.actionPlanning } : {}),
    ...(task.automation !== undefined ? { automation: task.automation } : {}),
    ...(task.schedule !== undefined ? { schedule: task.schedule } : {}),
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

export function buildTaskUpdate(input: Pick<TaskPayloadInput, 'content' | 'actionPlanning' | 'automation' | 'schedule'>): UpdateData<TaskDocumentData> {
  return {
    content: input.content.trim(),
    actionPlanning: input.actionPlanning ?? {},
    automation: input.automation ?? { match: 'all', rules: [] },
    ...(input.schedule ? { schedule: input.schedule } : { schedule: deleteField() }),
  }
}

export function buildTaskDailyCompletionUpdate(
  completedDate: string | null,
): UpdateData<TaskDocumentData> {
  return completedDate
    ? { lastActionCompletedDate: completedDate }
    : { lastActionCompletedDate: deleteField() }
}
