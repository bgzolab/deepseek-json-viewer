const DATE_ONLY_NUMBER = /^\d+$/

export function parseTimestamp(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined

  if (typeof value === 'number' && Number.isFinite(value)) {
    return fromEpoch(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined

    if (DATE_ONLY_NUMBER.test(trimmed)) {
      return fromEpoch(Number(trimmed))
    }

    const parsed = Date.parse(trimmed)
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString()
    }
  }

  return undefined
}

function fromEpoch(value: number): string | undefined {
  let milliseconds = value
  if (value > 0 && value < 1e11) milliseconds = value * 1000
  else if (value >= 1e14) milliseconds = value / 1000

  const date = new Date(milliseconds)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

export function toTime(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}
