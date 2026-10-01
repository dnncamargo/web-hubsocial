import type { AutomationEvaluation } from './automation'

export type ActionHorizon = 'day' | 'week' | 'month'

export interface ActionPlanning {
  /**
   * Exact civil date (YYYY-MM-DD) for manual inclusion in Actions of the Day.
   */
  day?: string

  /**
   * Monday civil date (YYYY-MM-DD) that identifies the planned week.
   */
  week?: string

  /**
   * Civil month key (YYYY-MM) for manual inclusion in Actions of the Month.
   */
  month?: string
}

export type ActionSourceType = 'event' | 'task'

export type ActionSource =
  | 'planned'
  | 'recurring'
  | 'rollover'
  | 'eventRelative'
  | 'status'

export type ActionCompletionMode = 'daily' | 'lifecycle'

export interface ActionProjectionItem {
  key: string
  sourceType: ActionSourceType
  sourceId: string
  title: string
  completed: boolean
  source?: ActionSource
  completionMode?: ActionCompletionMode
  completedToday?: boolean
  inProgress?: boolean
  categories?: string[]
  automation: AutomationEvaluation
  date?: string
  time?: string
}

export type ActionProjection = Record<ActionHorizon, ActionProjectionItem[]>
