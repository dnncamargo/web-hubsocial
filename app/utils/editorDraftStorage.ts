import type { ActionPlanning } from '../types/actions'
import type { AutomationRuleSet } from '../types/automation'
import type { OptionalField } from '../types/optionalFields'
import type { Person } from './interfaces'

export type EditorDraftEntity = 'event' | 'person'
export type EditorDraftOperation = 'add' | 'edit'

export interface EditorDraftScope {
  uid: string | null | undefined
  entity: EditorDraftEntity
  operation: EditorDraftOperation
  entityId?: string
  context?: string
}

export interface EventEditorDraft {
  title: string
  location: string
  allDay: boolean
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  timeZone: string
  categories: string[]
  personIds: string[]
  optionalFields: OptionalField[]
  actionPlanning: ActionPlanning
  automation: AutomationRuleSet
  showMore: boolean
}

export interface PersonEditorDraft {
  name: string
  phone: string
  email: string
  birthday: string
  favorite: boolean
  contactFrequency: Person['contactFrequency']
  relationships: string[]
  optionalFields: OptionalField[]
  showMore: boolean
}

export function getEditorDraftKey(scope: EditorDraftScope): string | null {
  if (!scope.uid) return null
  if (scope.operation === 'edit' && !scope.entityId) return null

  const parts = [
    'draft',
    scope.uid,
    scope.entity,
    scope.operation,
    scope.entityId,
    scope.context,
  ].filter((part): part is string => Boolean(part))

  return parts.map((part) => encodeURIComponent(part)).join(':')
}

export function readEditorDraft<T>(
  scope: EditorDraftScope,
  isValid?: (value: unknown) => value is T,
): T | null {
  const key = getEditorDraftKey(scope)
  if (!key || typeof localStorage === 'undefined') return null

  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (isValid && !isValid(parsed)) {
      localStorage.removeItem(key)
      return null
    }

    return parsed as T
  } catch {
    try {
      localStorage.removeItem(key)
    } catch {
      // Ignore unavailable or corrupted storage.
    }
    return null
  }
}

export function writeEditorDraft<T>(scope: EditorDraftScope, draft: T): boolean {
  const key = getEditorDraftKey(scope)
  if (!key || typeof localStorage === 'undefined') return false

  try {
    localStorage.setItem(key, JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

export function clearEditorDraft(scope: EditorDraftScope): void {
  const key = getEditorDraftKey(scope)
  if (!key || typeof localStorage === 'undefined') return

  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore unavailable storage.
  }
}

export function isEventEditorDraft(value: unknown): value is EventEditorDraft {
  if (!isRecord(value)) return false

  return typeof value.title === 'string'
    && typeof value.location === 'string'
    && typeof value.allDay === 'boolean'
    && typeof value.startDate === 'string'
    && typeof value.endDate === 'string'
    && typeof value.startTime === 'string'
    && typeof value.endTime === 'string'
    && typeof value.timeZone === 'string'
    && isStringArray(value.categories)
    && isStringArray(value.personIds)
    && Array.isArray(value.optionalFields)
    && isRecord(value.actionPlanning)
    && isRecord(value.automation)
    && typeof value.showMore === 'boolean'
}

export function isPersonEditorDraft(value: unknown): value is PersonEditorDraft {
  if (!isRecord(value)) return false

  return typeof value.name === 'string'
    && typeof value.phone === 'string'
    && typeof value.email === 'string'
    && typeof value.birthday === 'string'
    && typeof value.favorite === 'boolean'
    && (value.contactFrequency === null
      || value.contactFrequency === undefined
      || value.contactFrequency === 'weekly'
      || value.contactFrequency === 'biweekly'
      || value.contactFrequency === 'monthly'
      || value.contactFrequency === 'quarterly')
    && isStringArray(value.relationships)
    && Array.isArray(value.optionalFields)
    && typeof value.showMore === 'boolean'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}
