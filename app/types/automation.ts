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
      type: 'upcomingEvent'
      eventId: string
      withinDays: number
    }

export interface AutomationRuleSet {
  match: AutomationMatchMode
  rules: AutomationRule[]
}

export type AutomationRuleStatus = 'matched' | 'notMatched' | 'unresolved'

export interface AutomationRuleEvaluation {
  ruleId: string
  status: AutomationRuleStatus
}

export interface AutomationEvaluation {
  highlighted: boolean
  rules: AutomationRuleEvaluation[]
}
