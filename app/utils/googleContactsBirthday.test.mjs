import assert from 'node:assert/strict'
import test from 'node:test'
import { parseGoogleContact } from './googleContacts.ts'

test('imports a complete Google birthday with its year', () => {
  const contact = parseGoogleContact({
    resourceName: 'people/1',
    names: [{ displayName: 'Ana' }],
    birthdays: [{ date: { year: 1994, month: 4, day: 30 } }],
  })

  assert.equal(contact.birthday, '1994-04-30')
})
test('imports a Google birthday without inventing a year', () => {
  const contact = parseGoogleContact({
    resourceName: 'people/2',
    names: [{ displayName: 'Bia' }],
    birthdays: [{ date: { month: 4, day: 30 } }],
  })

  assert.equal(contact.birthday, '--04-30')
})

test('does not persist an invalid or unknown Google birthday', () => {
  const contact = parseGoogleContact({
    resourceName: 'people/3',
    names: [{ displayName: 'Caio' }],
    birthdays: [{ date: { year: 2025, month: 4, day: 31 } }],
  })

  assert.equal(contact.birthday, undefined)
})
