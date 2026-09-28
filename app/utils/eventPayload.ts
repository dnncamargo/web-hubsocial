import { Timestamp } from 'firebase/firestore'
import { ActionPlanning } from '../types/actions'
import { OptionalField } from '../types/optionalFields'
import { Event } from './interfaces'

export type EventPayload = Omit<
  Event,
  'id' | 'createdAt' | 'personIds' | 'categories' | 'optionalFields'
> & {
  personIds: string[]
  categories: string[]
  optionalFields: OptionalField[]
  createdAt: Date | Timestamp
}

export interface EventPayloadInput {
  title: string
  startDate: string
  endDate: string
  allDay: boolean
  location?: string
  startTime?: string
  endTime?: string
  personIds?: string[] | null
  rating?: number
  categories?: string[] | null
  status?: 0 | 1
  timeZone?: string
  optionalFields?: OptionalField[] | null
  actionPlanning?: ActionPlanning
  createdAt?: Date | Timestamp
}

export function buildEventPayload(input: EventPayloadInput): EventPayload {
  return {
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    allDay: input.allDay,
    status: input.status ?? 0,
    personIds: input.personIds ?? [],
    categories: input.categories ?? [],
    optionalFields: input.optionalFields ?? [],
    actionPlanning: input.actionPlanning ?? {},
    createdAt: input.createdAt ?? new Date(),
    ...(input.location !== undefined ? { location: input.location } : {}),
    ...(!input.allDay && input.startTime !== undefined ? { startTime: input.startTime } : {}),
    ...(!input.allDay && input.endTime !== undefined ? { endTime: input.endTime } : {}),
    ...(input.rating !== undefined ? { rating: input.rating } : {}),
    ...(input.timeZone !== undefined ? { timeZone: input.timeZone } : {}),
  }
}
