import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import {
  applyTheme,
  persistTheme,
  readStoredTheme,
  resolveTheme,
} from './theme.ts'

const appRoot = fileURLToPath(new URL('../', import.meta.url))
const readAppFile = (...parts) => readFileSync(join(appRoot, ...parts), 'utf8')
const tokens = readAppFile('styles', 'tokens.css')
const indexHtml = readFileSync(join(appRoot, '..', 'index.html'), 'utf8')
const mainMenu = readAppFile('components', 'ui', 'MainMenu.tsx')
const authProvider = readAppFile('components', 'auth', 'AuthProvider.tsx')
const draftLifecycle = readAppFile('utils', 'creationDraftLifecycle.ts')

test('no saved preference follows the system dark preference', () => {
  assert.equal(resolveTheme(null, true), 'dark')
})

test('no saved preference follows the system light preference', () => {
  assert.equal(resolveTheme(undefined, false), 'light')
})

test('a saved dark preference overrides a light system', () => {
  assert.equal(resolveTheme('dark', false), 'dark')
})

test('a saved light preference overrides a dark system', () => {
  assert.equal(resolveTheme('light', true), 'light')
})

test('invalid stored values fall back to the system', () => {
  assert.equal(resolveTheme('sepia', true), 'dark')
})

test('theme changes apply the semantic root attribute and color scheme', () => {
  const root = { dataset: {}, style: {} }

  applyTheme('dark', root)

  assert.equal(root.dataset.theme, 'dark')
  assert.equal(root.style.colorScheme, 'dark')
})

test('explicit choices persist under a neutral local preference key', () => {
  const values = new Map()
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }

  persistTheme('dark', storage)

  assert.equal(readStoredTheme(storage), 'dark')
})

test('fundamental semantic tokens exist for light and dark themes', () => {
  for (const token of [
    '--color-background',
    '--color-surface',
    '--color-surface-elevated',
    '--color-surface-muted',
    '--color-text-primary',
    '--color-text-secondary',
    '--color-text-muted',
    '--color-border',
    '--color-border-strong',
    '--color-accent',
    '--color-success',
    '--color-warning',
    '--color-danger',
    '--color-focus-ring',
    '--color-events',
    '--color-tasks',
    '--color-people',
  ]) {
    assert.equal((tokens.match(new RegExp(token.replace('-', '\\-'), 'g')) ?? []).length >= 2, true, token)
  }
  assert.match(tokens, /html\[data-theme='dark'\]/)
})

test('first paint resolves the stored or system theme before the app module', () => {
  assert.match(indexHtml, /localStorage\.getItem\('themePreference'\)/)
  assert.match(indexHtml, /prefers-color-scheme: dark/)
  assert.match(indexHtml, /document\.documentElement\.dataset\.theme = theme/)
  assert.ok(indexHtml.indexOf('dataset.theme') < indexHtml.indexOf('src="/app/main.tsx"'))
})

test('theme control is independent from Firebase identity and creation drafts', () => {
  assert.match(mainMenu, /useTheme/)
  assert.match(mainMenu, /Tema da aplicação/)
  assert.match(mainMenu, /aria-pressed={theme === 'dark'}/)
  assert.match(mainMenu, /aria-pressed={theme === 'light'}/)
  assert.doesNotMatch(authProvider, /themePreference|data-theme|useTheme/)
  assert.doesNotMatch(draftLifecycle, /themePreference|data-theme|useTheme/)
})
