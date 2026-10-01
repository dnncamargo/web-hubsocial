export type AutomationMatchMode = 'all' | 'any'

export type WeekdayName =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy'

export type DayPeriod = 'morning' | 'afternoon' | 'night'

export type AutomationRule =
  | {
      id: string
      type: 'weekday'
      weekdays: WeekdayName[]
    }
  | {
      id: string
      type: 'weather'
      condition: WeatherCondition
    }
  | {
      id: string
      type: 'dayPeriod'
      periods: DayPeriod[]
    }
  | {
      id: string
      type: 'upcomingEvent'
      eventId: string
      withinDays: number
    }

export interface AutomationRuleSet {
  match: AutomationMatchMode
  rules: AutomationRule[]
}

export type AutomationRuleStatus = 'matched' | 'notMatched' | 'unresolved'

/**
 * Evaluation status for the favorable-condition layer. The technical
 * `automation` wire remains for backwards compatibility with stored Tasks.
 */
export type AutomationEvaluationStatus =
  | 'matched'
  | 'notMatched'
  | 'notEvaluable'
  | 'noConditions'

export interface AutomationRuleEvaluation {
  ruleId: string
  status: AutomationRuleStatus
}

export interface AutomationEvaluation {
  status: AutomationEvaluationStatus
  highlighted: boolean
  rules: AutomationRuleEvaluation[]
}
