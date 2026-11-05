const controlCharacterPattern = /[\u0000-\u001f\u007f-\u009f]/

export const requiredSourceFields = ['officialSource', 'coordinateSource']

export const optionalSourceFields = [
  'addressSource',
  'aliasSource',
  'architectRoleSource',
  'architecturalSource',
  'attributionSource',
  'currentBuildingSource',
  'historicalSource',
  'namingSource',
  'openingSource',
  'pdaAwardSource',
  'renovationSource',
  'yearConflictSource',
  'yearSource',
  'yearSourceAdditional',
]

const knownSourceFields = new Set([...requiredSourceFields, ...optionalSourceFields])

export const isValidPublicationUrl = (value) => {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value || controlCharacterPattern.test(value)) return false

  try {
    const url = new URL(value)
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password
  } catch {
    return false
  }
}

export const getSourceUrlFailures = (building) => {
  const failures = []

  for (const field of requiredSourceFields) {
    if (!isValidPublicationUrl(building[field])) failures.push(`${field} must be a valid HTTPS URL.`)
  }

  for (const field of optionalSourceFields) {
    if (building[field] !== undefined && building[field] !== null && !isValidPublicationUrl(building[field])) {
      failures.push(`${field} must be a valid HTTPS URL when provided.`)
    }
  }

  for (const field of Object.keys(building)) {
    if (field.endsWith('Source') && !knownSourceFields.has(field)) failures.push(`${field} is an unrecognized source URL field.`)
  }

  return failures
}
