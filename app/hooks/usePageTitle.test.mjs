import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { buildPageTitle } from '../utils/pageTitle.ts'

const appRoot = fileURLToPath(new URL('../', import.meta.url))

test('builds canonical titles for primary surfaces', () => {
  const cases = [
    ['Hoje', 'Nxt [Hoje]'],
    ['Eventos', 'Nxt [Eventos]'],
    ['Tarefas', 'Nxt [Tarefas]'],
    ['Pessoas', 'Nxt [Pessoas]'],
    ['Login', 'Nxt [Login]'],
  ]

  for (const [context, expected] of cases) {
    assert.equal(buildPageTitle('Nxt', context), expected)
  }
})

test('builds generic detail titles while loading', () => {
  assert.equal(buildPageTitle('Nxt', 'Evento'), 'Nxt [Evento]')
  assert.equal(buildPageTitle('Nxt', 'Pessoa'), 'Nxt [Pessoa]')
  assert.equal(buildPageTitle('Nxt', 'Evento', ''), 'Nxt [Evento]')
  assert.equal(buildPageTitle('Nxt', 'Pessoa', '   '), 'Nxt [Pessoa]')
})

test('preserves loaded event and person names without HTML interpretation', () => {
  assert.equal(buildPageTitle('Nxt', 'Evento', 'Aula Magna'), 'Nxt [Evento] Aula Magna')
  assert.equal(buildPageTitle('Nxt', 'Pessoa', 'Raphael Neves'), 'Nxt [Pessoa] Raphael Neves')
  assert.equal(buildPageTitle('Outra', 'Pessoa', 'Nome <teste>'), 'Outra [Pessoa] Nome <teste>')
})

test('uses the supplied instance identity instead of a hardcoded surface name', () => {
  assert.equal(buildPageTitle('Atlas', 'Pessoas'), 'Atlas [Pessoas]')

  const source = readFileSync(join(appRoot, 'hooks', 'usePageTitle.ts'), 'utf8')
  assert.match(source, /buildPageTitle\(instance\.name, context, detail\)/)
  assert.doesNotMatch(source, /['"]Nxt['"]|Nxt \[/)
})

test('wires every requested route to the shared title hook', () => {
  const routeSources = [
    ['dashboard/page.tsx', /usePageTitle\('Hoje'\)/],
    ['events-history/page.tsx', /usePageTitle\('Eventos'\)/],
    ['tasks-list/page.tsx', /usePageTitle\('Tarefas'\)/],
    ['people-directory/page.tsx', /usePageTitle\('Pessoas'\)/],
    ['auth-login/page.tsx', /usePageTitle\('Login'\)/],
    ['events-history/[id]/page.tsx', /usePageTitle\('Evento', event\?\.id === id/],
    ['people-directory/[id]/page.tsx', /usePageTitle\('Pessoa', person\?\.id === personId/],
  ]

  for (const [file, contract] of routeSources) {
    assert.match(readFileSync(join(appRoot, file), 'utf8'), contract)
  }
})
