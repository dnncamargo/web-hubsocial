import { differenceInCalendarDays, parseISO } from 'date-fns'
import type {
  AutomationEvaluation,
  AutomationEvaluationStatus,
  AutomationRule,
  AutomationRuleEvaluation,
  AutomationRuleSet,
  DayPeriod,
  WeatherCondition,
  WeekdayName,
} from '../types/automation.ts'

export interface AutomationEventContext {
  id: string
  startDate: string
}

export interface AutomationEvaluationContext {
  referenceDate?: Date
  weather?: {
    condition: WeatherCondition
  }
  events?: AutomationEventContext[]
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

const weekdayNames = new Set<WeekdayName>(weekdayByIndex)
const weatherConditions = new Set<WeatherCondition>([
  'sunny',
  'cloudy',
  'rainy',
  'snowy',
  'stormy',
])
const dayPeriods = new Set<DayPeriod>(['morning', 'afternoon', 'night'])
const dayPeriodOrder = new Map<DayPeriod, number>([
  ['morning', 0],
  ['afternoon', 1],
  ['night', 2],
])

export function normalizeDayPeriods(value: unknown): DayPeriod[] {
  if (!Array.isArray(value)) return []

  return Array.from(new Set(value.filter((period): period is DayPeriod =>
    typeof period === 'string' && dayPeriods.has(period as DayPeriod))))
    .sort((first, second) => dayPeriodOrder.get(first)! - dayPeriodOrder.get(second)!)
}

export function normalizeAutomationRule(value: unknown): AutomationRule | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Record<string, unknown>
  if (typeof candidate.id !== 'string' || typeof candidate.type !== 'string') return null

  if (candidate.type === 'weekday') {
    return Array.isArray(candidate.weekdays)
      && candidate.weekdays.every((weekday) => weekdayNames.has(weekday as WeekdayName))
      ? {
          id: candidate.id,
          type: 'weekday',
          weekdays: candidate.weekdays as WeekdayName[],
        }
      : null
  }

  if (candidate.type === 'weather') {
    return weatherConditions.has(candidate.condition as WeatherCondition)
      ? {
          id: candidate.id,
          type: 'weather',
          condition: candidate.condition as WeatherCondition,
        }
      : null
  }

  if (candidate.type === 'dayPeriod') {
    const periods = normalizeDayPeriods(candidate.periods)
    return periods.length > 0
      ? { id: candidate.id, type: 'dayPeriod', periods }
      : null
  }

  return candidate.type === 'upcomingEvent'
    && typeof candidate.eventId === 'string'
    && typeof candidate.withinDays === 'number'
    ? {
        id: candidate.id,
        type: 'upcomingEvent',
        eventId: candidate.eventId,
        withinDays: candidate.withinDays,
      }
    : null
}

export function normalizeAutomationRuleSet(value: unknown): AutomationRuleSet | undefined {
  if (!value || typeof value !== 'object') return undefined

  const candidate = value as Record<string, unknown>
  const rules = Array.isArray(candidate.rules)
    ? candidate.rules
      .map(normalizeAutomationRule)
      .filter((rule): rule is AutomationRule => rule !== null)
    : []

  return {
    match: candidate.match === 'any' ? 'any' : 'all',
    rules,
  }
}

export function getDayPeriod(date: Date): DayPeriod | undefined {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return undefined

  const hour = date.getHours()
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  return 'night'
}

function evaluateRule(
  rule: AutomationRule,
  context: AutomationEvaluationContext,
): AutomationRuleEvaluation {
  const ruleId = rule && typeof rule === 'object' && typeof rule.id === 'string'
    ? rule.id
    : 'invalid-rule'
  const referenceDate = context.referenceDate ?? new Date()

  if (!(referenceDate instanceof Date) || Number.isNaN(referenceDate.getTime())) {
    return { ruleId, status: 'unresolved' }
  }

  if (!rule || typeof rule !== 'object') {
    return { ruleId, status: 'unresolved' }
  }

  if (rule.type === 'weekday') {
    if (!Array.isArray(rule.weekdays)
      || !rule.weekdays.every((weekday) => weekdayNames.has(weekday))) {
      return { ruleId, status: 'unresolved' }
    }

    const weekday = weekdayByIndex[referenceDate.getDay()]
    return {
      ruleId,
      status: rule.weekdays.includes(weekday) ? 'matched' : 'notMatched',
    }
  }

  if (rule.type === 'weather') {
    if (!weatherConditions.has(rule.condition) || !context.weather) {
      return { ruleId, status: 'unresolved' }
    }

    return {
      ruleId,
      status:
        context.weather.condition === rule.condition ? 'matched' : 'notMatched',
    }
  }

  if (rule.type === 'dayPeriod') {
    const periods = normalizeDayPeriods(rule.periods)
    if (periods.length === 0) {
      return { ruleId, status: 'unresolved' }
    }

    return {
      ruleId,
      status: periods.includes(getDayPeriod(referenceDate) as DayPeriod)
        ? 'matched'
        : 'notMatched',
    }
  }

  if (rule.type !== 'upcomingEvent') {
    return { ruleId, status: 'unresolved' }
  }

  if (!context.events) {
    return { ruleId, status: 'unresolved' }
  }

  if (typeof rule.eventId !== 'string'
    || !Number.isFinite(rule.withinDays)
    || rule.withinDays < 0) {
    return { ruleId, status: 'unresolved' }
  }

  const event = context.events.find((candidate) => candidate.id === rule.eventId)
  if (!event) {
    return { ruleId, status: 'notMatched' }
  }

  const eventDate = parseISO(event.startDate)
  if (Number.isNaN(eventDate.getTime())) {
    return { ruleId, status: 'unresolved' }
  }

  const daysUntilEvent = differenceInCalendarDays(eventDate, referenceDate)

  return {
    ruleId,
    status:
      daysUntilEvent >= 0 && daysUntilEvent <= rule.withinDays
        ? 'matched'
        : 'notMatched',
  }
}

function getEvaluationStatus(
  match: AutomationRuleSet['match'],
  rules: AutomationRuleEvaluation[],
): AutomationEvaluationStatus {
  if (rules.length === 0) return 'noConditions'

  const hasMatched = rules.some((rule) => rule.status === 'matched')
  const hasUnresolved = rules.some((rule) => rule.status === 'unresolved')

  if (match === 'any') {
    if (hasMatched) return 'matched'
    if (hasUnresolved) return 'notEvaluable'
    return 'notMatched'
  }

  if (rules.every((rule) => rule.status === 'matched')) return 'matched'
  if (hasUnresolved) return 'notEvaluable'
  return 'notMatched'
}

export function evaluateAutomation(
  ruleSet: AutomationRuleSet | undefined,
  context: AutomationEvaluationContext = {},
): AutomationEvaluation {
  const configuredRules = Array.isArray(ruleSet?.rules) ? ruleSet.rules : []

  if (configuredRules.length === 0) {
    return {
      status: 'noConditions',
      highlighted: false,
      rules: [],
    }
  }

  const rules = configuredRules.map((rule) => evaluateRule(rule, context))
  const status = getEvaluationStatus(ruleSet?.match === 'any' ? 'any' : 'all', rules)

  return {
    status,
    highlighted: status === 'matched',
    rules,
  }
}
