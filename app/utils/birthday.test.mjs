import assert from 'node:assert/strict'
import test from 'node:test'
import {
  birthdayDateForYear,
  birthdayHasYear,
  birthdayMonthDay,
  formatBirthday,
  normalizeBirthday,
  parseBirthday,
  serializeBirthday,
  validateBirthday,
} from './birthday.ts'
import { buildPersonPayload, hydratePerson } from './personPayload.ts'

test('accepts legacy full birthdays and preserves their year', () => {
  assert.deepEqual(parseBirthday('1994-04-30'), { year: 1994, month: 4, day: 30 })
  assert.equal(normalizeBirthday('1994-04-30'), '1994-04-30')
  assert.equal(formatBirthday('1994-04-30'), '30 / abr / 1994')
  assert.equal(birthdayHasYear('1994-04-30'), true)
})
test('accepts canonical birthdays without a year and never invents one', () => {
  assert.deepEqual(parseBirthday('--04-30'), { month: 4, day: 30 })
  assert.equal(normalizeBirthday('--04-30'), '--04-30')
  assert.equal(formatBirthday('--04-30'), '30/abr')
  assert.equal(serializeBirthday({ month: 4, day: 30 }), '--04-30')
  assert.equal(birthdayHasYear('--04-30'), false)
})

test('normalizes the legacy Google Contacts zero-year placeholder', () => {
  assert.equal(normalizeBirthday('0000-04-30'), '--04-30')
  assert.equal(formatBirthday('0000-04-30'), '30/abr')
})

test('keeps the Person payload on one field without inventing a year', () => {
  assert.equal(buildPersonPayload({ name: 'Ana', birthday: '--04-30' }).birthday, '--04-30')
  assert.equal(hydratePerson('person-1', { birthday: '1994-04-30' }).birthday, '1994-04-30')
  assert.equal(hydratePerson('person-2', { birthday: '0000-04-30' }).birthday, '--04-30')
})

test('accepts February 29 without a year', () => {
  assert.deepEqual(parseBirthday('--02-29'), { month: 2, day: 29 })
  assert.equal(validateBirthday('--02-29'), null)
})

test('validates February 29 against the supplied year', () => {
  assert.equal(validateBirthday('2024-02-29', { today: new Date('2026-01-01') }), null)
  assert.equal(validateBirthday('2025-02-29', { today: new Date('2026-01-01') }), 'Informe uma data de aniversário válida.')
})

test('rejects impossible calendar dates and unreasonable years', () => {
  assert.equal(parseBirthday('--04-31'), null)
  assert.equal(parseBirthday('2024-04-31'), null)
  assert.equal(parseBirthday('--13-01'), null)
  assert.equal(validateBirthday('0999-01-01', { today: new Date('2026-01-01') }), 'Informe um ano de nascimento válido.')
  assert.equal(validateBirthday('2027-01-01', { today: new Date('2026-01-01') }), 'Informe um ano de nascimento válido.')
})

test('compares complete and partial birthdays by the same month and day', () => {
  assert.deepEqual(birthdayMonthDay('1994-04-30'), birthdayMonthDay('--04-30'))
  assert.deepEqual(birthdayDateForYear('1994-04-30', 2026), birthdayDateForYear('--04-30', 2026))
})

test('does not create a non-existent February 29 occurrence in a non-leap year', () => {
  assert.equal(birthdayDateForYear('--02-29', 2025), null)
  assert.deepEqual(birthdayDateForYear('--02-29', 2024), new Date(2024, 1, 29))
})
