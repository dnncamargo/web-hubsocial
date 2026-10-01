import { WeekdayName } from './automation'

export type TaskStatus = 0 | 1 | 2

export type SubtaskStatus = 0 | 2

export type TaskNature = 'punctual' | 'recurring'

export interface TaskHierarchyIssue {
  code:
    | 'root-has-parent'
    | 'missing-subtask-id'
    | 'duplicate-subtask-id'
    | 'invalid-parent-link'
    | 'self-reference'
    | 'nested-subtask'
  path: string
}

export interface TaskEventAssociation {
  eventId: string
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
