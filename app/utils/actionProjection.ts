import type {
  ActionHorizon,
  ActionProjection,
  ActionProjectionItem,
  ActionCompletionMode,
  ActionSource,
} from '../types/actions.ts'
import { evaluateAutomation } from './automation.ts'
import type { AutomationEventContext } from './automation.ts'
import type { AutomationRuleSet, WeatherCondition } from '../types/automation.ts'
import type { Event, Task } from './interfaces.ts'
import {
  deriveTaskScheduleOccurrence,
  getTaskEffectiveDate,
  getTaskNature,
  isTaskOccurrenceCompletedForDate,
} from './taskSchedule.ts'
import { getActionPeriodKeys } from './actionPlanning.ts'
import { parseCivilDate } from './datePresentation.ts'
import { getEffectiveTaskStatus } from './taskSubtasks.ts'
import { isTaskArchived } from './taskPayload.ts'

export interface PlannedActionSource {
  item: Omit<ActionProjectionItem, 'automation'>
  automation?: AutomationRuleSet
}

export function toEventActionSource(event: Event): PlannedActionSource {
  return {
    item: {
      key: `event:${event.id}`,
      sourceType: 'event',
      sourceId: event.id,
      title: event.title,
      completed: event.status === 1,
      date: event.startDate,
      categories: event.categories,
      ...(!event.allDay && event.startTime ? { time: event.startTime } : {}),
    },
    automation: event.automation,
  }
}

export function projectEventSourcesForDay(
  events: readonly Event[],
  currentCivilDate: string,
): PlannedActionSource[] {
  const eligibleEvents = new Map<string, Event>()

  for (const event of events) {
    if (
      event.startDate === currentCivilDate
      || event.actionPlanning?.day === currentCivilDate
    ) {
      eligibleEvents.set(event.id, event)
    }
  }

  return Array.from(eligibleEvents.values(), toEventActionSource)
}

export type ActionSourcesByHorizon = ReadonlyArray<
  readonly [ActionHorizon, readonly PlannedActionSource[]]
>

export interface ActionProjectionContext {
  referenceDate: Date
  events: AutomationEventContext[]
  weatherCondition?: WeatherCondition
}

export interface ProjectedTaskAction {
  taskId: string
  horizon: ActionHorizon
  source: ActionSource
  completionMode: ActionCompletionMode
  effectiveDate?: string
}

export interface TaskActionProjectionContext {
  events?: Array<{ id: string; startDate: string }>
}

type TaskActionCandidate = ProjectedTaskAction & { priority: number }

function getTaskScheduleCandidate(
  task: Task,
  targetDate: string,
  targetDateValue: Date,
  events: Array<{ id: string; startDate: string }>,
): TaskActionCandidate | { suppressed: true } | null {
  const schedule = task.schedule?.type === 'eventRelative' && task.eventAssociation?.eventId
    ? { ...task.schedule, eventId: task.eventAssociation.eventId }
    : task.schedule

  if (!schedule) return null

  if (schedule.type === 'eventRelative') {
    const effectiveDate = getTaskEffectiveDate({ ...task, schedule }, events)
    if (!effectiveDate) return null

    if (effectiveDate === targetDate) {
      return {
        taskId: task.id,
        horizon: 'day',
        source: 'eventRelative',
        completionMode: 'lifecycle',
        effectiveDate,
        priority: 30,
      }
    }

    return effectiveDate < targetDate
      ? {
        taskId: task.id,
        horizon: 'day',
        source: 'rollover',
        completionMode: 'lifecycle',
        effectiveDate: targetDate,
        priority: 20,
      }
      : null
  }

  const occurrence = deriveTaskScheduleOccurrence(
    schedule,
    task.status,
    targetDateValue,
    events,
  )
  if (!occurrence) return null

  const effectiveDate = occurrence.date ?? targetDate
  if (isTaskOccurrenceCompletedForDate(task, targetDate, effectiveDate)) {
    return { suppressed: true }
  }

  return {
    taskId: task.id,
    horizon: occurrence.horizon,
    source: 'recurring',
    completionMode: 'daily',
    effectiveDate,
    priority: 30,
  }
}

function getTaskPlanningCandidate(
  task: Task,
  targetDate: string,
  targetDateValue: Date,
): TaskActionCandidate | null {
  const planning = task.actionPlanning
  if (!planning) return null

  const periods = getActionPeriodKeys(targetDateValue)
  const completionMode: ActionCompletionMode = getTaskNature(task) === 'recurring'
    ? 'daily'
    : 'lifecycle'

  if (planning.day === targetDate) {
    return {
      taskId: task.id,
      horizon: 'day',
      source: 'planned',
      completionMode,
      effectiveDate: targetDate,
      priority: 10,
    }
  }

  if (planning.week === periods.week) {
    return {
      taskId: task.id,
      horizon: 'week',
      source: 'planned',
      completionMode,
      priority: 10,
    }
  }

  if (planning.month === periods.month) {
    return {
      taskId: task.id,
      horizon: 'month',
      source: 'planned',
      completionMode,
      priority: 10,
    }
  }

  if (getTaskNature(task) === 'punctual'
    && typeof planning.day === 'string'
    && parseCivilDate(planning.day)
    && planning.day < targetDate) {
    return {
      taskId: task.id,
      horizon: 'day',
      source: 'rollover',
      completionMode: 'lifecycle',
      effectiveDate: targetDate,
      priority: 20,
    }
  }

  return null
}

/**
 * Projects one canonical Action per Task for a civil target date. This is a
 * pure base projection; favorable conditions are applied separately by
 * projectActionSources.
 */
export function projectActionsForDate(
  tasks: readonly Task[],
  targetDate: string,
  context: TaskActionProjectionContext = {},
): ProjectedTaskAction[] {
  const targetDateValue = parseCivilDate(targetDate)?.date
  if (!targetDateValue) return []

  const events = context.events ?? []

  return tasks
    .filter(task => task.parentTaskId === undefined || task.parentTaskId === null)
    .flatMap(task => {
      if (isTaskArchived(task)) return []

      const effectiveTask = {
        ...task,
        status: getEffectiveTaskStatus(task, targetDate),
      }
      if (effectiveTask.status === 2) return []

      const scheduleCandidate = getTaskScheduleCandidate(
        effectiveTask,
        targetDate,
        targetDateValue,
        events,
      )
      if (scheduleCandidate && 'suppressed' in scheduleCandidate) return []

      const candidates: TaskActionCandidate[] = []
      if (scheduleCandidate) candidates.push(scheduleCandidate)

      const planningCandidate = getTaskPlanningCandidate(
        effectiveTask,
        targetDate,
        targetDateValue,
      )
      if (planningCandidate) candidates.push(planningCandidate)

      if (effectiveTask.status === 1) {
        candidates.push({
          taskId: task.id,
          horizon: 'day',
          source: 'status',
          completionMode: getTaskNature(effectiveTask) === 'recurring' ? 'daily' : 'lifecycle',
          priority: 40,
        })
      }

      if (candidates.length === 0) return []

      const [selected] = candidates.sort((left, right) => right.priority - left.priority)
      const { priority: _priority, ...action } = selected
      return [action]
    })
}

export function hasWeatherRules(
  sourcesByHorizon: ActionSourcesByHorizon,
): boolean {
  return sourcesByHorizon.some(([, sources]) =>
    sources.some((source) =>
      Array.isArray(source.automation?.rules)
      && source.automation.rules.some((rule) => rule.type === 'weather'),
    ),
  )
}

export function projectActionSources(
  sourcesByHorizon: ActionSourcesByHorizon,
  context: ActionProjectionContext,
): ActionProjection {
  const projectedTaskKeys = new Set<string>()
  const projection: ActionProjection = {
    day: [],
    week: [],
    month: [],
  }

  for (const [horizon, sources] of sourcesByHorizon) {
    const visibleSources = sources.filter((source) => {
      if (source.item.sourceType !== 'task') return true
      if (projectedTaskKeys.has(source.item.key)) return false

      projectedTaskKeys.add(source.item.key)
      return true
    })

    projection[horizon] = visibleSources
      .map(({ item, automation }) => ({
        ...item,
        automation: evaluateAutomation(automation, {
          referenceDate: context.referenceDate,
          events: context.events,
          ...(context.weatherCondition
            ? { weather: { condition: context.weatherCondition } }
            : {}),
        }),
      }))
      .sort((a, b) => {
        if (a.automation.highlighted !== b.automation.highlighted) {
          return a.automation.highlighted ? -1 : 1
        }

        if (a.inProgress !== b.inProgress) {
          return a.inProgress ? -1 : 1
        }

        const timeOrder = (a.time ?? '99:99').localeCompare(b.time ?? '99:99')
        return timeOrder !== 0 ? timeOrder : a.title.localeCompare(b.title, 'pt-BR')
      })
  }

  return projection
}
