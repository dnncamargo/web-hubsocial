import type { OptionalField } from '../../types/optionalFields'
import type { Person } from '../../utils/interfaces'
import { parseBirthday } from '../../utils/birthday.ts'
import { normalizeSelectableSelection } from '../../utils/selectableStringSetting.ts'

export interface PersonFilter {
  enabled: boolean
  hasPhone: boolean
  hasEmail: boolean
  hasBirthday: boolean
  hasAddressByCep: boolean
  hasNote: boolean
  isFavorite: boolean
  hasContactFrequency: boolean
  selectedRelationships: string[]
}

export const defaultPersonFilters: PersonFilter = {
  enabled: true,
  hasPhone: false,
  hasEmail: false,
  hasBirthday: false,
  hasAddressByCep: false,
  hasNote: false,
  isFavorite: false,
  hasContactFrequency: false,
  selectedRelationships: [],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getOptionalFields(person: Person): OptionalField[] {
  return Array.isArray(person.optionalFields) ? person.optionalFields : []
}

function hasNote(person: Person): boolean {
  const legacyNote = typeof person.note === 'string' && person.note.trim() !== ''
  const optionalText = getOptionalFields(person).some(field =>
    field.type === 'text'
    && typeof field.value === 'string'
    && field.value.trim() !== '',
  )

  return legacyNote || optionalText
}

function hasAddressByCep(person: Person): boolean {
  return getOptionalFields(person).some(field =>
    field.type === 'address'
    && isRecord(field.value)
    && typeof field.value.zipcode === 'string'
    && field.value.zipcode.trim() !== '',
  )
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizePersonFilters(
  value: unknown,
  availableRelationships?: readonly string[],
): PersonFilter {
  const data = isRecord(value) ? value : {}

  return {
    enabled: normalizeBoolean(data.enabled, defaultPersonFilters.enabled),
    hasPhone: normalizeBoolean(data.hasPhone, defaultPersonFilters.hasPhone),
    hasEmail: normalizeBoolean(data.hasEmail, defaultPersonFilters.hasEmail),
    hasBirthday: normalizeBoolean(data.hasBirthday, defaultPersonFilters.hasBirthday),
    hasAddressByCep: normalizeBoolean(data.hasAddressByCep, defaultPersonFilters.hasAddressByCep),
    hasNote: normalizeBoolean(data.hasNote, defaultPersonFilters.hasNote),
    isFavorite: normalizeBoolean(data.isFavorite, defaultPersonFilters.isFavorite),
    hasContactFrequency: normalizeBoolean(
      data.hasContactFrequency,
      defaultPersonFilters.hasContactFrequency,
    ),
    selectedRelationships: normalizeSelectableSelection(
      data.selectedRelationships,
      availableRelationships,
    ),
  }
}

export interface PersonFilterEvaluation {
  matches: boolean
  criteria: {
    phone: boolean
    email: boolean
    birthday: boolean
    addressByCep: boolean
    note: boolean
    favorite: boolean
    contactFrequency: boolean
    relationships: boolean
  }
  facts: {
    hasPhone: boolean
    hasEmail: boolean
    hasBirthday: boolean
    hasAddressByCep: boolean
    hasNote: boolean
    isFavorite: boolean
    hasContactFrequency: boolean
    relationships: string[]
  }
}

export function evaluatePersonFilters(
  person: Person,
  filters: PersonFilter,
  availableRelationships?: readonly string[],
): PersonFilterEvaluation {
  const normalized = normalizePersonFilters(filters, availableRelationships)
  const facts = {
    hasPhone: Boolean(person.phone),
    hasEmail: Boolean(person.email),
    hasBirthday: Boolean(parseBirthday(person.birthday)),
    hasAddressByCep: hasAddressByCep(person),
    hasNote: hasNote(person),
    isFavorite: Boolean(person.favorite),
    hasContactFrequency: Boolean(person.contactFrequency),
    relationships: Array.isArray(person.relationships) ? person.relationships : [],
  }
  const criteria = {
    phone: !normalized.enabled || !normalized.hasPhone || facts.hasPhone,
    email: !normalized.enabled || !normalized.hasEmail || facts.hasEmail,
    birthday: !normalized.enabled || !normalized.hasBirthday || facts.hasBirthday,
    addressByCep: !normalized.enabled
      || !normalized.hasAddressByCep
      || facts.hasAddressByCep,
    note: !normalized.enabled || !normalized.hasNote || facts.hasNote,
    favorite: !normalized.enabled || !normalized.isFavorite || facts.isFavorite,
    contactFrequency: !normalized.enabled
      || !normalized.hasContactFrequency
      || facts.hasContactFrequency,
    relationships: !normalized.enabled
      || normalized.selectedRelationships.length === 0
      || facts.relationships.some(relationship =>
        normalized.selectedRelationships.includes(relationship)),
  }

  return {
    matches: Object.values(criteria).every(Boolean),
    criteria,
    facts,
  }
}

export function matchesPersonFilters(
  person: Person,
  filters: PersonFilter,
  availableRelationships?: readonly string[],
): boolean {
  return evaluatePersonFilters(person, filters, availableRelationships).matches
}
