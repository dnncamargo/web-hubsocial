import {
  addDays,
  addMonths,
  getDaysInMonth,
  startOfMonth,
} from 'date-fns'
import type { ActionHorizon, ActionPlanning } from '../types/actions'
import type { WeekdayName } from '../types/automation'
import type {
  TaskNature,
  TaskSchedule,
  TaskStatus,
} from '../types/tasks'
import type { Task } from './interfaces'
import { formatLocalDate } from './dateHelpers.ts'
import { parseCivilDate } from './datePresentation.ts'
import { getActionPeriodKeys } from './actionPlanning.ts'

export interface TaskScheduleEventContext {
  id: string
  startDate: string
}

export interface TaskScheduleOccurrence {
  date?: string
  horizon: ActionHorizon
}

export interface TaskActionCandidate extends TaskScheduleOccurrence {
  source: 'manual' | 'schedule' | 'status' | 'dailyCompletion'
  completedToday?: boolean
}

export type TaskScheduleDateInput = string | Date

const weekdayNames = new Set<WeekdayName>([
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
])

const weekdayByIndex: WeekdayName[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

const MAX_EVENT_LEAD_DAYS = 365

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)
}

function isWeekday(value: unknown): value is WeekdayName {
  return typeof value === 'string' && weekdayNames.has(value as WeekdayName)
}

/**
 * Validates the legacy schedule wire shape without coercing partial objects.
 * A weekly schedule without weekdays is the documented flexible-week form.
 */
export function validateTaskSchedule(value: unknown): value is TaskSchedule {
  if (!isRecord(value) || typeof value.type !== 'string') return false

  if (value.type === 'daily') return true

  if (value.type === 'weekly') {
    if (!('weekdays' in value) || value.weekdays === undefined) return true
    if (!Array.isArray(value.weekdays)) return false

    const weekdays = value.weekdays
    return weekdays.every(isWeekday)
      && new Set(weekdays).size === weekdays.length
  }

  if (value.type === 'monthly') {
    return isFiniteInteger(value.dayOfMonth)
      && value.dayOfMonth >= 1
      && value.dayOfMonth <= 31
  }

  if (value.type === 'eventRelative') {
    return typeof value.eventId === 'string'
      && value.eventId.trim().length > 0
      && isFiniteInteger(value.leadDays)
      && value.leadDays >= 0
      && value.leadDays <= MAX_EVENT_LEAD_DAYS
  }

  return false
}

/** Normalizes a valid schedule while dropping legacy fields not in the wire contract. */
export function normalizeTaskSchedule(value: unknown): TaskSchedule | undefined {
  if (!validateTaskSchedule(value)) return undefined

  if (value.type === 'daily') return { type: 'daily' }
  if (value.type === 'monthly') {
    return { type: 'monthly', dayOfMonth: value.dayOfMonth }
  }
  if (value.type === 'eventRelative') {
    return {
      type: 'eventRelative',
      eventId: value.eventId.trim(),
      leadDays: value.leadDays,
    }
  }

  const weekdays = value.weekdays
  return weekdays && weekdays.length > 0
    ? { type: 'weekly', weekdays: [...weekdays] }
    : { type: 'weekly' }
}

export function deriveTaskNature(schedule: unknown): TaskNature {
  const normalizedSchedule = normalizeTaskSchedule(schedule)
  return normalizedSchedule
    && ['daily', 'weekly', 'monthly'].includes(normalizedSchedule.type)
    ? 'recurring'
    : 'punctual'
}

export function getTaskNature(task: Pick<Task, 'schedule'>): TaskNature {
  return deriveTaskNature(task.schedule)
}

function toCivilDateKey(value: TaskScheduleDateInput): string | null {
  if (typeof value === 'string') {
    const normalized = value.trim()
    return parseCivilDate(normalized) ? normalized : null
  }

  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null
  return formatLocalDate(value)
}

function addCivilDays(dateKey: string, amount: number): string | null {
  const parsed = parseCivilDate(dateKey)
  return parsed ? formatLocalDate(addDays(parsed.date, amount)) : null
}

/** Returns the Monday that starts the civil week containing the given date. */
export function getCivilWeekKey(value: TaskScheduleDateInput): string | null {
  const dateKey = toCivilDateKey(value)
  const parsed = dateKey ? parseCivilDate(dateKey) : null
  if (!dateKey || !parsed) return null

  const mondayOffset = (parsed.date.getDay() + 6) % 7
  return addCivilDays(dateKey, -mondayOffset)
}

export function isSameTaskWeek(
  firstDate: TaskScheduleDateInput,
  secondDate: TaskScheduleDateInput,
): boolean {
  const firstWeek = getCivilWeekKey(firstDate)
  const secondWeek = getCivilWeekKey(secondDate)
  return firstWeek !== null && firstWeek === secondWeek
}

function getMonthlyOccurrenceDate(
  year: number,
  month: number,
  dayOfMonth: number,
): string {
  const monthStart = new Date(0)
  monthStart.setFullYear(year, month - 1, 1)
  monthStart.setHours(12, 0, 0, 0)
  const day = Math.min(dayOfMonth, getDaysInMonth(monthStart))
  return formatLocalDate(addDays(monthStart, day - 1))
}

function getMonthlyOccurrenceForReference(
  referenceDate: string,
  dayOfMonth: number,
  monthOffset: number,
): string | null {
  const parsed = parseCivilDate(referenceDate)
  if (!parsed) return null

  const month = addMonths(startOfMonth(parsed.date), monthOffset)
  return getMonthlyOccurrenceDate(
    month.getFullYear(),
    month.getMonth() + 1,
    dayOfMonth,
  )
}

function getEventRelativeDate(
  schedule: Extract<TaskSchedule, { type: 'eventRelative' }>,
  events: TaskScheduleEventContext[],
): string | null {
  const event = events.find(candidate => candidate.id === schedule.eventId)
  const eventDate = event ? toCivilDateKey(event.startDate) : null
  return eventDate ? addCivilDays(eventDate, -schedule.leadDays) : null
}

export function getTaskEffectiveDate(
  task: Pick<Task, 'schedule'>,
  events: TaskScheduleEventContext[] = [],
): string | null {
  const schedule = normalizeTaskSchedule(task.schedule)
  return schedule?.type === 'eventRelative'
    ? getEventRelativeDate(schedule, events)
    : null
}

export function isTaskOccurrenceCompletedForDate(
  task: Pick<Task, 'schedule' | 'lastActionCompletedDate'>,
  targetDate: TaskScheduleDateInput,
  occurrenceDate?: TaskScheduleDateInput,
): boolean {
  const targetKey = toCivilDateKey(targetDate)
  const completionKey = task.lastActionCompletedDate
    ? toCivilDateKey(task.lastActionCompletedDate)
    : null
  const schedule = normalizeTaskSchedule(task.schedule)

  if (!targetKey || !completionKey || !schedule || completionKey > targetKey) {
    return false
  }

  if (schedule.type === 'weekly'
    && (!schedule.weekdays || schedule.weekdays.length === 0)) {
    return isSameTaskWeek(completionKey, targetKey)
  }

  const occurrenceKey = occurrenceDate ? toCivilDateKey(occurrenceDate) : targetKey
  return occurrenceKey !== null && completionKey === occurrenceKey
}

function getOccurrenceOnOrAfter(
  schedule: TaskSchedule,
  referenceDate: string,
  events: TaskScheduleEventContext[],
): string | null {
  if (schedule.type === 'daily') return referenceDate

  if (schedule.type === 'weekly') {
    if (!schedule.weekdays || schedule.weekdays.length === 0) return referenceDate

    for (let offset = 0; offset < 7; offset += 1) {
      const candidate = addCivilDays(referenceDate, offset)
      const parsed = candidate ? parseCivilDate(candidate) : null
      if (candidate && parsed && schedule.weekdays.includes(weekdayByIndex[parsed.date.getDay()])) {
        return candidate
      }
    }

    return null
  }

  if (schedule.type === 'monthly') {
    for (let monthOffset = 0; monthOffset <= 1; monthOffset += 1) {
      const candidate = getMonthlyOccurrenceForReference(
        referenceDate,
        schedule.dayOfMonth,
        monthOffset,
      )
      if (candidate && candidate >= referenceDate) return candidate
    }

    return null
  }

  const eventDate = getEventRelativeDate(schedule, events)
  return eventDate === referenceDate ? eventDate : null
}

/**
 * Answers only the calendar question. Lifecycle status and daily execution
 * are intentionally not inputs to recurrence.
 *
 * Flexible weekly schedules return true for any date in their active weekly
 * window. They represent one pending execution window, not seven occurrences;
 * isTaskOccurrenceCompletedForDate applies the week-level completion rule.
 */
export function isTaskScheduledForDate(
  task: Pick<Task, 'schedule'>,
  date: TaskScheduleDateInput,
  events: TaskScheduleEventContext[] = [],
): boolean {
  const dateKey = toCivilDateKey(date)
  const schedule = normalizeTaskSchedule(task.schedule)
  return dateKey !== null
    && schedule !== undefined
    && getOccurrenceOnOrAfter(schedule, dateKey, events) === dateKey
}

/**
 * Returns the first occurrence strictly after `afterDate`.
 * The exclusive boundary is deliberate; use isTaskScheduledForDate when an
 * inclusive check is needed.
 */
export function getNextTaskOccurrence(
  task: Pick<Task, 'schedule'>,
  afterDate: TaskScheduleDateInput,
  events: TaskScheduleEventContext[] = [],
): string | null {
  const afterKey = toCivilDateKey(afterDate)
  const schedule = normalizeTaskSchedule(task.schedule)
  if (!afterKey || !schedule) return null

  if (schedule.type === 'eventRelative') {
    const eventDate = getEventRelativeDate(schedule, events)
    return eventDate && eventDate > afterKey ? eventDate : null
  }

  if (schedule.type === 'daily') return addCivilDays(afterKey, 1)

  if (schedule.type === 'weekly') {
    if (!schedule.weekdays || schedule.weekdays.length === 0) return null

    for (let offset = 1; offset <= 7; offset += 1) {
      const candidate = addCivilDays(afterKey, offset)
      if (candidate && isTaskScheduledForDate(task, candidate, events)) return candidate
    }

    return null
  }

  for (let monthOffset = 0; monthOffset <= 1; monthOffset += 1) {
    const candidate = getMonthlyOccurrenceForReference(
      afterKey,
      schedule.dayOfMonth,
      monthOffset,
    )
    if (candidate && candidate > afterKey) return candidate
  }

  return null
}

export function deriveTaskScheduleOccurrence(
  schedule: TaskSchedule | undefined,
  status: TaskStatus,
  referenceDate: Date = new Date(),
  events: TaskScheduleEventContext[] = [],
): TaskScheduleOccurrence | null {
  if (!schedule || status === 2) return null

  const referenceKey = toCivilDateKey(referenceDate)
  const normalizedSchedule = normalizeTaskSchedule(schedule)
  if (!referenceKey || !normalizedSchedule) return null

  if (normalizedSchedule.type === 'weekly'
    && (!normalizedSchedule.weekdays || normalizedSchedule.weekdays.length === 0)) {
    return { horizon: 'week' }
  }

  const date = getOccurrenceOnOrAfter(normalizedSchedule, referenceKey, events)
  if (!date) return null

  return {
    date,
    horizon: date === referenceKey
      ? 'day'
      : normalizedSchedule.type === 'monthly' ? 'month' : 'week',
  }
}

export function getTaskActionCandidates(
  task: {
    actionPlanning?: ActionPlanning
    schedule?: TaskSchedule
    status: TaskStatus
    lastActionCompletedDate?: string
  },
  referenceDate: Date = new Date(),
  events: TaskScheduleEventContext[] = [],
): TaskActionCandidate[] {
  if (task.status === 2) return []

  const todayKey = formatLocalDate(referenceDate)
  if (task.lastActionCompletedDate === todayKey) {
    return [{
      date: todayKey,
      horizon: 'day',
      source: 'dailyCompletion',
      completedToday: true,
    }]
  }

  const periods = getActionPeriodKeys(referenceDate)
  const candidates = new Map<ActionHorizon, TaskActionCandidate>()

  for (const horizon of ['day', 'week', 'month'] as const) {
    if (task.actionPlanning?.[horizon] === periods[horizon]) {
      candidates.set(horizon, {
        horizon,
        source: 'manual',
      })
    }
  }

  const scheduled = deriveTaskScheduleOccurrence(
    task.schedule,
    task.status,
    referenceDate,
    events,
  )

  if (scheduled) {
    candidates.set(scheduled.horizon, {
      ...scheduled,
      source: 'schedule',
    })
  }

  // Em foco is a presentation priority: keep the original planning and
  // schedule candidates, while adding a day candidate for canonical display.
  if (task.status === 1) {
    candidates.set('day', {
      horizon: 'day',
      source: 'status',
    })
  }

  return Array.from(candidates.values())
}
