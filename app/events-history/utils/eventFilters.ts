import type { Event } from '../../utils/interfaces'
import type { OptionalField } from '../../types/optionalFields'

export interface EventFilter {
  enabled: boolean
  startDate: string
  endDate: string
  hasRating: number
  hasTasks: boolean
  hasNotes: boolean
  hasAddressByCEP: boolean
  selectedCategories: string[]
}

export const defaultEventFilters: EventFilter = {
  enabled: true,
  startDate: '',
  endDate: '',
  hasRating: 0,
  hasTasks: false,
  hasNotes: false,
  hasAddressByCEP: false,
  selectedCategories: [],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value
}

function normalizeDate(value: unknown): string {
  return typeof value === 'string' && isValidCivilDate(value) ? value : ''
}

function normalizeRating(value: unknown): number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= 0
    && value <= 5
    ? value
    : 0
}

function normalizeCategories(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return Array.from(new Set(
    value.filter((category): category is string => typeof category === 'string')
      .map(category => category.trim())
      .filter(Boolean),
  ))
}

export function normalizeEventFilters(value: unknown): EventFilter {
  const data = isRecord(value) ? value : {}

  return {
    enabled: typeof data.enabled === 'boolean'
      ? data.enabled
      : defaultEventFilters.enabled,
    startDate: normalizeDate(data.startDate),
    endDate: normalizeDate(data.endDate),
    hasRating: normalizeRating(data.hasRating),
    hasTasks: typeof data.hasTasks === 'boolean' ? data.hasTasks : false,
    hasNotes: typeof data.hasNotes === 'boolean' ? data.hasNotes : false,
    hasAddressByCEP: typeof data.hasAddressByCEP === 'boolean'
      ? data.hasAddressByCEP
      : false,
    selectedCategories: normalizeCategories(data.selectedCategories),
  }
}

function getOptionalFields(event: Event): OptionalField[] {
  return Array.isArray(event.optionalFields) ? event.optionalFields : []
}

function hasTasks(event: Event): boolean {
  return getOptionalFields(event).some(field =>
    field.type === 'tasks'
    && Array.isArray(field.value)
    && field.value.some((task: unknown) =>
      isRecord(task)
      && typeof task.text === 'string'
      && task.text.trim() !== '',
    ),
  )
}

function hasNotes(event: Event): boolean {
  return getOptionalFields(event).some(field =>
    field.type === 'text'
    && typeof field.value === 'string'
    && field.value.trim() !== '',
  )
}

function hasAddressByCEP(event: Event): boolean {
  return getOptionalFields(event).some(field =>
    field.type === 'address'
    && isRecord(field.value)
    && typeof field.value.zipcode === 'string'
    && field.value.zipcode.trim() !== '',
  )
}

export interface EventFilterEvaluation {
  matches: boolean
  criteria: {
    date: boolean
    rating: boolean
    tasks: boolean
    notes: boolean
    addressByCEP: boolean
    categories: boolean
  }
  facts: {
    date: string
    rating: number | undefined
    hasTasks: boolean
    hasNotes: boolean
    hasAddressByCEP: boolean
    categories: string[]
  }
}

export function evaluateEventFilters(
  event: Event,
  filters: EventFilter,
): EventFilterEvaluation {
  const normalized = normalizeEventFilters(filters)
  const eventCategories = Array.isArray(event.categories) ? event.categories : []
  const facts = {
    date: event.startDate,
    rating: event.rating,
    hasTasks: hasTasks(event),
    hasNotes: hasNotes(event),
    hasAddressByCEP: hasAddressByCEP(event),
    categories: eventCategories,
  }

  const criteria = {
    date: !normalized.enabled
      || ((!normalized.startDate || event.startDate >= normalized.startDate)
        && (!normalized.endDate || event.startDate <= normalized.endDate)),
    rating: !normalized.enabled
      || normalized.hasRating === 0
      || (typeof event.rating === 'number' && event.rating >= normalized.hasRating),
    tasks: !normalized.enabled || !normalized.hasTasks || facts.hasTasks,
    notes: !normalized.enabled || !normalized.hasNotes || facts.hasNotes,
    addressByCEP: !normalized.enabled
      || !normalized.hasAddressByCEP
      || facts.hasAddressByCEP,
    categories: !normalized.enabled
      || normalized.selectedCategories.length === 0
      || eventCategories.some(category => normalized.selectedCategories.includes(category)),
  }

  return {
    matches: Object.values(criteria).every(Boolean),
    criteria,
    facts,
  }
}

export function matchesEventFilters(event: Event, filters: EventFilter): boolean {
  return evaluateEventFilters(event, filters).matches
}
