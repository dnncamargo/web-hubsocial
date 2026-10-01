import type {
  AutomationRule,
  AutomationRuleSet,
  WeekdayName,
} from '../types/automation'
import type { ActionPlanning } from '../types/actions'
import type { TaskEventAssociation, TaskNature, TaskSchedule } from '../types/tasks'

export type TaskFrequency = 'daily' | 'weekly' | 'monthly'
export type WeeklyAuthoringMode = 'flexible' | 'specific'

export interface TaskAuthoringState {
  content: string
  nature: TaskNature
  actionPlanning: ActionPlanning
  schedule?: TaskSchedule
  eventAssociation?: TaskEventAssociation
  automation: AutomationRuleSet
  addingDate: boolean
}

function samePlanning(first: ActionPlanning, second: ActionPlanning): boolean {
  return first.day === second.day
    && first.week === second.week
    && first.month === second.month
}

function sameSchedule(first: TaskSchedule | undefined, second: TaskSchedule | undefined): boolean {
  if (!first || !second) return first === second
  if (first.type !== second.type) return false
  if (first.type === 'daily' && second.type === 'daily') return true
  if (first.type === 'weekly' && second.type === 'weekly') {
    return sortTaskWeekdays(first.weekdays ?? []).join(',') === sortTaskWeekdays(second.weekdays ?? []).join(',')
  }
  if (first.type === 'monthly' && second.type === 'monthly') {
    return first.dayOfMonth === second.dayOfMonth
  }
  return first.type === 'eventRelative'
    && second.type === 'eventRelative'
    && first.eventId === second.eventId
    && first.leadDays === second.leadDays
}

function sameRule(first: AutomationRule, second: AutomationRule): boolean {
  if (first.type !== second.type) return false
  if (first.type === 'weekday' && second.type === 'weekday') {
    return sortTaskWeekdays(first.weekdays).join(',') === sortTaskWeekdays(second.weekdays).join(',')
  }
  if (first.type === 'weather' && second.type === 'weather') {
    return first.condition === second.condition
  }
  if (first.type === 'dayPeriod' && second.type === 'dayPeriod') {
    const order = ['morning', 'afternoon', 'night']
    const firstPeriods = Array.from(new Set(first.periods)).sort(
      (left, right) => order.indexOf(left) - order.indexOf(right),
    )
    const secondPeriods = Array.from(new Set(second.periods)).sort(
      (left, right) => order.indexOf(left) - order.indexOf(right),
    )
    return firstPeriods.join(',') === secondPeriods.join(',')
  }
  return first.type === 'upcomingEvent'
    && second.type === 'upcomingEvent'
    && first.eventId === second.eventId
    && first.withinDays === second.withinDays
}

function sameAutomation(first: AutomationRuleSet, second: AutomationRuleSet): boolean {
  if (first.match !== second.match || first.rules.length !== second.rules.length) return false

  return first.rules.every((rule) => {
    const counterpart = second.rules.find((candidate) => candidate.type === rule.type)
    return counterpart ? sameRule(rule, counterpart) : false
  })
}

function canonicalEventState(state: TaskAuthoringState) {
  const upcoming = state.automation.rules.find((rule) => rule.type === 'upcomingEvent')
  const explicitEventId = state.eventAssociation?.eventId?.trim()
  const ruleEventId = upcoming?.type === 'upcomingEvent' ? upcoming.eventId.trim() : ''
  const scheduleEventId = state.schedule?.type === 'eventRelative' ? state.schedule.eventId : ''
  const eventId = explicitEventId || ruleEventId || scheduleEventId

  if (!eventId || (upcoming?.type === 'upcomingEvent' && !ruleEventId)) {
    return {
      eventAssociation: undefined,
      schedule: state.schedule?.type === 'eventRelative' ? undefined : state.schedule,
      automation: {
        ...state.automation,
        rules: state.automation.rules.filter((rule) => rule.type !== 'upcomingEvent'),
      },
    }
  }

  const withinDays = upcoming?.type === 'upcomingEvent' && Number.isFinite(upcoming.withinDays)
    ? Math.max(0, upcoming.withinDays)
    : state.schedule?.type === 'eventRelative' && Number.isFinite(state.schedule.leadDays)
      ? Math.max(0, state.schedule.leadDays)
      : 3
  const eventRule = {
    id: 'semantic-upcoming-event',
    type: 'upcomingEvent' as const,
    eventId,
    withinDays,
  }
  const schedule = state.schedule?.type === 'eventRelative' || !state.schedule
    ? { type: 'eventRelative' as const, eventId, leadDays: withinDays }
    : state.schedule

  return {
    eventAssociation: { eventId },
    schedule,
    automation: {
      ...state.automation,
      rules: [
        ...state.automation.rules.filter((rule) => rule.type !== 'upcomingEvent'),
        eventRule,
      ],
    },
  }
}

export function isTaskAuthoringDirty(
  current: TaskAuthoringState,
  baseline: TaskAuthoringState,
): boolean {
  if (current.content.trim() !== baseline.content.trim()) return true
  if (current.nature !== baseline.nature) return true
  if (!samePlanning(current.actionPlanning, baseline.actionPlanning)) return true
  if (current.addingDate !== baseline.addingDate) return true

  const currentEventState = canonicalEventState(current)
  const baselineEventState = canonicalEventState(baseline)
  return !sameSchedule(currentEventState.schedule, baselineEventState.schedule)
    || currentEventState.eventAssociation?.eventId !== baselineEventState.eventAssociation?.eventId
    || !sameAutomation(currentEventState.automation, baselineEventState.automation)
}

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
