import { WeekdayName } from './automation'

export type TaskStatus = 0 | 1 | 2

export type TaskNature = 'punctual' | 'recurring'

export interface TaskEventAssociation {
  eventId: string
  leadDays: number
}

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
