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
