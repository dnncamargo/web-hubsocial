import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildEventPayload,
  buildEventUpdate,
  getEventDocumentPath,
} from './eventPayload.ts'

const createdAt = new Date('2026-09-30T12:00:00.000Z')

const baseInput = {
  title: 'Consulta',
  location: 'Clínica',
  startDate: '2026-10-04',
  endDate: '2026-10-04',
  allDay: false,
  startTime: '09:00',
  endTime: '10:00',
  timeZone: 'America/Sao_Paulo',
  personIds: ['person-1'],
  categories: ['saúde'],
  optionalFields: [{ id: 'note', type: 'text', label: 'Nota', value: 'Levar exames' }],
  actionPlanning: { day: '2026-10-04' },
  automation: { match: 'all', rules: [] },
  status: 1,
  rating: 4,
  createdAt,
}

test('builds the canonical timed Event payload for create/read projections', () => {
  const payload = buildEventPayload(baseInput)

  assert.equal(payload.title, 'Consulta')
  assert.equal(payload.startTime, '09:00')
  assert.equal(payload.endTime, '10:00')
  assert.deepEqual(payload.personIds, ['person-1'])
  assert.deepEqual(payload.categories, ['saúde'])
  assert.deepEqual(payload.optionalFields, baseInput.optionalFields)
  assert.deepEqual(payload.actionPlanning, { day: '2026-10-04' })
  assert.deepEqual(payload.automation, { match: 'all', rules: [] })
  assert.equal(payload.status, 1)
  assert.equal(payload.rating, 4)
  assert.equal(payload.createdAt, createdAt)
})

test('uses the canonical Event document path for update and delete consumers', () => {
  assert.equal(
    getEventDocumentPath('user-1', 'event-1'),
    'users/user-1/events-history/event-1',
  )
})

test('omits time fields from a canonical all-day create payload', () => {
  const payload = buildEventPayload({
    ...baseInput,
    allDay: true,
    startTime: '',
    endTime: '',
  })

  assert.equal('startTime' in payload, false)
  assert.equal('endTime' in payload, false)
  assert.equal(payload.allDay, true)
})

test('marks stale time fields for deletion when updating to all-day', () => {
  const update = buildEventUpdate({
    ...baseInput,
    allDay: true,
    startTime: '',
    endTime: '',
  })

  assert.equal(update.startTime?._methodName, 'deleteField')
  assert.equal(update.endTime?._methodName, 'deleteField')
  assert.equal(update.status, 1)
  assert.equal(update.rating, 4)
  assert.equal(update.createdAt, createdAt)
})

test('keeps timed fields in a timed update', () => {
  const update = buildEventUpdate(baseInput)

  assert.equal(update.startTime, '09:00')
  assert.equal(update.endTime, '10:00')
})
