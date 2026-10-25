import assert from 'node:assert/strict'
import test from 'node:test'
import { parseWeatherPayloads } from '../src/weather.ts'

test('parses the current data.gov.sg forecast object shape', () => {
  const result = parseWeatherPayloads(
    { data: { readings: [{ data: [{ value: 28.3 }, { value: 29.1 }, { value: 30 }] }] } },
    { data: { records: [{ general: { forecast: { text: 'Partly Cloudy (Day)', code: 'PC' } } }] } },
  )

  assert.deepEqual(result, { temperature: 29, condition: 'Partly Cloudy (Day)' })
})

test('accepts the legacy string forecast shape', () => {
  const result = parseWeatherPayloads(
    { data: { readings: [{ value: 27 }, { value: 29 }] } },
    { data: { records: [{ general: { forecast: 'Fair & Warm' } }] } },
  )

  assert.deepEqual(result, { temperature: 28, condition: 'Fair & Warm' })
})

test('degrades malformed or missing weather data to null', () => {
  assert.deepEqual(
    parseWeatherPayloads(
      { data: { readings: [{ data: [{ value: 'not-a-number' }, {}] }] } },
      { data: { records: [{ general: { forecast: { text: 42 } } }] } },
    ),
    { temperature: null, condition: null },
  )
  assert.deepEqual(parseWeatherPayloads(null, null), { temperature: null, condition: null })
})
