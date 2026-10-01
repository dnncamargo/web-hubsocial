import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const appRoot = fileURLToPath(new URL('../', import.meta.url))
const readAppFile = (...parts) => readFileSync(join(appRoot, ...parts), 'utf8')

const outsideDismiss = readAppFile('hooks', 'useOutsideDismiss.ts')
const quickCreate = readAppFile('components', 'ui', 'QuickCreateMenu.tsx')
const mainMenu = readAppFile('components', 'ui', 'MainMenu.tsx')
const eventPage = readAppFile('events-history', 'page.tsx')
const peoplePage = readAppFile('people-directory', 'page.tsx')
const addEvent = readAppFile('events-history', 'components', 'AddEventModal.tsx')
const editEvent = readAppFile('events-history', 'components', 'EditEventModal.tsx')
const addPerson = readAppFile('people-directory', 'components', 'AddPersonModal.tsx')
const editPerson = readAppFile('people-directory', 'components', 'EditPersonModal.tsx')
const addTask = readAppFile('tasks-list', 'components', 'AddTaskModal.tsx')
const editTask = readAppFile('tasks-list', 'components', 'EditTaskModal.tsx')
const filterEvent = readAppFile('events-history', 'components', 'FilterEventModal.tsx')
const filterPerson = readAppFile('people-directory', 'components', 'FilterPersonModal.tsx')
const associatePerson = readAppFile('events-history', 'components', 'AssociatePersonModal.tsx')
const relationships = readAppFile('people-directory', 'components', 'PeopleRelationshipsModal.tsx')
const optionalFields = readAppFile('components', 'optional-fields', 'OptionalFieldModal.tsx')
const importContacts = readAppFile('components', 'ui', 'ImportContactsModal.tsx')
const suggestionPanel = readAppFile('dashboard', 'components', 'SuggestionPanel.tsx')

const backdropDismiss = (source) => {
  assert.match(source, /\w+\.target(?:\s*!==|\s*===)\s*\w+\.currentTarget/)
  assert.match(source, /onClose\(\)|handleDismiss\(\)|setShowSearchModal\(false\)/)
}

test('inside clicks do not close editor modals', () => {
  for (const source of [addEvent, editEvent, addPerson, editPerson, addTask, editTask]) {
    assert.match(source, /\w+\.target(?:\s*!==|\s*===)\s*\w+\.currentTarget/)
  }
})

test('backdrop clicks close modal surfaces', () => {
  for (const source of [addEvent, editEvent, addPerson, editPerson, addTask, editTask]) {
    backdropDismiss(source)
  }
})

test('event add dismiss keeps its local draft contract', () => {
  assert.match(addEvent, /editorDraft\.saveOnDismiss\(\)/)
  assert.match(addEvent, /onDismiss\(\)/)
})

test('person add dismiss keeps its local draft contract', () => {
  assert.match(addPerson, /editorDraft\.saveOnDismiss\(\)/)
  assert.match(addPerson, /onDismiss\(\)/)
})

test('profile menu uses the shared outside dismissal contract', () => {
  assert.match(mainMenu, /useOutsideDismiss/)
  assert.match(mainMenu, /accountMenuRef/)
  assert.match(mainMenu, /desktopAccountButtonRef/)
  assert.match(mainMenu, /mobileAccountButtonRef/)
})

test('profile menu remains open for clicks inside its menu', () => {
  assert.match(mainMenu, /insideRefs: \[[\s\S]*accountMenuRef[\s\S]*desktopAccountButtonRef[\s\S]*mobileAccountButtonRef/)
})

test('event and person filters dismiss from their backdrop without resetting values', () => {
  backdropDismiss(filterEvent)
  backdropDismiss(filterPerson)
  assert.match(filterEvent, /onClick=\{onClose\}/)
  assert.match(filterPerson, /onClick=\{onClose\}/)
})

test('event and person search overlays dismiss from their backdrop', () => {
  for (const source of [eventPage, peoplePage]) backdropDismiss(source)
})

test('quick create trigger is inside the shared dismissal root', () => {
  assert.match(quickCreate, /useOutsideDismiss/)
  assert.match(quickCreate, /insideRefs: \[rootRef\]/)
  assert.doesNotMatch(quickCreate, /document\.addEventListener/)
})

test('nested event and person selectors dismiss themselves without propagation hacks', () => {
  for (const source of [associatePerson, relationships, optionalFields]) {
    backdropDismiss(source)
    assert.doesNotMatch(source, /stopPropagation\(\)/)
  }
})

test('import contacts modal dismisses from its backdrop', () => {
  backdropDismiss(importContacts)
})

test('nested task selector uses the same auxiliary modal boundary', () => {
  assert.match(editTask, /<AssociatePersonModal/)
  backdropDismiss(associatePerson)
})

test('the shared primitive supports portalled semantic regions', () => {
  assert.match(outsideDismiss, /insideRefs: ReadonlyArray/)
  assert.match(outsideDismiss, /refsRef\.current\.some/)
  assert.match(outsideDismiss, /Multiple refs are intentional/)
})

test('the primitive uses one pointer strategy for mouse and touch-capable pointers', () => {
  assert.match(outsideDismiss, /document\.addEventListener\('pointerdown'/)
  assert.doesNotMatch(outsideDismiss, /mousedown|click/)
})

test('the primitive does not install handlers while closed or disabled', () => {
  assert.match(outsideDismiss, /if \(!open \|\| disabled\) return/)
})

test('the primitive removes its document handler on unmount or state change', () => {
  assert.match(outsideDismiss, /document\.removeEventListener\('pointerdown', handlePointerDown\)/)
  assert.match(outsideDismiss, /return \(\) => \{/)
})

test('sequential overlays use current dismiss callbacks instead of stale handlers', () => {
  assert.match(outsideDismiss, /onDismissRef\.current = onDismiss/)
  assert.match(outsideDismiss, /onDismissRef\.current\(\)/)
})

test('the suggestion panel dismisses outside its interactive region', () => {
  assert.match(suggestionPanel, /useOutsideDismiss/)
  assert.match(suggestionPanel, /insideRefs: \[panelRef\]/)
  assert.match(suggestionPanel, /onDismiss: onClose/)
})
