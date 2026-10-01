import type { AutomationRuleSet, WeekdayName } from '../types/automation'
import type { TaskEventAssociation, TaskNature, TaskSchedule } from '../types/tasks'

export type TaskFrequency = 'daily' | 'weekly' | 'monthly'
export type WeeklyAuthoringMode = 'flexible' | 'specific'

const weekdays: WeekdayName[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const weekdayOrder = new Map(weekdays.map((value, index) => [value, index]))

export function sortTaskWeekdays(values: WeekdayName[]): WeekdayName[] {
  return Array.from(new Set(values)).sort(
    (first, second) => (weekdayOrder.get(first) ?? 0) - (weekdayOrder.get(second) ?? 0),
  )
}

export function changeTaskNature(
  schedule: TaskSchedule | undefined,
  nature: TaskNature,
): TaskSchedule | undefined {
  if (nature === 'punctual') {
    return schedule?.type === 'eventRelative' ? schedule : undefined
  }

  return schedule?.type === 'daily'
    || schedule?.type === 'weekly'
    || schedule?.type === 'monthly'
    ? schedule
    : { type: 'daily' }
}

export function synchronizeEventRelativeSchedule(
  schedule: TaskSchedule | undefined,
  eventAssociation: TaskEventAssociation | undefined,
): TaskSchedule | undefined {
  if (schedule?.type !== 'eventRelative') return schedule
  if (!eventAssociation?.eventId) return undefined

  return {
    ...schedule,
    eventId: eventAssociation.eventId,
  }
}

export function synchronizeUpcomingEventRule(
  automation: AutomationRuleSet,
  eventId: string | undefined,
): AutomationRuleSet {
  return {
    ...automation,
    rules: automation.rules
      .filter(rule => rule.type !== 'upcomingEvent' || eventId !== undefined)
      .map(rule => rule.type === 'upcomingEvent' && eventId !== undefined
        ? { ...rule, eventId }
        : rule),
  }
}

export function changeTaskFrequency(
  frequency: TaskFrequency,
): TaskSchedule {
  if (frequency === 'weekly') return { type: 'weekly' }
  if (frequency === 'monthly') return { type: 'monthly', dayOfMonth: 1 }
  return { type: 'daily' }
}

export function changeWeeklyMode(
  schedule: Extract<TaskSchedule, { type: 'weekly' }>,
  mode: WeeklyAuthoringMode,
): Extract<TaskSchedule, { type: 'weekly' }> {
  if (mode === 'flexible') return { type: 'weekly' }

  return {
    type: 'weekly',
    weekdays: sortTaskWeekdays(schedule.weekdays ?? ['monday']),
  }
}

export function toggleTaskWeekday(
  schedule: Extract<TaskSchedule, { type: 'weekly' }>,
  weekday: WeekdayName,
  selected: boolean,
): Extract<TaskSchedule, { type: 'weekly' }> {
  const current = sortTaskWeekdays(schedule.weekdays ?? [])
  if (selected) {
    return { type: 'weekly', weekdays: sortTaskWeekdays([...current, weekday]) }
  }

  const next = current.filter(candidate => candidate !== weekday)
  return next.length > 0 ? { type: 'weekly', weekdays: next } : { type: 'weekly' }
}
