import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import {
  clearEditorDraft,
  getEditorDraftKey,
  readEditorDraft,
  writeEditorDraft,
} from './editorDraftStorage.ts'

const appRoot = fileURLToPath(new URL('../', import.meta.url))
const readAppFile = (...parts) => readFileSync(join(appRoot, ...parts), 'utf8')

function createStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key),
  }
}

function withStorage(callback) {
  const previous = globalThis.localStorage
  const storage = createStorage()
  globalThis.localStorage = storage
  try {
    return callback(storage)
  } finally {
    globalThis.localStorage = previous
  }
}

const addEvent = { uid: 'user-a', entity: 'event', operation: 'add' }

test('draft keys isolate user, entity, operation, entity id, and context', () => {
  assert.notEqual(
    getEditorDraftKey(addEvent),
    getEditorDraftKey({ ...addEvent, uid: 'user-b' }),
  )
  assert.notEqual(
    getEditorDraftKey(addEvent),
    getEditorDraftKey({ ...addEvent, entity: 'person' }),
  )
  assert.notEqual(
    getEditorDraftKey(addEvent),
    getEditorDraftKey({ ...addEvent, operation: 'edit', entityId: 'event-1' }),
  )
  assert.notEqual(
    getEditorDraftKey({ ...addEvent, context: 'person:person-a' }),
    getEditorDraftKey({ ...addEvent, context: 'person:person-b' }),
  )
  assert.match(getEditorDraftKey({ ...addEvent, context: 'person:person-a' }), /^draft:/)
})

test('draft storage round-trips, clears, and protects users from each other', () => {
  withStorage((storage) => {
    const eventDraft = { title: 'Rascunho', showMore: true }
    const userBDraft = { title: 'Outro usuário' }

    assert.equal(writeEditorDraft(addEvent, eventDraft), true)
    assert.equal(writeEditorDraft({ ...addEvent, uid: 'user-b' }, userBDraft), true)
    assert.deepEqual(readEditorDraft(addEvent), eventDraft)
    assert.deepEqual(readEditorDraft({ ...addEvent, uid: 'user-b' }), userBDraft)

    clearEditorDraft(addEvent)
    assert.equal(readEditorDraft(addEvent), null)
    assert.equal(storage.has(getEditorDraftKey({ ...addEvent, uid: 'user-b' })), true)
  })
})

test('corrupted or incompatible drafts are discarded without breaking the modal', () => {
  withStorage((storage) => {
    const key = getEditorDraftKey(addEvent)
    storage.setItem(key, '{not-json')
    assert.equal(readEditorDraft(addEvent), null)

    storage.setItem(key, JSON.stringify({ wrong: true }))
    assert.equal(readEditorDraft(addEvent, (value) => typeof value?.title === 'string'), null)
    assert.equal(storage.has(key), false)
  })
})

test('the shared lifecycle is used by all four editor modals', () => {
  const files = [
    readAppFile('events-history', 'components', 'AddEventModal.tsx'),
    readAppFile('events-history', 'components', 'EditEventModal.tsx'),
    readAppFile('people-directory', 'components', 'AddPersonModal.tsx'),
    readAppFile('people-directory', 'components', 'EditPersonModal.tsx'),
  ]

  for (const source of files) {
    assert.match(source, /useLocalEditorDraft/)
    assert.match(source, /saveOnDismiss\(\)/)
    assert.match(source, /clearDraft\(\)/)
    assert.match(source, /consumeAfterSave\(\)/)
    assert.match(source, />\s*Limpar\s*</)
    assert.match(source, /toolbarStart/)
    assert.doesNotMatch(source, /draftActions/)
  }
})

test('each modal scopes drafts to its entity, operation, and relevant context', () => {
  const eventAdd = readAppFile('events-history', 'components', 'AddEventModal.tsx')
  const eventEdit = readAppFile('events-history', 'components', 'EditEventModal.tsx')
  const personAdd = readAppFile('people-directory', 'components', 'AddPersonModal.tsx')
  const personEdit = readAppFile('people-directory', 'components', 'EditPersonModal.tsx')

  assert.match(eventAdd, /entity: 'event',[\s\S]*operation: 'add'/)
  assert.match(eventAdd, /context: initialPersonId \? `person:\$\{initialPersonId\}` : undefined/)
  assert.match(eventEdit, /entity: 'event',[\s\S]*operation: 'edit',[\s\S]*entityId: event\.id/)
  assert.match(personAdd, /entity: 'person',[\s\S]*operation: 'add'/)
  assert.match(personEdit, /entity: 'person',[\s\S]*operation: 'edit',[\s\S]*entityId: person\.id/)
})

test('all normal close paths save while explicit clear is the only discard path', () => {
  const eventAdd = readAppFile('events-history', 'components', 'AddEventModal.tsx')
  const eventEdit = readAppFile('events-history', 'components', 'EditEventModal.tsx')
  const personAdd = readAppFile('people-directory', 'components', 'AddPersonModal.tsx')
  const personEdit = readAppFile('people-directory', 'components', 'EditPersonModal.tsx')

  assert.match(eventAdd, /const handleDismiss = \(\) => \{[\s\S]*saveOnDismiss\(\)/)
  assert.match(eventAdd, /const handleCancel = \(\) => \{[\s\S]*saveOnDismiss\(\)/)
  assert.match(eventEdit, /onClick=\{\(clickEvent\) => \{[\s\S]*handleDismiss\(\)/)
  assert.match(personAdd, /const handleDismiss = \(\) => \{[\s\S]*saveOnDismiss\(\)/)
  assert.match(personEdit, /const handleDismiss = \(\) => \{[\s\S]*saveOnDismiss\(\)/)
})

test('edit and delete paths consume drafts only after successful Firebase operations', () => {
  const eventEdit = readAppFile('events-history', 'components', 'EditEventModal.tsx')
  const personEdit = readAppFile('people-directory', 'components', 'EditPersonModal.tsx')

  assert.match(eventEdit, /if \(success\) \{[\s\S]*consumeAfterSave\(\)[\s\S]*onUpdated\(\)/)
  assert.match(eventEdit, /await deleteDoc\(eventRef\)[\s\S]*consumeAfterSave\(\)/)
  assert.match(personEdit, /if \(!success\) return;[\s\S]*consumeAfterSave\(\)[\s\S]*onUpdated\(\)/)
  assert.match(personEdit, /await deleteDoc\([\s\S]*consumeAfterSave\(\)/)
})

test('draft storage is separate from Firebase writers', () => {
  const storage = readAppFile('utils', 'editorDraftStorage.ts')
  const personPayload = readAppFile('utils', 'personPayload.ts')
  const eventPayload = readAppFile('utils', 'eventPayload.ts')

  assert.doesNotMatch(storage, /firebase|Firestore|addDoc|updateDoc|setDoc/)
  assert.doesNotMatch(personPayload, /editorDraftStorage|useLocalEditorDraft/)
  assert.doesNotMatch(eventPayload, /editorDraftStorage|useLocalEditorDraft/)
})
