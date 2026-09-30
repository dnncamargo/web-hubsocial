import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const appRoot = fileURLToPath(new URL('../', import.meta.url))
const readAppFile = (...parts) => readFileSync(join(appRoot, ...parts), 'utf8')

const personCard = readAppFile('people-directory', 'components', 'PersonCard.tsx')
const peopleList = readAppFile('people-directory', 'page.tsx')
const personDetails = readAppFile('people-directory', '[id]', 'page.tsx')
const editPersonModal = readAppFile('people-directory', 'components', 'EditPersonModal.tsx')

test('PersonCard offers textual editing without a pencil icon', () => {
  assert.match(personCard, /onEditPerson: \(person: Person\) => void/)
  assert.match(personCard, /onClick=\{\(event\) => \{[\s\S]*?event\.stopPropagation\(\)[\s\S]*?onEditPerson\(person\)/)
  assert.match(personCard, />\s*Editar\s*</)
  assert.doesNotMatch(personCard, /Pencil|SquarePen/)
})

test('people list opens the shared editor for the selected person and refreshes after save', () => {
  assert.match(peopleList, /import EditPersonModal from ['"]\.\/components\/EditPersonModal['"];/)
  assert.match(peopleList, /selectedPerson, setSelectedPerson/)
  assert.match(peopleList, /onEditPerson=\{openEditPersonModal\}/)
  assert.match(peopleList, /person=\{selectedPerson\}/)
  assert.match(peopleList, /onUpdated=\{fetchPeople\}/)
  assert.match(peopleList, /onDeleted=\{async \(\) => \{/)
})

test('person details keeps its independent entry to the same editor boundary', () => {
  assert.match(personDetails, /import EditPersonModal from ['"]\.\.\/components\/EditPersonModal['"];/)
  assert.match(personDetails, /onClick=\{\(\) => setIsEditPersonModalOpen\(true\)\}/)
  assert.match(personDetails, /<EditPersonModal/)
  assert.match(personDetails, /onUpdated=\{fetchPerson\}/)
  assert.match(editPersonModal, /usePersonForm/)
  assert.match(editPersonModal, /getPersonDocumentPath/)
})
