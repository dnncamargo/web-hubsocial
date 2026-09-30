import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildPersonPayload,
  getPersonDocumentPath,
  hydratePerson,
  validatePersonName,
} from './personPayload.ts'

const createdAt = new Date('2026-09-30T12:00:00.000Z')

test('requires a non-empty Person name', () => {
  assert.equal(validatePersonName(''), false)
  assert.equal(validatePersonName('   '), false)
  assert.equal(validatePersonName('Ana Silva'), true)
})

test('builds the canonical Person payload without a hydrated id', () => {
  const payload = buildPersonPayload({
    name: '  Ana Silva  ',
    phone: '11999999999',
    email: 'ana@example.com',
    birthday: '1990-04-12',
    favorite: true,
    contactFrequency: 'monthly',
    relationships: [' Cliente ', 'Cliente'],
    optionalFields: [{ id: 'note', type: 'text', label: 'Nota', value: 'Ligar' }],
    createdAt,
  })

  assert.equal(payload.name, 'Ana Silva')
  assert.equal(payload.phone, '11999999999')
  assert.equal(payload.email, 'ana@example.com')
  assert.equal(payload.birthday, '1990-04-12')
  assert.equal(payload.favorite, true)
  assert.equal(payload.contactFrequency, 'monthly')
  assert.deepEqual(payload.relationships, ['Cliente'])
  assert.deepEqual(payload.optionalFields, [
    { id: 'note', type: 'text', label: 'Nota', value: 'Ligar' },
  ])
  assert.equal(payload.createdAt, createdAt)
  assert.equal('id' in payload, false)
})

test('represents cleared optional values consistently for update', () => {
  const payload = buildPersonPayload({
    name: 'Ana Silva',
    phone: null,
    email: '',
    birthday: null,
    favorite: false,
    contactFrequency: null,
    relationships: [],
    optionalFields: [],
    createdAt,
  })

  assert.equal(payload.phone, '')
  assert.equal(payload.email, '')
  assert.equal(payload.birthday, '')
  assert.equal(payload.favorite, false)
  assert.equal(payload.contactFrequency, null)
  assert.equal(payload.relationships, null)
  assert.deepEqual(payload.optionalFields, [])
  assert.equal(payload.createdAt, createdAt)
})

test('hydrates legacy optional data with a safe id-bearing read model', () => {
  const person = hydratePerson('person-1', {
    name: 'Ana Silva',
    relationships: ['Cliente', ' Cliente ', ''],
    optionalFields: [{ id: 'field-1', type: 'text', label: 'Nota', value: 'Ligar' }],
    favorite: true,
    contactFrequency: 'weekly',
    createdAt,
  })

  assert.equal(person.id, 'person-1')
  assert.deepEqual(person.relationships, ['Cliente'])
  assert.deepEqual(person.optionalFields, [
    { id: 'field-1', type: 'text', label: 'Nota', value: 'Ligar' },
  ])
  assert.equal(person.phone, '')
  assert.equal(person.email, '')
  assert.equal(person.birthday, '')
  assert.equal(person.favorite, true)
  assert.equal(person.contactFrequency, 'weekly')
  assert.equal(person.createdAt, createdAt)
})

test('hydrates null or missing legacy relationships without crashing', () => {
  assert.equal(hydratePerson('person-null', { relationships: null }).relationships, null)
  assert.equal(hydratePerson('person-missing', {}).relationships, null)
  assert.deepEqual(hydratePerson('person-empty', { relationships: [] }).relationships, null)
})

test('uses the canonical Person document path for update and delete consumers', () => {
  assert.equal(
    getPersonDocumentPath('user-1', 'person-1'),
    'users/user-1/people-directory/person-1',
  )
})

test('deleting a Person payload does not rewrite a historical Event reference', () => {
  const historicalEvent = { id: 'event-1', personIds: ['person-1'], title: 'Contato' }
  const personPayload = buildPersonPayload({ name: 'Outra pessoa' })

  assert.deepEqual(historicalEvent, {
    id: 'event-1',
    personIds: ['person-1'],
    title: 'Contato',
  })
  assert.equal('id' in personPayload, false)
})
