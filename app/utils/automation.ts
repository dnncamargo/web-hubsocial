import { differenceInCalendarDays, parseISO } from 'date-fns'
import type {
  AutomationEvaluation,
  AutomationEvaluationStatus,
  AutomationRule,
  AutomationRuleEvaluation,
  AutomationRuleSet,
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
