const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const

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

export function formatDate(
  value: string | null | undefined,
  options: DatePresentationOptions = {},
): string {
  const parts = parseCivilDate(value)
  if (!parts) return ''

  const referenceYear = getReferenceYear(options)
  const yearSuffix = parts.year === referenceYear ? '' : ` ${parts.year}`

  return `${parts.day} ${MONTHS[parts.month - 1]}${yearSuffix}`
}

export function formatDateTime(
  value: string | null | undefined,
  time?: string | null,
  options: DatePresentationOptions = {},
): string {
  const date = formatDate(value, options)
  const normalizedTime = normalizeTime(time)

  if (!date || !normalizedTime) return date
  return `${date} · ${normalizedTime}`
}

export function formatDirectDate(value: string | null | undefined): string {
  const parts = parseCivilDate(value)
  if (!parts) return formatCompactDate(value)
  if (!parts.year) return formatCompactDate(value)

  return `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}`
}

export function formatCompactDate(value: string | null | undefined): string {
  const parts = parseCivilDate(value) ?? parseCivilMonthDay(value)
  if (!parts) return ''

  return `${parts.day} ${MONTHS[parts.month - 1]}`
}

export function formatMonthYear(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function formatDateRange(
  startDate: string,
  endDate: string,
  options: DatePresentationOptions = {},
): FormattedDateRange {
  const startParts = parseCivilDate(startDate)
  const endParts = parseCivilDate(endDate)
  if (!startParts) return { start: '' }
  if (!endParts) return { start: formatDate(startDate, options) }

  const sameDay = isSameCivilDate(startParts, endParts)
  if (sameDay) return { start: formatDate(startDate, options) }

  const sameYear = startParts.year === endParts.year
  const sameMonth = sameYear && startParts.month === endParts.month
  const referenceYear = getReferenceYear(options)

  if (!sameYear) {
    return {
      start: formatDayMonthYear(startParts),
      end: formatDayMonthYear(endParts),
    }
  }

  return {
    start: sameMonth ? String(startParts.day) : formatDayMonth(startParts),
    end: `${formatDayMonth(endParts)}${startParts.year === referenceYear ? '' : ` ${startParts.year}`}`,
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

function getReferenceYear(options: DatePresentationOptions): number {
  return options.referenceYear
    ?? options.referenceDate?.getFullYear()
    ?? new Date().getFullYear()
}

function isSameCivilDate(left: CivilDateParts, right: CivilDateParts): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day
}

function formatDayMonth(parts: Pick<CivilDateParts, 'month' | 'day'>): string {
  return `${parts.day} ${MONTHS[parts.month - 1]}`
}

function formatDayMonthYear(parts: Pick<CivilDateParts, 'year' | 'month' | 'day'>): string {
  return `${formatDayMonth(parts)} ${parts.year}`
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
