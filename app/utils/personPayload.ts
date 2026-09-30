import type { Timestamp } from 'firebase/firestore'
import type { OptionalField } from '../types/optionalFields'
import type { Person } from './interfaces'

export type PersonDocumentPayload = Omit<Person, 'id'> & {
  name: string
  phone: string
  email: string
  birthday: string
  favorite: boolean
  relationships: string[] | null
  contactFrequency: Person['contactFrequency']
  optionalFields: OptionalField[]
  createdAt: Date | Timestamp
}

export interface PersonPayloadInput {
  name: string
  phone?: string | null
  email?: string | null
  birthday?: string | null
  favorite?: boolean | null
  contactFrequency?: Person['contactFrequency']
  relationships?: string[] | null
  optionalFields?: OptionalField[] | null
  createdAt?: Date | Timestamp
}

export function getPersonDocumentPath(uid: string, personId: string): string {
  return `users/${uid}/people-directory/${personId}`
}

export function validatePersonName(name: string): boolean {
  return name.trim().length > 0
}

function normalizeRelationships(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null

  const relationships = value.reduce<string[]>((result, item) => {
    if (typeof item !== 'string') return result
    const normalized = item.trim()
    if (normalized && !result.includes(normalized)) result.push(normalized)
    return result
  }, [])

  return relationships.length > 0 ? relationships : null
}

export function buildPersonPayload(input: PersonPayloadInput): PersonDocumentPayload {
  return {
    name: input.name.trim(),
    phone: input.phone ?? '',
    email: input.email ?? '',
    birthday: input.birthday ?? '',
    favorite: input.favorite ?? false,
    contactFrequency: input.contactFrequency ?? null,
    relationships: normalizeRelationships(input.relationships),
    optionalFields: input.optionalFields ?? [],
    createdAt: input.createdAt ?? new Date(),
  }
}

export function hydratePerson(id: string, data: Record<string, unknown>): Person {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    phone: typeof data.phone === 'string' ? data.phone : '',
    email: typeof data.email === 'string' ? data.email : '',
    birthday: typeof data.birthday === 'string' ? data.birthday : '',
    note: typeof data.note === 'string' ? data.note : undefined,
    favorite: typeof data.favorite === 'boolean' ? data.favorite : false,
    relationships: normalizeRelationships(data.relationships),
    contactFrequency: data.contactFrequency === 'weekly'
      || data.contactFrequency === 'biweekly'
      || data.contactFrequency === 'monthly'
      || data.contactFrequency === 'quarterly'
      ? data.contactFrequency
      : null,
    optionalFields: Array.isArray(data.optionalFields)
      ? data.optionalFields as OptionalField[]
      : [],
    createdAt: data.createdAt as Person['createdAt'],
  }
}
