import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const appRoot = fileURLToPath(new URL('../', import.meta.url))
const readAppFile = (...parts) => readFileSync(join(appRoot, ...parts), 'utf8')

const editorFields = readAppFile('people-directory', 'components', 'PersonEditorFields.tsx')
const personDetails = readAppFile('people-directory', '[id]', 'page.tsx')
const peopleDirectory = readAppFile('people-directory', 'page.tsx')
const personFilters = readAppFile('people-directory', 'utils', 'personFilters.ts')
const suggestionPanel = readAppFile('dashboard', 'components', 'SuggestionPanel.tsx')
const googleContacts = readAppFile('utils', 'googleContacts.ts')

test('Person editor exposes day, month, and optional year controls', () => {
  assert.match(editorFields, /Dia do aniversário/)
  assert.match(editorFields, /Mês do aniversário/)
  assert.match(editorFields, /Ano do aniversário, opcional/)
  assert.doesNotMatch(editorFields, /type="date"/)
})
test('Person Details formats the canonical birthday instead of leaking the wire value', () => {
  assert.match(personDetails, /formatBirthday\(person\.birthday\)/)
  assert.match(personDetails, /\{formattedBirthday && \(/)
})

test('People filters and Dashboard use the birthday helper', () => {
  assert.match(personFilters, /parseBirthday\(person\.birthday\)/)
  assert.match(peopleDirectory, /evaluatePersonFilters\(person, filters, availableRelationships\)/)
  assert.match(suggestionPanel, /birthdayDateForYear\(person\.birthday, now\.getFullYear\(\)\)/)
  assert.doesNotMatch(suggestionPanel, /parseISO\(person\.birthday\)/)
})

test('Google import serializes birthdays through the canonical helper', () => {
  assert.match(googleContacts, /serializeBirthday\(/)
  assert.doesNotMatch(googleContacts, /'0000'/)
})
