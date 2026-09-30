import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const appRoot = fileURLToPath(new URL('../', import.meta.url))
const readAppFile = (...parts) => readFileSync(join(appRoot, ...parts), 'utf8')

const eventCard = readAppFile('events-history', 'components', 'EventCard.tsx')
const eventsList = readAppFile('events-history', 'page.tsx')
const eventDetails = readAppFile('events-history', '[id]', 'page.tsx')

test('EventCard keeps direct editing through the shared event modal', () => {
  assert.match(eventCard, /onEditEvent: \(event: Event\) => void/)
  assert.match(eventCard, /onEditEvent\(event\)/)
  assert.match(eventCard, />\s*Editar\s*</)
  assert.match(eventsList, /onEditEvent=\{openEditEventModal\}/)
})

test('event details keeps its independent editing entry point', () => {
  assert.ok(eventsList.includes("import EditEventModal from './components/EditEventModal'"))
  assert.match(eventsList, /<EditEventModal/)
  assert.match(eventsList, /onUpdated=\{fetchEvents\}/)
  assert.ok(eventDetails.includes("import EditEventModal from '../components/EditEventModal'"))
  assert.match(eventDetails, /onClick=\{\(\) => setIsEditModalOpen\(true\)\}/)
  assert.match(eventDetails, /<EditEventModal/)
  assert.match(eventDetails, /onUpdated=\{fetchEvent\}/)
})
