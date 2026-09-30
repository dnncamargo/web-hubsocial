import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import {
  formatCompactDate,
  formatDirectDate,
  formatMonthYear,
  formatSpecificDate,
  formatSpecificDateRange,
  formatSpecificDateTime,
  formatTimeRange,
  parseCivilDate,
} from './datePresentation.ts'

const appRoot = fileURLToPath(new URL('../', import.meta.url))
const readAppFile = (...parts) => readFileSync(join(appRoot, ...parts), 'utf8')

test('formats canonical Brazilian months and weekdays deterministically', () => {
  assert.equal(formatSpecificDate('2026-01-01', { referenceYear: 2026 }), 'quinta, 1 jan')
  assert.equal(formatSpecificDate('2026-04-25', { referenceYear: 2026 }), 'sábado, 25 abr')
  assert.equal(formatSpecificDate('2026-10-01', { referenceYear: 2026 }), 'quinta, 1 out')
  assert.equal(formatSpecificDate('2026-12-31', { referenceYear: 2026 }), 'quinta, 31 dez')
  assert.equal(formatMonthYear(new Date(2026, 9, 1)), 'out 2026')
})

test('omits the reference year only when it matches exactly', () => {
  assert.equal(formatSpecificDate('2026-10-01', { referenceYear: 2026 }), 'quinta, 1 out')
  assert.equal(formatSpecificDate('2027-10-01', { referenceYear: 2026 }), 'sexta, 1 out 2027')
})

test('formats direct, compact, and timed dates according to their contracts', () => {
  assert.equal(formatDirectDate('1993-11-16'), '16 / nov / 1993')
  assert.equal(formatDirectDate('2026-10-01'), '01 / out / 2026')
  assert.equal(formatDirectDate('--04-25'), '25/abr')
  assert.equal(formatCompactDate('2026-04-25'), '25/abr')
  assert.equal(
    formatSpecificDateTime('2026-10-01', '01:00', { referenceYear: 2026 }),
    'quinta, 1 out · 01:00',
  )
})

test('preserves event ranges and all-day semantics', () => {
  assert.deepEqual(
    formatSpecificDateRange('2026-10-01', '2026-10-01', '01:00', '02:30', false, { referenceYear: 2026 }),
    { start: 'quinta, 1 out' },
  )
  assert.deepEqual(
    formatSpecificDateRange('2026-09-09', '2026-10-12', undefined, undefined, true, { referenceYear: 2026 }),
    { start: '9/set', end: '12/out' },
  )
  assert.equal(formatTimeRange('01:00', '03:00'), '01:00–03:00')
  assert.equal(formatTimeRange('01:00', ''), '01:00')
})

test('handles partial birthdays, leap days, invalid values, and timezone safely', () => {
  assert.equal(formatCompactDate('--04-25'), '25/abr')
  assert.equal(formatDirectDate('2024-02-29'), '29 / fev / 2024')
  assert.equal(formatSpecificDate('2024-02-29', { referenceYear: 2024 }), 'quinta, 29 fev')
  assert.equal(formatSpecificDate('2026-02-29', { referenceYear: 2026 }), '')
  assert.equal(formatSpecificDate('not-a-date', { referenceYear: 2026 }), '')

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
  assert.match(readAppFile('dashboard', 'page.tsx'), /formatSpecificDateTime/)
  assert.match(readAppFile('dashboard', 'components', 'ActionsOverview.tsx'), /formatSpecificDate/)
  assert.match(readAppFile('events-history', 'components', 'EventCalendarMonth.tsx'), /formatMonthYear/)
  assert.match(readAppFile('components', 'ui', 'MainMenu.tsx'), /formatSpecificDate/)
})

test('Event Cards separate date from the time and address metadata line', () => {
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
