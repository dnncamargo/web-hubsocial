'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { format } from 'date-fns'
import { db } from '../../utils/firebaseConfig'
import type { Event } from '../../utils/interfaces'
import type { WeekdayName } from '../../types/automation'
import type { TaskEventAssociation, TaskNature, TaskSchedule } from '../../types/tasks'
import { formatDate } from '../../utils/datePresentation'
import {
  changeTaskFrequency,
  changeTaskNature,
  changeWeeklyMode,
  toggleTaskWeekday,
} from '../../utils/taskAuthoring'
import styles from './TaskScheduleControl.module.css'

interface TaskScheduleControlProps {
  uid: string
  nature: TaskNature
  value?: TaskSchedule
  onNatureChange: (value: TaskNature) => void
  onChange: (value: TaskSchedule | undefined) => void
  eventAssociation?: TaskEventAssociation
  onEventAssociationChange: (value: TaskEventAssociation | undefined) => void
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
  nature,
  value,
  onNatureChange,
  onChange,
  eventAssociation,
  onEventAssociationChange,
}: TaskScheduleControlProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const selectedAssociationId = eventAssociation?.eventId
  const selectedRelativeId = value?.type === 'eventRelative' ? value.eventId : undefined

  useEffect(() => {
    let active = true

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
        console.error('Erro ao carregar eventos para a tarefa:', error)
      } finally {
        if (active) setEventsLoading(false)
      }
    }

    loadEvents()

    return () => {
      active = false
    }
  }, [uid])

  const changeNature = (nextNature: TaskNature) => {
    onNatureChange(nextNature)
    onChange(changeTaskNature(value, nextNature))
  }

  const selectFrequency = (frequency: string) => {
    if (frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly') {
      onChange(changeTaskFrequency(frequency))
    }
  }

  const selectWeeklyMode = (mode: string) => {
    if (value?.type !== 'weekly') return

    if (mode === 'flexible') {
      onChange(changeWeeklyMode(value, 'flexible'))
      return
    }

    onChange(changeWeeklyMode(value, 'specific'))
  }

  const toggleWeekday = (weekday: WeekdayName, selected: boolean) => {
    if (value?.type !== 'weekly') return

    onChange(toggleTaskWeekday(value, weekday, selected))
  }

  const selectEventAssociation = (eventId: string) => {
    if (value?.type === 'eventRelative') return
    onEventAssociationChange(eventId ? { eventId } : undefined)
  }

  const selectRelativeEvent = (eventId: string) => {
    if (value?.type !== 'eventRelative' || !eventId) return
    onChange({ ...value, eventId })
    onEventAssociationChange({ eventId })
  }

  const selectTemporalRule = (rule: string) => {
    if (rule === 'none') {
      onChange(undefined)
      return
    }

    const eventId = eventAssociation?.eventId ?? events[0]?.id
    if (!eventId) return

    onChange({ type: 'eventRelative', eventId, leadDays: 14 })
    onEventAssociationChange({ eventId })
  }

  const scheduleFrequency = value?.type === 'daily'
    || value?.type === 'weekly'
    || value?.type === 'monthly'
    ? value.type
    : 'daily'
  const weeklyMode = value?.type === 'weekly' && value.weekdays && value.weekdays.length > 0
    ? 'specific'
    : 'flexible'
  const temporalRule = value?.type === 'eventRelative' ? 'eventRelative' : 'none'
  const associationId = selectedAssociationId ?? selectedRelativeId ?? ''

  return (
    <>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Natureza e recorrência</legend>
        <p className={styles.description}>
          A natureza define se a tarefa acontece uma vez ou se repete. O planejamento manual continua separado.
        </p>

        <label className={styles.field}>
          <span>Natureza</span>
          <select
            className={styles.select}
            value={nature}
            onChange={event => changeNature(event.currentTarget.value as TaskNature)}
          >
            <option value="punctual">Pontual</option>
            <option value="recurring">Recorrente</option>
          </select>
        </label>

        {nature === 'recurring' ? (
          <>
            <label className={styles.field}>
              <span>Frequência</span>
              <select
                className={styles.select}
                value={scheduleFrequency}
                onChange={event => selectFrequency(event.currentTarget.value)}
              >
                <option value="daily">Diária</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </select>
            </label>

            {value?.type === 'weekly' && (
              <div className={styles.detail}>
                <label className={styles.field}>
                  <span>Forma semanal</span>
                  <select
                    className={styles.select}
                    value={weeklyMode}
                    onChange={event => selectWeeklyMode(event.currentTarget.value)}
                  >
                    <option value="flexible">Flexível durante a semana</option>
                    <option value="specific">Dias específicos</option>
                  </select>
                </label>

                {weeklyMode === 'specific' && (
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
                )}

                {weeklyMode === 'flexible' && (
                  <p className={styles.hint}>Uma execução em qualquer dia da semana atual.</p>
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
                <p className={styles.hint}>Em meses menores, usa o último dia disponível.</p>
              </label>
            )}
          </>
        ) : (
          <div className={styles.detail}>
            <label className={styles.field}>
              <span>Regra temporal (opcional)</span>
              <select
                className={styles.select}
                value={temporalRule}
                onChange={event => selectTemporalRule(event.currentTarget.value)}
              >
                <option value="none">Nenhuma</option>
                <option value="eventRelative">Antes de um evento</option>
              </select>
            </label>

            {value?.type === 'eventRelative' && (
              <label className={styles.field}>
                <span>Evento da regra temporal</span>
                <select
                  className={styles.select}
                  value={value.eventId}
                  disabled={eventsLoading || events.length === 0}
                  onChange={event => selectRelativeEvent(event.currentTarget.value)}
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
                <span className={styles.hint}>Esta regra mantém o vínculo com o mesmo Event.</span>
                <input
                  className={styles.numberInput}
                  aria-label="Dias antes do evento"
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
            )}
          </div>
        )}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Evento associado</legend>
        <p className={styles.description}>
          O vínculo fornece contexto e não altera a natureza ou a frequência da tarefa.
        </p>
        <label className={styles.field}>
          <span>Evento associado</span>
          <select
            className={styles.select}
            value={associationId}
            disabled={eventsLoading || value?.type === 'eventRelative'}
            onChange={event => selectEventAssociation(event.currentTarget.value)}
          >
            <option value="">Nenhum</option>
            {associationId && !events.some(event => event.id === associationId) && (
              <option value={associationId}>Evento indisponível</option>
            )}
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.title} · {formatDate(event.startDate)}
              </option>
            ))}
          </select>
        </label>
        {value?.type === 'eventRelative' && (
          <p className={styles.hint}>
            A regra temporal usa este mesmo Event; troque a regra para remover o vínculo.
          </p>
        )}
      </fieldset>
    </>
  )
}
