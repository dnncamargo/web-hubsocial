import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const componentsRoot = fileURLToPath(new URL('./', import.meta.url))
const readComponent = (name) => readFileSync(join(componentsRoot, name), 'utf8')

const addTaskModal = readComponent('AddTaskModal.tsx')
const editTaskModal = readComponent('EditTaskModal.tsx')
const conditionEditor = readComponent('../../components/actions/AutomationRulesEditor.tsx')

test('Task authoring exposes favorable conditions with the same editor in Add and Edit', () => {
  assert.match(conditionEditor, /<legend[^>]*>Condições favoráveis<\/legend>/)
  for (const source of [addTaskModal, editTaskModal]) {
    assert.match(source, /<AutomationRulesEditor/)
    assert.match(source, /value=\{automation\}/)
    assert.match(source, /onChange=\{setAutomation\}/)
  }
})

test('Task persistence keeps conditions independent from schedule and Event association fields', () => {
  assert.match(addTaskModal, /automation,\s*schedule,\s*eventAssociation/)
  assert.match(editTaskModal, /buildTaskUpdate\(\{ content, actionPlanning, automation, schedule, eventAssociation \}\)/)
})
