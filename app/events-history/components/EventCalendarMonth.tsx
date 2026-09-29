import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNavigate } from 'react-router'
import type { Event } from '../../utils/interfaces'
import styles from './EventCalendarMonth.module.css'

interface EventCalendarMonthProps {
  events: Event[]
}

function occursOnCivilDay(event: Event, civilDay: string) {
  const endDate = event.endDate || event.startDate
  return event.startDate <= civilDay && endDate >= civilDay
}

function sortEventsForDay(events: Event[]) {
  return [...events].sort((first, second) => {
    if (first.allDay !== second.allDay) {
      return first.allDay ? -1 : 1
    }

    const timeOrder = (first.startTime ?? '99:99').localeCompare(
      second.startTime ?? '99:99',
    )

    return timeOrder !== 0
      ? timeOrder
      : first.title.localeCompare(second.title, 'pt-BR')
  })
}

export default function EventCalendarMonth({ events }: EventCalendarMonthProps) {
  const navigate = useNavigate()
  const referenceDate = new Date()
  const monthStart = startOfMonth(referenceDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(endOfMonth(referenceDate), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    format(addDays(calendarStart, index), 'EEE', { locale: ptBR }),
  )

  const monthLabel = format(referenceDate, "MMMM 'de' yyyy", { locale: ptBR })
  const formattedMonthLabel =
    monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  return (
    <section className={styles.section} aria-labelledby="events-calendar-month">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Calendário</p>
          <h2 id="events-calendar-month" className={styles.title}>
            {formattedMonthLabel}
          </h2>
        </div>
        <span className={styles.hint}>Mês atual</span>
      </header>

      <div className={styles.viewport}>
        <div className={styles.calendar}>
          {weekdayLabels.map((label) => (
            <div key={label} className={styles.weekday} aria-hidden="true">
              {label}
            </div>
          ))}

          {days.map((day) => {
            const civilDay = format(day, 'yyyy-MM-dd')
            const dayEvents = sortEventsForDay(
              events.filter((event) => occursOnCivilDay(event, civilDay)),
            )
            const outsideMonth = !isSameMonth(day, referenceDate)

            return (
              <div
                key={civilDay}
                className={[
                  styles.day,
                  outsideMonth ? styles.dayOutside : '',
                  isToday(day) ? styles.dayToday : '',
                ].filter(Boolean).join(' ')}
              >
                <div className={styles.dayHeader}>
                  <time dateTime={civilDay} className={styles.dayNumber}>
                    {format(day, 'd')}
                  </time>
                  {dayEvents.length > 0 && (
                    <span className={styles.dayCount}>
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                <div className={styles.events}>
                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      className={styles.event}
                      onClick={() => navigate(`/events-history/${event.id}`)}
                      title={event.title}
                    >
                      <span className={styles.eventTitle}>{event.title}</span>
                      {!event.allDay
                        && event.startDate === civilDay
                        && event.startTime && (
                          <span className={styles.eventTime}>{event.startTime}</span>
                        )}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
