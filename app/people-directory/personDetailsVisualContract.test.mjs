import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const appRoot = fileURLToPath(new URL('../', import.meta.url))
const readAppFile = (...parts) => readFileSync(join(appRoot, ...parts), 'utf8')

const personDetails = readAppFile('people-directory', '[id]', 'page.tsx')
const personDetailsCss = readAppFile('people-directory', 'PersonDetails.module.css')
const eventDetails = readAppFile('events-history', '[id]', 'page.tsx')
const eventDetailsCss = readAppFile('events-history', '[id]', 'EventDetails.module.css')

test('Person Details reuses the Event Details header grammar', () => {
  assert.match(personDetails, /EventDetails\.module\.css/)
  assert.match(personDetails, /<p className=\{detailStyles\.eyebrow\}>Pessoa<\/p>/)
  assert.match(personDetails, /<h1 className=\{detailStyles\.title\}>\{person\.name\}<\/h1>/)

  const editIndex = personDetails.indexOf('className={detailStyles.editButton}')
  const backIndex = personDetails.indexOf('className={detailStyles.backButton}', editIndex)
  assert.equal(editIndex >= 0 && editIndex < backIndex, true)
  assert.doesNotMatch(personDetails, /Registro de pessoa/)
  assert.match(eventDetails, /className=\{styles\.eyebrow\}>Evento<\/p>/)
  assert.match(eventDetailsCss, /\.eyebrow\s*\{/)
})

test('Person Details uses the canonical two-column panel layout', () => {
  assert.match(personDetails, /<div className=\{detailStyles\.layout\}>/)
  assert.equal((personDetails.match(/className=\{detailStyles\.column\}/g) ?? []).length, 2)
  assert.match(personDetails, /<aside className=\{detailStyles\.column\}>/)
  assert.match(personDetails, /className=\{detailStyles\.sectionHeader\}/)
  assert.match(personDetails, /className=\{detailStyles\.definitionList\}/)
  assert.match(personDetails, /className=\{detailStyles\.definitionRow\}/)
  assert.match(eventDetailsCss, /\.layout\s*\{[\s\S]*?grid-template-columns:/)
})

test('Person Details keeps contact, context, optional fields, and events as panels', () => {
  for (const label of ['person-contact-title', 'person-context-title', 'person-optional-title', 'person-events-title']) {
    assert.match(personDetails, new RegExp(label))
  }

  assert.match(personDetails, /<aside className=\{detailStyles\.column\}>[\s\S]*?person-events-title/)
  assert.match(personDetails, /className=\{detailStyles\.optionalItem\}/)
  assert.match(personDetails, /className=\{detailStyles\.actions\}/)
  assert.match(personDetails, /className=\{detailStyles\.calendarButton\}/)
  assert.match(personDetails, /initialPersonId=\{personId\}/)
  assert.doesNotMatch(personDetails, /styles\.actionRow/)
})

test('Person Details preserves responsive and token-based styling without duplicating Event panels', () => {
  assert.match(personDetailsCss, /@media \(max-width: 719px\)/)
  assert.match(eventDetailsCss, /@media \(min-width: 820px\)/)
  assert.match(personDetailsCss, /var\(--color-people-strong\)/)
  assert.doesNotMatch(personDetailsCss, /#[0-9a-f]{3,8}\b|rgba?\(/i)
})
