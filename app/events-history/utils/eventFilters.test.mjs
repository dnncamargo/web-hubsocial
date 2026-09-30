import assert from 'node:assert/strict'
import test from 'node:test'
import {
  matchesEventFilters,
  normalizeEventFilters,
} from './eventFilters.ts'

const baseEvent = {
  id: 'event-1',
  title: 'Evento futuro',
  allDay: true,
  startDate: '2026-10-03',
  endDate: '2026-10-03',
  status: 0,
  rating: undefined,
  categories: [],
  optionalFields: [],
}

const filters = (overrides = {}) => ({
  enabled: true,
  startDate: '',
  endDate: '',
  hasRating: 0,
  hasTasks: false,
  hasNotes: false,
  hasAddressByCEP: false,
  selectedCategories: [],
  ...overrides,
})

const availableCategories = ['work', 'health', 'family']

test('only start date active accepts future events regardless of optional fields', () => {
  assert.equal(matchesEventFilters(baseEvent, filters({ startDate: '2026-10-01' })), true)
  assert.equal(matchesEventFilters({
    ...baseEvent,
    optionalFields: [{ type: 'text', value: '', id: 'note', label: 'Nota' }],
  }, filters({ startDate: '2026-10-01' })), true)
})

test('hasNotes false does not reject an event without notes', () => {
  assert.equal(matchesEventFilters(baseEvent, filters()), true)
  assert.equal(matchesEventFilters(baseEvent, filters({ hasNotes: false })), true)
})

test('hasTasks false does not reject an event without tasks', () => {
  assert.equal(matchesEventFilters(baseEvent, filters({ hasTasks: false })), true)
})

test('hasAddressByCEP false does not reject an event without a CEP', () => {
  assert.equal(matchesEventFilters(baseEvent, filters({ hasAddressByCEP: false })), true)
})

test('selectedCategories empty does not activate the category criterion', () => {
  assert.equal(matchesEventFilters(baseEvent, filters({ selectedCategories: [] })), true)
})

test('hasRating zero does not activate the rating criterion for an absent rating', () => {
  assert.equal(matchesEventFilters(baseEvent, filters({ hasRating: 0 })), true)
})

test('disabled filters ignore every criterion', () => {
  assert.equal(matchesEventFilters(baseEvent, filters({
    enabled: false,
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    hasRating: 5,
    hasTasks: true,
    hasNotes: true,
    hasAddressByCEP: true,
    selectedCategories: ['missing'],
  })), true)
})

test('active optional criteria use their optional-field representations', () => {
  const completeEvent = {
    ...baseEvent,
    rating: 4,
    categories: ['work'],
    optionalFields: [
      { type: 'text', value: 'Nota', id: 'note', label: 'Nota' },
      { type: 'tasks', value: [{ text: 'Tarefa', done: false }], id: 'tasks', label: 'Tarefas' },
      { type: 'address', value: { zipcode: '01000-000' }, id: 'address', label: 'Endereço' },
    ],
  }

  assert.equal(matchesEventFilters(completeEvent, filters({
    hasRating: 4,
    hasTasks: true,
    hasNotes: true,
    hasAddressByCEP: true,
    selectedCategories: ['work'],
  })), true)
})

test('malformed persisted false values do not become active truthy filters', () => {
  assert.equal(matchesEventFilters(baseEvent, {
    ...filters({ startDate: '2026-10-01' }),
    hasTasks: 'false',
    hasNotes: 'false',
    hasAddressByCEP: 'false',
  }), true)
})

test('empty selected categories pass uncategorized events', () => {
  assert.equal(matchesEventFilters(baseEvent, filters({ selectedCategories: [] }), availableCategories), true)
})

test('empty selected categories pass categorized events', () => {
  assert.equal(matchesEventFilters({ ...baseEvent, categories: ['work'] }, filters({ selectedCategories: [] }), availableCategories), true)
})

test('all available categories pass uncategorized events', () => {
  assert.equal(matchesEventFilters(baseEvent, filters({ selectedCategories: availableCategories }), availableCategories), true)
})

test('all available categories pass categorized events', () => {
  assert.equal(matchesEventFilters({ ...baseEvent, categories: ['work'] }, filters({ selectedCategories: availableCategories }), availableCategories), true)
})

test('a proper category subset rejects uncategorized events', () => {
  assert.equal(matchesEventFilters(baseEvent, filters({ selectedCategories: ['work'] }), availableCategories), false)
})

test('a proper category subset passes a matching categorized event', () => {
  assert.equal(matchesEventFilters({ ...baseEvent, categories: ['work'] }, filters({ selectedCategories: ['work'] }), availableCategories), true)
})

test('a proper category subset rejects a non-matching categorized event', () => {
  assert.equal(matchesEventFilters({ ...baseEvent, categories: ['family'] }, filters({ selectedCategories: ['work'] }), availableCategories), false)
})

test('legacy all-category persisted state normalizes to unrestricted', () => {
  assert.deepEqual(
    normalizeEventFilters(
      { ...filters({ selectedCategories: ['work', 'health', 'family'] }) },
      availableCategories,
    ).selectedCategories,
    [],
  )
})

test('category equality is value-based rather than length-based', () => {
  assert.deepEqual(
    normalizeEventFilters(
      { ...filters({ selectedCategories: ['work', 'health', 'unknown'] }) },
      availableCategories,
    ).selectedCategories,
    ['work', 'health'],
  )
})

test('start date plus legacy all-category state passes future events regardless of category', () => {
  const legacyFilters = filters({
    startDate: '2026-05-01',
    selectedCategories: ['work', 'health', 'family'],
  })

  assert.equal(matchesEventFilters(baseEvent, legacyFilters, availableCategories), true)
  assert.equal(matchesEventFilters({ ...baseEvent, categories: ['work'] }, legacyFilters, availableCategories), true)
})
