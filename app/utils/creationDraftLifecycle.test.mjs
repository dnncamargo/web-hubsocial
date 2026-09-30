import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import {
  initialCreationDraftLifecycleState,
  reduceCreationDraftLifecycle,
} from './creationDraftLifecycle.ts'

const appRoot = fileURLToPath(new URL('../', import.meta.url))
const readAppFile = (...parts) => readFileSync(join(appRoot, ...parts), 'utf8')

const eventModal = readAppFile('events-history', 'components', 'AddEventModal.tsx')
const eventList = readAppFile('events-history', 'page.tsx')
const personModal = readAppFile('people-directory', 'components', 'AddPersonModal.tsx')
const peopleList = readAppFile('people-directory', 'page.tsx')
const personDetails = readAppFile('people-directory', '[id]', 'page.tsx')
const lifecycle = readAppFile('utils', 'creationDraftLifecycle.ts')

function reduce(state, type) {
  return reduceCreationDraftLifecycle(state, { type })
}

test('backdrop dismissal keeps the mounted draft while cancel/save discard it', () => {
  const opened = reduce(initialCreationDraftLifecycleState, 'open')
  const dismissed = reduce(opened, 'dismiss')
  const cancelled = reduce(dismissed, 'discard')

  assert.equal(opened.hasMounted, true)
  assert.equal(dismissed.isOpen, false)
  assert.equal(dismissed.revision, opened.revision)
  assert.equal(cancelled.isOpen, false)
  assert.equal(cancelled.hasMounted, true)
  assert.equal(cancelled.revision, opened.revision + 1)
})

test('creation lifecycle is in-memory and has no persistence boundary', () => {
  assert.doesNotMatch(lifecycle, /localStorage|sessionStorage|Firestore|setDoc|addDoc/)
})

test('event creation separates dismiss, cancel and successful save', () => {
  assert.ok(eventModal.includes('onDismiss: () => void'))
  assert.ok(eventModal.includes('onCancel: () => void'))
  assert.ok(eventModal.includes('onSaved: () => void'))
  assert.match(eventModal, /event\.target !== event\.currentTarget/)
  assert.ok(eventModal.includes('onClick={handleCancel}'))
  assert.ok(eventModal.includes('onClick={handleBackdropClick}'))
  assert.match(eventModal, /onAdded\(\)\s*\n\s*onSaved\(\)/)
  assert.doesNotMatch(eventModal, /if \(!isOpen\)\s*\{\s*resetOptionalFields\(\)/)
  assert.ok(eventList.includes('key={addEventDraft.revision}'))
  assert.ok(eventList.includes('onDismiss={dismissAddEventModal}'))
  assert.ok(eventList.includes('onCancel={dismissAddEventModal}'))
})

test('person creation preserves composite form state across dismiss and resets only on discard', () => {
  assert.ok(personModal.includes('onDismiss: () => void'))
  assert.ok(personModal.includes('onCancel: () => void'))
  assert.ok(personModal.includes('onSaved: () => void'))
  assert.match(personModal, /event\.target !== event\.currentTarget/)
  assert.ok(personModal.includes('onClick={handleCancel}'))
  assert.ok(personModal.includes('onClick={handleBackdropClick}'))
  assert.match(personModal, /await onAdded\(\)\s*;\s*onSaved\(\)/)
  assert.doesNotMatch(personModal, /if \(!isOpen\)\s*resetOptionalFields\(\)/)
  assert.ok(peopleList.includes('key={addPersonDraft.revision}'))
  assert.ok(peopleList.includes('onDismiss={dismissAddPersonModal}'))
  assert.ok(peopleList.includes('onCancel={dismissAddPersonModal}'))
  assert.ok(personDetails.includes('initialPersonId={personId}'))
})

test('person-details event draft is scoped by person context', () => {
  assert.ok(personDetails.includes("key={`${personId ?? 'unknown'}-${addEventDraft.revision}`}"))
  assert.ok(personDetails.includes('onSaved={discardAddEventDraft}'))
  assert.ok(personDetails.includes('onAdded={() => { void fetchEvents(); }}'))
})
