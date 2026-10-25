export type WeatherState = { temperature: number | null; condition: string | null }

type JsonRecord = Record<string, unknown>

const asRecord = (value: unknown): JsonRecord | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : null

const getRecord = (record: JsonRecord | null, key: string): JsonRecord | null =>
  asRecord(record?.[key])

const normalizeCondition = (value: unknown): string | null => {
  if (typeof value === 'string') return value
  const record = asRecord(value)
  return typeof record?.text === 'string' ? record.text : null
}

const parseTemperature = (payload: unknown): number | null => {
  const data = getRecord(asRecord(payload), 'data')
  const readings = data?.readings
  if (!Array.isArray(readings)) return null

  const firstReading = asRecord(readings[0])
  const candidates = Array.isArray(firstReading?.data) ? firstReading.data : readings
  const values = candidates
    .map((reading) => Number(asRecord(reading)?.value))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b)

  if (!values.length) return null
  const middle = Math.floor(values.length / 2)
  const median = values.length % 2
    ? values[middle]
    : (values[middle - 1] + values[middle]) / 2
  return Math.round(median)
}

const parseCondition = (payload: unknown): string | null => {
  const data = getRecord(asRecord(payload), 'data')
  if (!data) return null

  const records = data.records
  const items = data.items
  const forecastRecord = Array.isArray(records)
    ? asRecord(records[0])
    : Array.isArray(items)
      ? asRecord(items[0])
      : data
  if (!forecastRecord) return null

  const general = getRecord(forecastRecord, 'general')
  return normalizeCondition(
    general?.forecast ?? general?.condition ?? forecastRecord.forecast ?? null,
  )
}

export const parseWeatherPayloads = (
  temperaturePayload: unknown,
  forecastPayload: unknown,
): WeatherState => ({
  temperature: parseTemperature(temperaturePayload),
  condition: parseCondition(forecastPayload),
})
