import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const componentsRoot = fileURLToPath(new URL('./', import.meta.url))
const readComponentFile = (name) => readFileSync(join(componentsRoot, name), 'utf8')
const taskCardCss = readComponentFile('TaskCard.module.css')
const taskCard = readComponentFile('TaskCard.tsx')
const taskSectionCss = readComponentFile('TaskSection.module.css')
const taskSection = readComponentFile('TaskSection.tsx')
const tasksListPage = readFileSync(join(componentsRoot, '../page.tsx'), 'utf8')
const editTaskModal = readComponentFile('EditTaskModal.tsx')
const tokens = readFileSync(join(componentsRoot, '../../styles/tokens.css'), 'utf8')
const dashboard = readFileSync(join(componentsRoot, '../../dashboard/page.tsx'), 'utf8')

test('section headers expose independent semantic status accents', () => {
  assert.match(taskSectionCss, /\.header\s*\{[\s\S]*?position:\s*relative/)
  assert.match(taskSectionCss, /\.header::before\s*\{[\s\S]*?inset-block:\s*0[\s\S]*?width:\s*2px/)
  assert.match(taskSectionCss, /\.notStarted \.header::before\s*\{[\s\S]*?background:\s+var\(--color-task-status-not-started\)/)
  assert.match(taskSectionCss, /\.inProgress \.header::before\s*\{[\s\S]*?background:\s+var\(--color-task-status-in-progress\)/)
  assert.match(taskSectionCss, /\.completed \.header::before\s*\{[\s\S]*?background:\s+var\(--color-task-status-completed\)/)
  assert.match(taskSection, /const sectionClass = status === 0/)
  assert.match(taskSection, /<header className=\{styles\.header\}>/)
  assert.match(taskSection, /tasks\.length === 0/)
  assert.doesNotMatch(taskSectionCss, /#[0-9a-f]{3,8}\b|rgba?\(/i)
})

test('Task rows expose a narrow semantic status accent beside the status icon', () => {
  assert.match(taskCardCss, /\.row\s*\{[\s\S]*?border-left:\s*2px\s+solid\s+transparent/)
  assert.match(taskCardCss, /\.rowStatusPending\s*\{[\s\S]*?border-left-color:\s+var\(--color-task-status-not-started\)/)
  assert.match(taskCardCss, /\.rowStatusProgress\s*\{[\s\S]*?border-left-color:\s+var\(--color-task-status-in-progress\)/)
  assert.match(taskCardCss, /\.rowStatusDone\s*\{[\s\S]*?border-left-color:\s+var\(--color-task-status-completed\)/)
  assert.match(taskCard, /rowClassName/)
  assert.match(taskCard, /statusIcon/)
  assert.doesNotMatch(taskCardCss, /#[0-9a-f]{3,8}\b|rgba?\(/i)
})

test('status tokens exist for light and dark themes and subtasks reuse TaskCard', () => {
  for (const token of [
    '--color-task-status-not-started',
    '--color-task-status-in-progress',
    '--color-task-status-completed',
  ]) {
    assert.equal((tokens.match(new RegExp(token.replaceAll('-', '\\-'), 'g')) ?? []).length >= 2, true, token)
  }

  assert.equal((taskSection.match(/<TaskCard/g) ?? []).length >= 2, true)
  assert.match(taskSection, /className=\{styles\.subtasks\}/)
})

test('archived Tasks use a secondary filter, dedicated section, and administrative card mode', () => {
  assert.match(tasksListPage, /Mostrar arquivadas/)
  assert.match(tasksListPage, /isTaskArchived/)
  assert.match(tasksListPage, /archivedTasks/)
  assert.match(tasksListPage, /section="Arquivadas"/)
  assert.match(taskSection, /archived?/)
  assert.match(taskCard, /archived \? styles\.archivedRow/)
  assert.match(taskCard, /disabled={archived}/)
  assert.doesNotMatch(taskCard, /Criar subtask.*archived/)
  assert.match(editTaskModal, /buildTaskArchiveUpdate/)
  assert.match(editTaskModal, /buildTaskRestoreUpdate/)
  assert.match(editTaskModal, /Restaurar tarefa/)
})

test('canonical hierarchy actions replace positional attach and demote controls', () => {
  assert.match(taskCard, /Criar subtask/)
  assert.match(taskCard, /Promover subtarefa/)
  assert.match(taskCard, /type="checkbox"/)
  assert.doesNotMatch(taskCard, /onMakeSubtask|Transformar em subtarefa|ArrowDownRight/)
  assert.doesNotMatch(taskSection, /attachSubtask|handleMakeSubtask|makeSubtask/)
})

test('Supertask status and Action completion share the confirmed bulk boundary', () => {
  assert.match(taskSection, /getSupertaskStatusConfirmationMessage/)
  assert.match(taskSection, /buildSupertaskStatusUpdate/)
  assert.match(dashboard, /getSupertaskStatusConfirmationMessage/)
  assert.match(dashboard, /buildSupertaskStatusUpdate/)
  assert.doesNotMatch(dashboard, /requer confirmação bulk da UI/)
})
