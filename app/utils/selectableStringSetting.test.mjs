import assert from 'node:assert/strict'
import test from 'node:test'
import {
  appendSelectableValue,
  buildSelectableSettingUpdate,
  normalizeSelectableValues,
  removeSelectableValue,
} from './selectableStringSetting.ts'

test('normalizes values and removes legacy duplicates', () => {
  assert.deepEqual(
    normalizeSelectableValues([' Trabalho ', 'Trabalho', '', 42, 'Família']),
    ['Trabalho', 'Família'],
  )
})

test('append keeps add behavior without duplicate definitions', () => {
  assert.deepEqual(appendSelectableValue(['Trabalho'], '  Lazer '), [
    'Trabalho',
    'Lazer',
  ])
  assert.deepEqual(appendSelectableValue(['Trabalho'], ' Trabalho '), ['Trabalho'])
})

test('remove is safe for missing values and removes all duplicate definitions', () => {
  assert.deepEqual(
    removeSelectableValue(['Trabalho', 'Trabalho', 'Lazer'], ' trabalho '),
    ['Trabalho', 'Lazer'],
  )
  assert.deepEqual(removeSelectableValue(['Trabalho'], 'Inexistente'), ['Trabalho'])
  assert.deepEqual(removeSelectableValue([], 'Inexistente'), [])
})

test('remove also cleans the current selected values', () => {
  const selectedValues = ['Trabalho', 'Lazer']

  assert.deepEqual(removeSelectableValue(selectedValues, 'Trabalho'), ['Lazer'])
})

test('builds the persisted Settings payload for both domain field names', () => {
  assert.deepEqual(
    buildSelectableSettingUpdate('category', [' Trabalho ', 'Lazer']),
    { category: ['Trabalho', 'Lazer'] },
  )
  assert.deepEqual(
    buildSelectableSettingUpdate('relationship', [' Cliente ', 'Família']),
    { relationship: ['Cliente', 'Família'] },
  )
})

test('removing a setting value does not transform historical entity data', () => {
  const historicalEvent = { categories: ['Trabalho'] }
  const historicalPerson = { relationships: ['Cliente'] }

  removeSelectableValue(['Trabalho'], 'Trabalho')
  removeSelectableValue(['Cliente'], 'Cliente')

  assert.deepEqual(historicalEvent, { categories: ['Trabalho'] })
  assert.deepEqual(historicalPerson, { relationships: ['Cliente'] })
})
