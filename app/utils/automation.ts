import { differenceInCalendarDays, parseISO } from 'date-fns'
import {
  AutomationEvaluation,
  AutomationRule,
  AutomationRuleEvaluation,
  AutomationRuleSet,
  WeatherCondition,
  WeekdayName,
} from '../types/automation'

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

function evaluateRule(
  rule: AutomationRule,
  context: AutomationEvaluationContext,
): AutomationRuleEvaluation {
  const referenceDate = context.referenceDate ?? new Date()

  if (rule.type === 'weekday') {
    const weekday = weekdayByIndex[referenceDate.getDay()]
    return {
      ruleId: rule.id,
      status: rule.weekdays.includes(weekday) ? 'matched' : 'notMatched',
    }
  }

  if (rule.type === 'weather') {
    if (!context.weather) {
      return { ruleId: rule.id, status: 'unresolved' }
    }

    return {
      ruleId: rule.id,
      status:
        context.weather.condition === rule.condition ? 'matched' : 'notMatched',
    }
  }

  if (!context.events) {
    return { ruleId: rule.id, status: 'unresolved' }
  }

  const event = context.events.find((candidate) => candidate.id === rule.eventId)
  if (!event) {
    return { ruleId: rule.id, status: 'notMatched' }
  }

  const daysUntilEvent = differenceInCalendarDays(
    parseISO(event.startDate),
    referenceDate,
  )

  return {
    ruleId: rule.id,
    status:
      daysUntilEvent >= 0 && daysUntilEvent <= rule.withinDays
        ? 'matched'
        : 'notMatched',
  }
}

export function evaluateAutomation(
  ruleSet: AutomationRuleSet | undefined,
  context: AutomationEvaluationContext = {},
): AutomationEvaluation {
  if (!ruleSet || ruleSet.rules.length === 0) {
    return {
      highlighted: false,
      rules: [],
    }
  }

  const rules = ruleSet.rules.map((rule) => evaluateRule(rule, context))
  const statuses = rules.map((rule) => rule.status)

  const highlighted =
    ruleSet.match === 'all'
      ? statuses.every((status) => status === 'matched')
      : statuses.some((status) => status === 'matched')

  return {
    highlighted,
    rules,
  }
}
