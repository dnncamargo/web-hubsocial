import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { Event } from '../../utils/interfaces'
import { getEntityColor, type EntityColorMap } from '../../utils/entityColors'
import styles from './EventCalendarMonth.module.css'

interface EventCalendarMonthProps {
  events: Event[]
  categoryColors?: EntityColorMap
}

interface CalendarSegment {
  event: Event
  startColumn: number
  endColumn: number
  continuesBefore: boolean
  continuesAfter: boolean
  lane: number
}

interface CalendarWeek {
  days: Date[]
  segments: CalendarSegment[]
  laneCount: number
}

function getEventEndDate(event: Event) {
  return event.endDate && event.endDate >= event.startDate
    ? event.endDate
    : event.startDate
}

function occursOnCivilDay(event: Event, civilDay: string) {
  const endDate = getEventEndDate(event)
  return event.startDate <= civilDay && endDate >= civilDay
}

function compareEvents(first: Event, second: Event) {
  const dateOrder = first.startDate.localeCompare(second.startDate)
  if (dateOrder !== 0) return dateOrder

  if (first.allDay !== second.allDay) {
    return first.allDay ? -1 : 1
  }

  const timeOrder = (first.startTime ?? '99:99').localeCompare(
    second.startTime ?? '99:99',
  )

  if (timeOrder !== 0) return timeOrder

  const titleOrder = first.title.localeCompare(second.title, 'pt-BR')
  return titleOrder !== 0 ? titleOrder : first.id.localeCompare(second.id)
}

function sortEvents(events: Event[]) {
  return [...events].sort(compareEvents)
}

function getWeeks(days: Date[]) {
  return Array.from(
    { length: Math.ceil(days.length / 7) },
    (_, weekIndex) => days.slice(weekIndex * 7, weekIndex * 7 + 7),
  )
}

function createCalendarWeeks(
  events: Event[],
  days: Date[],
  calendarStart: Date,
  calendarEnd: Date,
): CalendarWeek[] {
  const calendarStartCivil = format(calendarStart, 'yyyy-MM-dd')
  const calendarEndCivil = format(calendarEnd, 'yyyy-MM-dd')

  return getWeeks(days).map((weekDays) => {
    const weekStartCivil = format(weekDays[0], 'yyyy-MM-dd')
    const weekEndCivil = format(weekDays[6], 'yyyy-MM-dd')
    const unpositionedSegments = sortEvents(events).flatMap((event) => {
      const eventEndDate = getEventEndDate(event)

      if (eventEndDate < calendarStartCivil || event.startDate > calendarEndCivil) {
        return []
      }

      const segmentStart = event.startDate > weekStartCivil
        ? event.startDate
        : weekStartCivil
      const segmentEnd = eventEndDate < weekEndCivil
        ? eventEndDate
        : weekEndCivil

      if (segmentStart > segmentEnd) return []

      const startColumn = weekDays.findIndex(
        day => format(day, 'yyyy-MM-dd') === segmentStart,
      ) + 1
      const endColumn = weekDays.findIndex(
        day => format(day, 'yyyy-MM-dd') === segmentEnd,
      ) + 1

      return [{
        event,
        startColumn,
        endColumn,
        continuesBefore: event.startDate < segmentStart,
        continuesAfter: eventEndDate > segmentEnd,
        lane: 0,
      }]
    })

    const laneEnds: number[] = []
    const segments = unpositionedSegments
      .sort((first, second) => {
        const columnOrder = first.startColumn - second.startColumn
        if (columnOrder !== 0) return columnOrder

        const spanOrder = second.endColumn - first.endColumn
        if (spanOrder !== 0) return spanOrder

        return compareEvents(first.event, second.event)
      })
      .map((segment) => {
        let lane = laneEnds.findIndex(lastColumn => lastColumn < segment.startColumn)

        if (lane === -1) {
          lane = laneEnds.length
        }

        laneEnds[lane] = segment.endColumn
        return { ...segment, lane }
      })

    return {
      days: weekDays,
      segments,
      laneCount: laneEnds.length,
    }
  })
}

export default function EventCalendarMonth({ events, categoryColors }: EventCalendarMonthProps) {
  const navigate = useNavigate()
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()))
  const monthStart = visibleMonth
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weeks = createCalendarWeeks(events, days, calendarStart, calendarEnd)
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    format(addDays(calendarStart, index), 'EEE', { locale: ptBR }),
  )
  const currentMonth = startOfMonth(new Date())
  const isCurrentMonth = isSameMonth(monthStart, currentMonth)

  const monthLabel = format(monthStart, "MMMM 'de' yyyy", { locale: ptBR })
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

        <div className={styles.controls} aria-label="Navegação do calendário">
          <button
            type="button"
            className={styles.navButton}
            onClick={() => setVisibleMonth(previous => subMonths(previous, 1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className={styles.navIcon} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.todayButton}
            onClick={() => setVisibleMonth(currentMonth)}
            disabled={isCurrentMonth}
          >
            Hoje
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => setVisibleMonth(previous => addMonths(previous, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className={styles.navIcon} aria-hidden="true" />
          </button>
          <span className={styles.hint}>
            {isCurrentMonth ? 'Mês atual' : 'Navegação mensal'}
          </span>
        </div>
      </header>

      <div className={styles.viewport}>
        <div className={styles.calendar}>
          {weekdayLabels.map((label) => (
            <div key={label} className={styles.weekday} aria-hidden="true">
              {label}
            </div>
          ))}

          {weeks.map((week, weekIndex) => (
            <div
              key={format(week.days[0], 'yyyy-MM-dd')}
              className={styles.week}
              style={{
                minHeight: `${Math.max(8, 4.5 + week.laneCount * 1.55)}rem`,
              }}
            >
              {week.days.map((day) => {
                const civilDay = format(day, 'yyyy-MM-dd')
                const dayEvents = sortEvents(
                  events.filter(event => occursOnCivilDay(event, civilDay)),
                )
                const outsideMonth = !isSameMonth(day, monthStart)

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
                  </div>
                )
              })}

              <div className={styles.eventLayer} aria-label={`Eventos da semana ${weekIndex + 1}`}>
                {week.segments.map((segment) => {
                  const { event } = segment
                  const startsInSegment = !segment.continuesBefore
                  const endsInSegment = !segment.continuesAfter
                  const showStartTime =
                    startsInSegment && !event.allDay && Boolean(event.startTime)
                  const className = [
                    styles.event,
                    startsInSegment ? styles.eventStart : styles.eventContinuesBefore,
                    endsInSegment ? styles.eventEnd : styles.eventContinuesAfter,
                  ].join(' ')
                  const eventTime = showStartTime && event.startTime
                    ? `, começa às ${event.startTime}`
                    : ''

                  return (
                    <button
                      key={`${event.id}-${weekIndex}`}
                      type="button"
                      className={className}
                      style={{
                        gridColumn: `${segment.startColumn} / ${segment.endColumn + 1}`,
                        gridRow: segment.lane + 1,
                      }}
                      onClick={() => navigate(`/events-history/${event.id}`)}
                      title={event.title}
                      aria-label={`${event.title}${eventTime}`}
                    >
                      <span className={styles.eventTitle}>{event.title}</span>
                      {showStartTime && event.startTime && (
                        <span className={styles.eventTime}>{event.startTime}</span>
                      )}
                      {event.categories && event.categories.length > 0 && (
                        <span className={styles.eventCategoryMarkers} aria-hidden="true">
                          {event.categories.map(category => {
                            const color = getEntityColor(categoryColors, category)
                            return (
                              <span
                                key={category}
                                className={styles.eventCategoryMarker}
                                style={color ? { '--entity-color': color } as React.CSSProperties : undefined}
                              />
                            )
                          })}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
