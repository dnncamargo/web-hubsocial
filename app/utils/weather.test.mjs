import assert from 'node:assert/strict'
import test from 'node:test'
import {
  WEATHER_CONTEXT_DEADLINE_MS,
  resolveWeatherWithinDeadline,
} from './weather.ts'

const snapshot = {
  condition: 'sunny',
  temperatureC: 24,
  weatherCode: 0,
  observedAt: '2026-09-30T12:00',
  provider: 'Open-Meteo',
}

test('uses a finite shared deadline for optional weather enrichment', () => {
  assert.equal(WEATHER_CONTEXT_DEADLINE_MS, 1500)
})

test('returns a fast weather response', async () => {
  assert.deepEqual(
    await resolveWeatherWithinDeadline(async () => snapshot, 20),
    snapshot,
  )
})

test('turns a timeout into unavailable weather without rejecting', async () => {
  const weather = resolveWeatherWithinDeadline(
    () => new Promise(() => {}),
    5,
  )

  assert.equal(await weather, null)
})

test('does not let a response after the deadline replace the fallback result', async () => {
  let resolveWeather
  const lateWeather = new Promise((resolve) => {
    resolveWeather = resolve
  })
  const result = resolveWeatherWithinDeadline(() => lateWeather, 5)

  assert.equal(await result, null)
  resolveWeather(snapshot)
  assert.equal(await result, null)
})

test('turns provider and geolocation failures into unavailable weather', async () => {
  assert.equal(
    await resolveWeatherWithinDeadline(
      async () => { throw new Error('Open-Meteo indisponível') },
      20,
    ),
    null,
  )
  assert.equal(
    await resolveWeatherWithinDeadline(
      async () => { throw new Error('Geolocalização indisponível') },
      20,
    ),
    null,
  )
})

test('handles a late rejection after the deadline without an unhandled rejection', async () => {
  let rejectWeather
  const lateWeather = new Promise((resolve, reject) => {
    rejectWeather = reject
  })
  const unhandled = []
  const onUnhandledRejection = (reason) => unhandled.push(reason)
  process.on('unhandledRejection', onUnhandledRejection)

  try {
    assert.equal(
      await resolveWeatherWithinDeadline(() => lateWeather, 5),
      null,
    )
    rejectWeather(new Error('resposta tardia'))
    await new Promise((resolve) => setImmediate(resolve))
    assert.deepEqual(unhandled, [])
  } finally {
    process.off('unhandledRejection', onUnhandledRejection)
  }
})
