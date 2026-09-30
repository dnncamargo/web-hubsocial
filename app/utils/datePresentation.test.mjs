import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import {
  formatCompactDate,
  formatDate,
  formatDateRange,
  formatDateTime,
  formatDirectDate,
  formatMonthYear,
  formatTimeRange,
  parseCivilDate,
} from './datePresentation.ts'

const appRoot = fileURLToPath(new URL('../', import.meta.url))
const readAppFile = (...parts) => readFileSync(join(appRoot, ...parts), 'utf8')

test('formats canonical Brazilian dates without weekday, slash, or punctuation', () => {
  assert.equal(formatDate('2026-10-21', { referenceYear: 2026 }), '21 out')
  assert.equal(formatDate('2027-10-21', { referenceYear: 2026 }), '21 out 2027')
  assert.equal(formatDirectDate('1993-11-16'), '16 nov 1993')
  assert.equal(formatDirectDate('2026-10-01'), '1 out 2026')
  assert.equal(formatCompactDate('--04-25'), '25 abr')
  assert.equal(formatCompactDate('2026-04-25'), '25 abr')
  assert.equal(formatMonthYear(new Date(2026, 9, 1)), 'out 2026')
})

test('composes a date and time without moving time into the range formatter', () => {
  assert.equal(
    formatDateTime('2026-10-01', '01:00', { referenceYear: 2026 }),
    '1 out · 01:00',
  )
  assert.equal(formatTimeRange('01:00', '03:00'), '01:00–03:00')
  assert.equal(formatTimeRange('01:00', ''), '01:00')
})

test('compresses same-month ranges and emits a shared year only once', () => {
  assert.deepEqual(
    formatDateRange('2026-10-01', '2026-10-15', { referenceYear: 2026 }),
    { start: '1', end: '15 out' },
  )
  assert.deepEqual(
    formatDateRange('2027-10-01', '2027-10-15', { referenceYear: 2026 }),
    { start: '1', end: '15 out 2027' },
  )
})

test('compresses cross-month and cross-year ranges without ambiguity', () => {
  assert.deepEqual(
    formatDateRange('2026-09-29', '2026-10-01', { referenceYear: 2026 }),
    { start: '29 set', end: '1 out' },
  )
  assert.deepEqual(
    formatDateRange('2027-09-29', '2027-10-01', { referenceYear: 2026 }),
    { start: '29 set', end: '1 out 2027' },
  )
  assert.deepEqual(
    formatDateRange('2026-12-29', '2027-01-02', { referenceYear: 2026 }),
    { start: '29 dez 2026', end: '2 jan 2027' },
  )
})

test('handles partial birthdays, leap days, invalid values, and timezone safely', () => {
  assert.equal(formatCompactDate('--04-25'), '25 abr')
  assert.equal(formatDirectDate('2024-02-29'), '29 fev 2024')
  assert.equal(formatDate('2024-02-29', { referenceYear: 2024 }), '29 fev')
  assert.equal(formatDate('2026-02-29', { referenceYear: 2026 }), '')
  assert.equal(formatDate('not-a-date', { referenceYear: 2026 }), '')

  const civil = parseCivilDate('2026-10-01')
  assert.equal(civil?.year, 2026)
  assert.equal(civil?.month, 10)
  assert.equal(civil?.day, 1)
  assert.equal(civil?.date.getDate(), 1)
  assert.equal(civil?.date.getMonth(), 9)
})

test('consumers use the canonical presentation helpers', () => {
  assert.match(readAppFile('events-history', 'components', 'EventCard.tsx'), /formatDateRange/)
  assert.match(readAppFile('events-history', '[id]', 'page.tsx'), /formatDateRange/)
  assert.match(readAppFile('people-directory', '[id]', 'page.tsx'), /formatDateRange/)
  assert.match(readAppFile('dashboard', 'page.tsx'), /formatDateTime/)
  assert.match(readAppFile('dashboard', 'components', 'ActionsOverview.tsx'), /formatDate/)
  assert.match(readAppFile('events-history', 'components', 'EventCalendarMonth.tsx'), /formatMonthYear/)
  assert.match(readAppFile('components', 'ui', 'MainMenu.tsx'), /formatDate/)
})

test('Event Cards separate compact date from the time and address metadata line', () => {
  const eventCard = readAppFile('events-history', 'components', 'EventCard.tsx')
  assert.match(eventCard, /formatTimeRange/)
  assert.match(eventCard, /timeRange && event\.location && ' · '/)
  assert.match(eventCard, /event\.location && \(/)
})

test('surface headers keep their visible labels separate from browser titles', () => {
  assert.match(readAppFile('people-directory', 'page.tsx'), />Diretório de pessoas</)
  assert.match(readAppFile('events-history', 'page.tsx'), />Histórico de Eventos</)
  assert.match(readAppFile('tasks-list', 'page.tsx'), />Lista de Tarefas</)
})
