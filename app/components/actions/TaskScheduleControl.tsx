'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { format } from 'date-fns'
import { db } from '../../utils/firebaseConfig'
import type { Event } from '../../utils/interfaces'
import type { WeekdayName } from '../../types/automation'
import type { TaskSchedule } from '../../types/tasks'
import { formatDate } from '../../utils/datePresentation'
import styles from './TaskScheduleControl.module.css'

interface TaskScheduleControlProps {
  uid: string
  value?: TaskSchedule
  onChange: (value: TaskSchedule | undefined) => void
}

const weekdays: Array<{ value: WeekdayName; label: string }> = [
  { value: 'monday', label: 'Seg' },
  { value: 'tuesday', label: 'Ter' },
  { value: 'wednesday', label: 'Qua' },
  { value: 'thursday', label: 'Qui' },
  { value: 'friday', label: 'Sex' },
  { value: 'saturday', label: 'Sáb' },
  { value: 'sunday', label: 'Dom' },
]

export default function TaskScheduleControl({
  uid,
  value,
  onChange,
}: TaskScheduleControlProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const eventRelativeId = value?.type === 'eventRelative' ? value.eventId : undefined

  useEffect(() => {
    let active = true

    if (value?.type !== 'eventRelative') {
      setEvents([])
      return () => {
        active = false
      }
    }

    const loadEvents = async () => {
      if (!uid) return

      setEventsLoading(true)

      try {
        const today = format(new Date(), 'yyyy-MM-dd')
        const snapshot = await getDocs(
          query(
            collection(db, `users/${uid}/events-history`),
            where('startDate', '>=', today),
            orderBy('startDate'),
          ),
        )

        if (!active) return

        setEvents(
          snapshot.docs.map(document => ({
            id: document.id,
            ...document.data(),
          }) as Event),
        )
      } catch (error) {
        console.error('Erro ao carregar eventos para a programação:', error)
      } finally {
        if (active) setEventsLoading(false)
      }
    }

    loadEvents()

    return () => {
      active = false
    }
  }, [uid, value?.type])

  useEffect(() => {
    if (value?.type !== 'eventRelative' || eventRelativeId || events.length === 0) {
      return
    }

    onChange({ ...value, eventId: events[0].id })
  }, [events, eventRelativeId, onChange, value?.type])

  const scheduleType = value?.type ?? 'none'

  const selectType = (type: string) => {
    if (type === 'none') {
      onChange(undefined)
    } else if (type === 'daily') {
      onChange({ type: 'daily' })
    } else if (type === 'weekly') {
      onChange({ type: 'weekly', weekdays: [] })
    } else if (type === 'monthly') {
      onChange({ type: 'monthly', dayOfMonth: 1 })
    } else {
      onChange({
        type: 'eventRelative',
        eventId: events[0]?.id ?? '',
        leadDays: 14,
      })
    }
  }

  const toggleWeekday = (weekday: WeekdayName, selected: boolean) => {
    if (value?.type !== 'weekly') return

    const current = value.weekdays ?? []
    const next = selected
      ? Array.from(new Set([...current, weekday]))
      : current.filter(candidate => candidate !== weekday)

    onChange({ ...value, weekdays: next })
  }

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Planejamento / programação</legend>
      <p className={styles.description}>
        Define quando esta tarefa volta a ser considerada nas ações.
      </p>

      <label className={styles.field}>
        <span>Tipo de programação</span>
        <select
          className={styles.select}
          value={scheduleType}
          onChange={event => selectType(event.currentTarget.value)}
        >
          <option value="none">Avulsa</option>
          <option value="daily">Diária</option>
          <option value="weekly">Semanal</option>
          <option value="monthly">Mensal</option>
          <option value="eventRelative">Relativa a evento</option>
        </select>
      </label>

      {value?.type === 'weekly' && (
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Dias preferidos (opcional)</span>
          <div className={styles.weekdays}>
            {weekdays.map(weekday => (
              <label className={styles.weekday} key={weekday.value}>
                <input
                  type="checkbox"
                  checked={value.weekdays?.includes(weekday.value) ?? false}
                  onChange={event =>
                    toggleWeekday(weekday.value, event.currentTarget.checked)}
                />
                <span>{weekday.label}</span>
              </label>
            ))}
          </div>
          {(!value.weekdays || value.weekdays.length === 0) && (
            <p className={styles.hint}>Sem dia fixo: pertence à semana atual.</p>
          )}
        </div>
      )}

      {value?.type === 'monthly' && (
        <label className={styles.field}>
          <span>Dia do mês</span>
          <input
            className={styles.numberInput}
            type="number"
            min="1"
            max="31"
            value={value.dayOfMonth}
            onChange={event => onChange({
              ...value,
              dayOfMonth: Math.max(1, Math.min(31, Number(event.currentTarget.value))),
            })}
          />
        </label>
      )}

      {value?.type === 'eventRelative' && (
        <div className={styles.detail}>
          <label className={styles.field}>
            <span>Evento relacionado</span>
            <select
              className={styles.select}
              value={value.eventId}
              disabled={eventsLoading || events.length === 0}
              onChange={event => onChange({ ...value, eventId: event.currentTarget.value })}
            >
              {value.eventId && !events.some(event => event.id === value.eventId) && (
                <option value={value.eventId}>Evento indisponível</option>
              )}
              {events.length === 0 ? (
                <option value="">Nenhum evento futuro disponível</option>
              ) : (
                events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title} · {formatDate(event.startDate)}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className={styles.field}>
            <span>Começar quantos dias antes</span>
            <input
              className={styles.numberInput}
              type="number"
              min="0"
              max="365"
              value={value.leadDays}
              onChange={event => onChange({
                ...value,
                leadDays: Math.max(0, Math.min(365, Number(event.currentTarget.value))),
              })}
            />
          </label>
        </div>
      )}
    </fieldset>
  )
}
