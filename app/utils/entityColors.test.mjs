import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getEntityColor,
  normalizeEntityColors,
  sanitizeEntityColor,
} from './entityColors.ts'

test('accepts compact and full hex colors', () => {
  assert.equal(sanitizeEntityColor('#abc'), '#abc')
  assert.equal(sanitizeEntityColor('#112233'), '#112233')
  assert.equal(sanitizeEntityColor('#112233cc'), '#112233cc')
})

test('rejects unsafe or malformed entity colors', () => {
  assert.equal(sanitizeEntityColor('red'), undefined)
  assert.equal(sanitizeEntityColor('url(javascript:alert(1))'), undefined)
  assert.deepEqual(normalizeEntityColors({ Client: '#123456', Invalid: 'red' }), {
    Client: '#123456',
  })
})

test('resolves colors by canonical entity name', () => {
  const colors = normalizeEntityColors({ Cliente: '#123456' })
  assert.equal(getEntityColor(colors, 'Cliente'), '#123456')
  assert.equal(getEntityColor(colors, 'Familiar'), undefined)
})
