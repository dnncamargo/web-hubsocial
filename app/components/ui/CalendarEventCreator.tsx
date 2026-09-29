'use client'

import useEventDate from '../../hooks/useEventDate'
import styles from './CalendarEventCreator.module.css'

type DateControl = ReturnType<typeof useEventDate>

type CalendarEventCreatorProps = Pick<
  DateControl,
  | 'allDay'
  | 'setAllDay'
  | 'startDate'
  | 'setStartDate'
  | 'endDate'
  | 'setEndDate'
  | 'startTime'
  | 'handleStartTimeChange'
  | 'endTime'
  | 'setEndTime'
>

export default function CalendarEventCreator({
  allDay,
  setAllDay,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  startTime,
  handleStartTimeChange,
  endTime,
  setEndTime,
}: CalendarEventCreatorProps) {
  return (
    <div className={styles.control}>
      <div className={styles.switchRow}>
        <span className={styles.label}>Dia inteiro</span>
        <button
          type="button"
          role="switch"
          aria-checked={allDay}
          onClick={() => setAllDay(!allDay)}
          className={allDay
            ? `${styles.switch} ${styles.switchActive}`
            : styles.switch}
        >
          <span
            className={allDay
              ? `${styles.switchThumb} ${styles.switchThumbActive}`
              : styles.switchThumb}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className={styles.row}>
        <label className={styles.label} htmlFor="event-start-date">Início</label>
        <div className={styles.inputs}>
          <input
            id="event-start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className={styles.input}
          />
          {!allDay && (
            <input
              type="time"
              step="300"
              value={startTime}
              aria-label="Horário de início"
              onChange={(event) => handleStartTimeChange(event.target.value)}
              className={styles.input}
            />
          )}
        </div>
      </div>

      <div className={styles.row}>
        <label className={styles.label} htmlFor="event-end-date">Término</label>
        <div className={styles.inputs}>
          <input
            id="event-end-date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className={styles.input}
          />
          {!allDay && (
            <input
              type="time"
              step="300"
              value={endTime}
              aria-label="Horário de término"
              onChange={(event) => setEndTime(event.target.value)}
              className={styles.input}
            />
          )}
        </div>
      </div>
    </div>
  )
}
