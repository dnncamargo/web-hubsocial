import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const peopleComponentsRoot = fileURLToPath(new URL('./components/', import.meta.url))
const eventsComponentsRoot = fileURLToPath(new URL('../events-history/components/', import.meta.url))
const readPeopleFile = (name) => readFileSync(join(peopleComponentsRoot, name), 'utf8')
const readEventsFile = (name) => readFileSync(join(eventsComponentsRoot, name), 'utf8')

const personCard = readPeopleFile('PersonCard.tsx')
const personCardCss = readPeopleFile('PersonCard.module.css')
const eventCard = readEventsFile('EventCard.tsx')
const eventCardCss = readEventsFile('EventCard.module.css')

test('PersonCard has one compact footer divider with relationships left and edit right', () => {
  assert.equal((personCard.match(/<footer/g) ?? []).length, 1)
  assert.match(personCard, /<footer className=\{styles\.footer\}>[\s\S]*?<div className=\{styles\.relationships\}>[\s\S]*?<button[\s\S]*?styles\.editButton/)
  assert.match(personCardCss, /\.footer\s*\{[\s\S]*?justify-content:\s*space-between[\s\S]*?border-top:\s*1px\s+solid\s+var\(--color-border\)/)
  assert.equal((personCardCss.match(/border-top:/g) ?? []).length, 1)
  assert.doesNotMatch(personCard, /titleButton|bodyButton|actionGroup/)
  assert.doesNotMatch(personCardCss, /titleButton|bodyButton|actionGroup/)
})

test('PersonCard places favorite in the header and protects it from navigation', () => {
  assert.match(personCard, /<header className=\{styles\.header\}>[\s\S]*?<h2 className=\{styles\.title\}>[\s\S]*?<button[\s\S]*?styles\.iconButton/)
  assert.match(personCard, /styles\.iconButton[\s\S]*?onClick=\{\(event\) => \{[\s\S]*?event\.stopPropagation\(\)[\s\S]*?onToggleFavorite/)
})

test('PersonCard opens details from the whole card and isolates edit', () => {
  assert.match(personCard, /<article[\s\S]*?role="link"[\s\S]*?tabIndex=\{0\}/)
  assert.match(personCard, /const openPerson = \(\) => navigate\(`\/people-directory\/\$\{person\.id\}`\)/)
  assert.match(personCard, /onClick=\{openPerson\}/)
  assert.match(personCard, /onKeyDown=\{\(event\) => \{[\s\S]*?event\.key === 'Enter'[\s\S]*?openPerson\(\)/)
  assert.match(personCard, /styles\.editButton[\s\S]*?onClick=\{\(event\) => \{[\s\S]*?event\.stopPropagation\(\)[\s\S]*?onEditPerson\(person\)/)
  assert.doesNotMatch(personCard, /Pencil|SquarePen/)
})

test('PersonCard and EventCard share the navigable header-meta-footer structure', () => {
  for (const source of [personCard, eventCard]) {
    assert.match(source, /<article[\s\S]*?role="link"[\s\S]*?tabIndex=\{0\}/)
    assert.match(source, /<header className=\{styles\.header\}>/)
    assert.match(source, /<footer className=\{styles\.footer\}>/)
  }

  assert.match(personCard, /<div className=\{styles\.metaList\}>/)
  assert.match(eventCard, /<div className=\{styles\.metaList\}>/)
  assert.match(personCardCss, /\.card\s*\{[\s\S]*?gap:\s*var\(--space-3\)[\s\S]*?padding:\s*var\(--space-4\)/)
  assert.match(eventCardCss, /\.card\s*\{[\s\S]*?gap:\s*var\(--space-3\)[\s\S]*?padding:\s*var\(--space-4\)/)
})
