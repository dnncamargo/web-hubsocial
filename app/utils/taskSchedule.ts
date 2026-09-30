import {
  addDays,
  addMonths,
  format,
  getDaysInMonth,
  parseISO,
  startOfMonth,
} from 'date-fns'
import { ActionHorizon, ActionPlanning } from '../types/actions'
import { WeekdayName } from '../types/automation'
import { TaskSchedule } from '../types/tasks'
import { getActionPeriodKeys } from './actionPlanning'

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

const weekdayByIndex: WeekdayName[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

function getMonthlyOccurrenceDate(referenceDate: Date, dayOfMonth: number) {
  const safeDay = Math.max(1, Math.min(31, Math.trunc(dayOfMonth)))
  const currentMonth = startOfMonth(referenceDate)
  const currentMonthDay = Math.min(safeDay, getDaysInMonth(currentMonth))
  const currentOccurrence = addDays(currentMonth, currentMonthDay - 1)

  if (format(referenceDate, 'yyyy-MM-dd') <= format(currentOccurrence, 'yyyy-MM-dd')) {
    return currentOccurrence
  }

  const nextMonth = addMonths(currentMonth, 1)
  return addDays(nextMonth, Math.min(safeDay, getDaysInMonth(nextMonth)) - 1)
}

export function deriveTaskScheduleOccurrence(
  schedule: TaskSchedule | undefined,
  status: 0 | 1 | 2,
  referenceDate: Date = new Date(),
  events: TaskScheduleEventContext[] = [],
): TaskScheduleOccurrence | null {
  if (!schedule || status === 2) return null

  if (schedule.type === 'daily') {
    return {
      date: format(referenceDate, 'yyyy-MM-dd'),
      horizon: 'day',
    }
  }

  if (schedule.type === 'weekly') {
    if (!schedule.weekdays || schedule.weekdays.length === 0) {
      return { horizon: 'week' }
    }

    for (let offset = 0; offset < 7; offset += 1) {
      const candidate = addDays(referenceDate, offset)
      const weekday = weekdayByIndex[candidate.getDay()]

      if (schedule.weekdays.includes(weekday)) {
        return {
          date: format(candidate, 'yyyy-MM-dd'),
          horizon: offset === 0 ? 'day' : 'week',
        }
      }
    }

    return null
  }

  if (schedule.type === 'monthly') {
    const date = getMonthlyOccurrenceDate(referenceDate, schedule.dayOfMonth)
    const dateKey = format(date, 'yyyy-MM-dd')

    return {
      date: dateKey,
      horizon: dateKey === format(referenceDate, 'yyyy-MM-dd') ? 'day' : 'month',
    }
  }

  const relatedEvent = events.find(event => event.id === schedule.eventId)
  if (!relatedEvent) return null

  const todayKey = format(referenceDate, 'yyyy-MM-dd')
  if (todayKey > relatedEvent.startDate) return null

  const activationDate = addDays(
    parseISO(relatedEvent.startDate),
    -Math.max(0, Math.trunc(schedule.leadDays)),
  )

  if (todayKey < format(activationDate, 'yyyy-MM-dd')) return null

  return {
    date: todayKey,
    horizon: 'day',
  }
}

export function getTaskActionCandidates(
  task: {
    actionPlanning?: ActionPlanning
    schedule?: TaskSchedule
    status: 0 | 1 | 2
    lastActionCompletedDate?: string
  },
  referenceDate: Date = new Date(),
  events: TaskScheduleEventContext[] = [],
): TaskActionCandidate[] {
  if (task.status === 2) return []

  const todayKey = format(referenceDate, 'yyyy-MM-dd')
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

  // Em andamento is a presentation priority: keep the original planning and
  // schedule candidates, while adding a day candidate for canonical display.
  if (task.status === 1) {
    candidates.set('day', {
      horizon: 'day',
      source: 'status',
    })
  }

  return Array.from(candidates.values())
}
