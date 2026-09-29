import { WeekdayName } from './automation'

export type TaskSchedule =
  | {
      type: 'daily'
    }
  | {
      type: 'weekly'
      weekdays?: WeekdayName[]
    }
  | {
      type: 'monthly'
      dayOfMonth: number
    }
  | {
      type: 'eventRelative'
      eventId: string
      leadDays: number
    }
