// utils/dateHelpers.ts
import { addDays, addMinutes, format, parseISO } from 'date-fns'

/** Retorna a data de hoje em formato YYYY-MM-DD (ISO) */
export function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Formata uma data local como uma data civil YYYY-MM-DD. */
export function formatLocalDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Formata uma data local como hora HH:MM. */
export function formatLocalTime(date: Date): string {
  return format(date, 'HH:mm')
}

/** Retorna a data civil seguinte sem converter o valor por UTC. */
export function getNextCivilDate(dateStr: string): string {
  return formatLocalDate(addDays(parseISO(dateStr), 1))
}

/** Cria um instante local a partir de uma data civil e de um horário civil. */
export function getLocalDateTime(dateStr: string, time: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}

/** Soma minutos a uma data/hora civil e preserva a virada de dia local. */
export function getLocalDateTimeAfter(
  dateStr: string,
  time: string,
  minutes: number,
): { date: string; time: string } {
  const result = addMinutes(getLocalDateTime(dateStr, time), minutes)
  return {
    date: formatLocalDate(result),
    time: formatLocalTime(result),
  }
}

/** Retorna a hora atual em formato HH:MM */
export function getNowTime(): string {
  const now = new Date()
  return now.toTimeString().slice(0, 5) // ex: '14:30'
}

export function getNowTimeRounded() {
    const now = new Date()
    const hours = now.getHours().toString().padStart(2, '0')
    return `${hours}:00`
}

/** Retorna uma string HH:MM representando uma hora após o horário passado (HH:MM) */
export function getTimePlusOneHour(time: string): string {
  return getLocalDateTimeAfter(getTodayISO(), time, 60).time
}
