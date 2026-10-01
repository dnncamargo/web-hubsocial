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
    assert.match(source, /mode="task"/)
    assert.match(source, /onTaskEventChange=\{handleTaskEventChange\}/)
    assert.doesNotMatch(source, /Contexto|Regra temporal|Antecedência|Event associado/)
  }
  assert.match(conditionEditor, /Evento próximo/)
  assert.match(conditionEditor, /Período do dia/)
  assert.match(conditionEditor, /Manhã/)
  assert.match(conditionEditor, /Tarde/)
  assert.match(conditionEditor, /Noite/)
  assert.match(conditionEditor, /Selecione um evento/)
  assert.match(conditionEditor, /<span>Destacar até<\/span>/)
  assert.doesNotMatch(conditionEditor, /Proximidade do Event associado|Associe um Event primeiro/)
  assert.match(conditionEditor, /mode === 'event' \? events\[0\]\?\.id/)
  assert.doesNotMatch(conditionEditor, /associatedEventId/)
})

test('favorable condition order is day period, weekday, weather, event', () => {
  const labels = ['Período do dia', 'Dia da semana', 'Clima atual', 'Evento próximo']
  const indexes = labels.map((label) => conditionEditor.indexOf(`<span>${label}</span>`))
  assert.ok(indexes.every((index) => index >= 0))
  assert.deepEqual(indexes, [...indexes].sort((a, b) => a - b))
  assert.doesNotMatch(conditionEditor, /dayPeriodRule\.period(?!s)/)
  assert.equal((conditionEditor.match(/dayPeriodRule\.periods\.includes/g) ?? []).length, 1)
})

test('Task authoring keeps one Event selector and one day input in the shared condition editor', () => {
  const eventRule = conditionEditor.slice(conditionEditor.indexOf('className={styles.eventRule}'))
  assert.equal((eventRule.match(/<select/g) ?? []).length, 1)
  assert.equal((eventRule.match(/type="number"/g) ?? []).length, 1)
  assert.doesNotMatch(eventRule, /Antecedência|leadDays|Event associado/)
})

test('Task persistence keeps conditions independent from schedule and Event association fields', () => {
  assert.match(addTaskModal, /automation,\s*schedule,\s*eventAssociation/)
  assert.match(editTaskModal, /buildTaskUpdate\(\{ content, actionPlanning, automation, schedule, eventAssociation \}\)/)
})
