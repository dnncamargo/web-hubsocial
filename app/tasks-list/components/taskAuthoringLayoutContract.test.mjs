import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const componentsRoot = fileURLToPath(new URL('./', import.meta.url))
const readComponent = (name) => readFileSync(join(componentsRoot, name), 'utf8')

const addTaskModal = readComponent('AddTaskModal.tsx')
const editTaskModal = readComponent('EditTaskModal.tsx')
const subtaskModal = readComponent('SubtaskModal.tsx')
const tasksListPage = readComponent('../page.tsx')
const scheduleControl = readFileSync(
  join(componentsRoot, '../../components/actions/TaskScheduleControl.tsx'),
  'utf8',
)

test('Add and Edit share the guided task authoring order and canonical actions', () => {
  for (const source of [addTaskModal, editTaskModal]) {
    const natureIndex = source.indexOf('<TaskNatureControl')
    const contentIndex = source.indexOf('placeholder="O que precisa ser feito?"')
    const planningIndex = source.indexOf('legend="Quando você pretende fazer?"')
    const contextIndex = source.indexOf('<TaskScheduleControl')
    const conditionsIndex = source.indexOf('<AutomationRulesEditor')

    assert.ok(natureIndex >= 0)
    assert.ok(natureIndex < contentIndex)
    assert.ok(contentIndex < planningIndex || source.includes('nature === \'recurring\''))
    assert.ok(planningIndex < contextIndex || source.includes('nature === \'recurring\''))
    assert.ok(contextIndex < conditionsIndex)
    assert.match(source, /Cancelar/)
    assert.match(source, /Salvar|Adicionar/)
    assert.match(source, /Limpar/)
    assert.doesNotMatch(source, /onNatureChange=/)
  }
})

test('schedule controls expose recurrence only and no Event authoring surface', () => {
  assert.match(scheduleControl, /Com que frequência ela se repete\?/)
  assert.doesNotMatch(scheduleControl, /Contexto|Event associado|Antecedência|eventRelative/)
  assert.match(scheduleControl, /if \(nature !== 'recurring'\) return null/)
  assert.match(scheduleControl, /Flexível/)
  assert.match(scheduleControl, /Em dias específicos/)
  assert.match(scheduleControl, /Diariamente/)
  assert.match(scheduleControl, /Semanalmente/)
  assert.match(scheduleControl, /Mensalmente/)
})

test('Subtask authoring uses the simple editor and canonical transient surface', () => {
  assert.match(subtaskModal, /createCanonicalSubtask/)
  assert.match(subtaskModal, /useOutsideDismiss/)
  assert.match(subtaskModal, /Cancelar/)
  assert.match(subtaskModal, /Salvar/)
  assert.doesNotMatch(subtaskModal, /Limpar|draftActions|handleClear/)
  assert.doesNotMatch(subtaskModal, /TaskNatureControl|TaskScheduleControl|ActionPlanningControl|AutomationRulesEditor|Event association/i)
  assert.match(tasksListPage, /SubtaskModal/)
})

test('Edit Task keeps conversion after favorable conditions and exposes toolbar draft actions', () => {
  const conditionsIndex = editTaskModal.indexOf('<AutomationRulesEditor')
  const conversionIndex = editTaskModal.indexOf('Agendar como evento')
  const toolbarIndex = editTaskModal.indexOf('className={styles.toolbar}')
  const clearIndex = editTaskModal.indexOf('Limpar')

  assert.ok(conditionsIndex >= 0)
  assert.ok(conversionIndex > conditionsIndex)
  assert.ok(clearIndex > toolbarIndex && clearIndex < editTaskModal.indexOf('<TaskNatureControl'))
  assert.doesNotMatch(editTaskModal, /draftActions/)
})
