import assert from 'node:assert/strict'
import test from 'node:test'
import {
  matchesPersonFilters,
  normalizePersonFilters,
} from './personFilters.ts'

const availableRelationships = ['Cliente', 'Família', 'Amigo']

const basePerson = {
  id: 'person-1',
  name: 'Pessoa',
  phone: '',
  email: '',
  birthday: '',
  favorite: false,
  relationships: null,
  contactFrequency: null,
  optionalFields: [],
}

const filters = (overrides = {}) => ({
  enabled: true,
  hasPhone: false,
  hasEmail: false,
  hasBirthday: false,
  hasAddressByCep: false,
  hasNote: false,
  isFavorite: false,
  hasContactFrequency: false,
  selectedRelationships: [],
  ...overrides,
})

test('no active criterion accepts a person without a relationship', () => {
  assert.equal(matchesPersonFilters(basePerson, filters(), availableRelationships), true)
})

test('legacy selection of every relationship is unrestricted', () => {
  assert.equal(
    matchesPersonFilters(
      basePerson,
      filters({ selectedRelationships: availableRelationships }),
      availableRelationships,
    ),
    true,
  )
  assert.deepEqual(
    normalizePersonFilters(
      filters({ selectedRelationships: availableRelationships }),
      availableRelationships,
    ).selectedRelationships,
    [],
  )
})

test('a relationship subset restricts matching people', () => {
  assert.equal(
    matchesPersonFilters(
      { ...basePerson, relationships: ['Cliente'] },
      filters({ selectedRelationships: ['Cliente'] }),
      availableRelationships,
    ),
    true,
  )
  assert.equal(
    matchesPersonFilters(basePerson, filters({ selectedRelationships: ['Cliente'] }), availableRelationships),
    false,
  )
})

test('an incompatible relationship is rejected', () => {
  assert.equal(
    matchesPersonFilters(
      { ...basePerson, relationships: ['Família'] },
      filters({ selectedRelationships: ['Cliente'] }),
      availableRelationships,
    ),
    false,
  )
})

test('hasNote false does not restrict people', () => {
  assert.equal(matchesPersonFilters(basePerson, filters({ hasNote: false })), true)
})

test('hasNote true detects legacy and optional text content', () => {
  assert.equal(
    matchesPersonFilters({ ...basePerson, note: 'Observação' }, filters({ hasNote: true })),
    true,
  )
  assert.equal(
    matchesPersonFilters({
      ...basePerson,
      optionalFields: [{ id: 'note', type: 'text', label: 'Nota', value: 'Texto' }],
    }, filters({ hasNote: true })),
    true,
  )
})

test('hasAddressByCep true detects a non-empty zipcode', () => {
  assert.equal(
    matchesPersonFilters({
      ...basePerson,
      optionalFields: [{
        id: 'address',
        type: 'address',
        label: 'Endereço',
        value: { zipcode: '01000-000' },
      }],
    }, filters({ hasAddressByCep: true })),
    true,
  )
})

test('disabled filters ignore every criterion', () => {
  assert.equal(
    matchesPersonFilters(basePerson, filters({
      enabled: false,
      hasPhone: true,
      hasEmail: true,
      hasBirthday: true,
      hasAddressByCep: true,
      hasNote: true,
      isFavorite: true,
      hasContactFrequency: true,
      selectedRelationships: ['Cliente'],
    }), availableRelationships),
    true,
  )
})
