import assert from 'node:assert/strict'
import test from 'node:test'

import { getSourceUrlFailures, isValidPublicationUrl } from './publication-url.mjs'

test('accepts a valid absolute HTTPS URL', () => {
  assert.equal(isValidPublicationUrl('https://example.com/path?item=1#details'), true)
})

test('rejects unsafe or malformed URLs', () => {
  const invalidUrls = [
    '',
    'http://example.com',
    'javascript:alert(1)',
    'data:text/plain,hello',
    'not a URL',
    'https://',
    'https://user:password@example.com',
    'https://example.com/\u0000control',
    ' https://example.com',
    'https://example.com ',
  ]

  for (const url of invalidUrls) assert.equal(isValidPublicationUrl(url), false, url)
})

test('requires official and coordinate source URLs', () => {
  assert.deepEqual(getSourceUrlFailures({}), [
    'officialSource must be a valid HTTPS URL.',
    'coordinateSource must be a valid HTTPS URL.',
  ])
})

test('rejects an invalid optional source URL', () => {
  const failures = getSourceUrlFailures({
    officialSource: 'https://example.com/official',
    coordinateSource: 'https://example.com/coordinates',
    openingSource: 'http://example.com/opening',
  })

  assert.deepEqual(failures, ['openingSource must be a valid HTTPS URL when provided.'])
})

test('does not treat sourceNote as a URL', () => {
  assert.deepEqual(getSourceUrlFailures({
    officialSource: 'https://example.com/official',
    coordinateSource: 'https://example.com/coordinates',
    sourceNote: 'Primary project page was not available; attribution is documented separately.',
  }), [])
})

test('flags newly added source URL fields until they are reviewed', () => {
  const failures = getSourceUrlFailures({
    officialSource: 'https://example.com/official',
    coordinateSource: 'https://example.com/coordinates',
    futureSource: 'https://example.com/future',
  })

  assert.deepEqual(failures, ['futureSource is an unrecognized source URL field.'])
})
