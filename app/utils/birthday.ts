export interface BirthdayParts {
  day: number
  month: number
  year?: number
}

export interface BirthdayValidationOptions {
  today?: Date
}

const BIRTHDAY_PARTIAL_PATTERN = /^--(\d{2})-(\d{2})$/
const BIRTHDAY_FULL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MIN_BIRTH_YEAR = 1000

export function parseBirthday(value: unknown): BirthdayParts | null {
  if (typeof value !== 'string') return null

  const normalized = value.trim()
  if (!normalized) return null

  const partialMatch = normalized.match(BIRTHDAY_PARTIAL_PATTERN)
  if (partialMatch) {
    const [, month, day] = partialMatch
    return isValidBirthdayParts({ month: Number(month), day: Number(day) })
      ? { month: Number(month), day: Number(day) }
      : null
  }

  const fullMatch = normalized.match(BIRTHDAY_FULL_PATTERN)
  if (!fullMatch) return null

  const [, year, month, day] = fullMatch
  const numericYear = Number(year)
  const parts = { year: numericYear, month: Number(month), day: Number(day) }

  if (!isValidBirthdayParts(parts)) return null

  // Google Contacts historically used 0000 for a birthday without a year.
  return numericYear === 0
    ? { month: parts.month, day: parts.day }
    : parts
}

export function serializeBirthday(parts: BirthdayParts | null): string {
  if (!parts || !isValidBirthdayParts(parts)) return ''

  const month = String(parts.month).padStart(2, '0')
  const day = String(parts.day).padStart(2, '0')
  return parts.year === undefined || parts.year === 0
    ? `--${month}-${day}`
    : `${String(parts.year).padStart(4, '0')}-${month}-${day}`
}

export function normalizeBirthday(value: string | null | undefined): string {
  return serializeBirthday(parseBirthday(value))
}

export function formatBirthday(value: string | null | undefined): string {
  const parts = parseBirthday(value)
  if (!parts) return ''

  const formatted = `${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}`
  return parts.year === undefined ? formatted : `${formatted}/${parts.year}`
}

export function birthdayMonthDay(value: string | null | undefined): Pick<BirthdayParts, 'month' | 'day'> | null {
  const parts = parseBirthday(value)
  return parts ? { month: parts.month, day: parts.day } : null
}

export function birthdayHasYear(value: string | null | undefined): boolean {
  return parseBirthday(value)?.year !== undefined
}

export function birthdayDateForYear(value: string | null | undefined, year: number): Date | null {
  const monthDay = birthdayMonthDay(value)
  if (!monthDay || !Number.isInteger(year)) return null
  if (!isValidBirthdayParts({ ...monthDay, year })) return null

  return new Date(year, monthDay.month - 1, monthDay.day)
}

export function validateBirthday(
  value: string | null | undefined,
  options: BirthdayValidationOptions = {},
): string | null {
  if (!value?.trim()) return null

  const parts = parseBirthday(value)
  if (!parts) return 'Informe uma data de aniversário válida.'
  if (parts.year === undefined) return null

  const currentYear = (options.today ?? new Date()).getFullYear()
  if (parts.year < MIN_BIRTH_YEAR || parts.year > currentYear) {
    return 'Informe um ano de nascimento válido.'
  }

  return null
}

function isValidBirthdayParts(parts: BirthdayParts): boolean {
  if (!Number.isInteger(parts.month) || parts.month < 1 || parts.month > 12) return false
  if (!Number.isInteger(parts.day) || parts.day < 1) return false
  if (parts.year !== undefined && (!Number.isInteger(parts.year) || parts.year < 0 || parts.year > 9999)) {
    return false
  }

  return parts.day <= daysInMonth(parts.month, parts.year)
}

function daysInMonth(month: number, year?: number): number {
  if (month === 2) {
    if (year === undefined) return 29
    return isLeapYear(year) ? 29 : 28
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}
