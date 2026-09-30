const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const

export interface CivilDateParts {
  year: number
  month: number
  day: number
  date: Date
}

export interface DatePresentationOptions {
  referenceDate?: Date
  referenceYear?: number
}

export interface FormattedDateRange {
  start: string
  end?: string
}

export function parseCivilDate(value: unknown): CivilDateParts | null {
  if (typeof value !== 'string') return null

  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(0)

  date.setFullYear(year, month - 1, day)
  date.setHours(12, 0, 0, 0)

  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null
  }

  return { year, month, day, date }
}

export function formatSpecificDate(
  value: string | null | undefined,
  options: DatePresentationOptions = {},
): string {
  const parts = parseCivilDate(value)
  if (!parts) return ''

  const referenceYear = options.referenceYear
    ?? options.referenceDate?.getFullYear()
    ?? new Date().getFullYear()
  const yearSuffix = parts.year === referenceYear ? '' : ` ${parts.year}`

  return `${WEEKDAYS[parts.date.getDay()]}, ${parts.day} ${MONTHS[parts.month - 1]}${yearSuffix}`
}

export function formatSpecificDateTime(
  value: string | null | undefined,
  time?: string | null,
  options: DatePresentationOptions = {},
): string {
  const date = formatSpecificDate(value, options)
  const normalizedTime = normalizeTime(time)

  if (!date || !normalizedTime) return date
  return `${date} · ${normalizedTime}`
}

export function formatDirectDate(value: string | null | undefined): string {
  const parts = parseCivilDate(value)
  if (!parts) return formatCompactDate(value)
  if (!parts.year) return formatCompactDate(value)

  return `${String(parts.day).padStart(2, '0')} / ${MONTHS[parts.month - 1]} / ${parts.year}`
}

export function formatCompactDate(value: string | null | undefined): string {
  const parts = parseCivilDate(value) ?? parseCivilMonthDay(value)
  if (!parts) return ''

  return `${parts.day}/${MONTHS[parts.month - 1]}`
}

export function formatMonthYear(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function formatSpecificDateRange(
  startDate: string,
  endDate: string,
  _startTime?: string,
  _endTime?: string,
  _allDay = false,
  options: DatePresentationOptions = {},
): FormattedDateRange {
  const start = formatSpecificDate(startDate, options)
  const end = formatSpecificDate(endDate, options)
  if (!start) return { start: '' }

  const sameDay = Boolean(end) && startDate.trim() === endDate.trim()
  if (sameDay || !end) {
    return { start }
  }

  const startParts = parseCivilDate(startDate)
  const endParts = parseCivilDate(endDate)
  const crossesYear = Boolean(startParts && endParts && startParts.year !== endParts.year)

  return {
    start: formatCompactDateWithYear(startDate, crossesYear),
    end: formatCompactDateWithYear(endDate, crossesYear),
  }
}

export function formatTimeRange(startTime?: string | null, endTime?: string | null): string {
  const normalizedStartTime = normalizeTime(startTime)
  if (!normalizedStartTime) return ''

  const normalizedEndTime = normalizeTime(endTime)
  return normalizedEndTime && normalizedEndTime !== normalizedStartTime
    ? `${normalizedStartTime}–${normalizedEndTime}`
    : normalizedStartTime
}

function formatCompactDateWithYear(value: string, includeYear: boolean): string {
  const compact = formatCompactDate(value)
  if (!includeYear) return compact

  const parts = parseCivilDate(value)
  return parts ? `${compact} ${parts.year}` : compact
}

function normalizeTime(value?: string | null): string {
  if (typeof value !== 'string') return ''
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.trim()) ? value.trim() : ''
}

function parseCivilMonthDay(value: unknown): Pick<CivilDateParts, 'month' | 'day'> | null {
  if (typeof value !== 'string') return null

  const match = value.trim().match(/^--(\d{2})-(\d{2})$/)
  if (!match) return null

  const month = Number(match[1])
  const day = Number(match[2])
  const date = new Date(0)
  date.setFullYear(2000, month - 1, day)

  return date.getMonth() === month - 1 && date.getDate() === day
    ? { month, day }
    : null
}
