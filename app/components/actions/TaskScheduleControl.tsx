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
  changeWeeklyMode,
  synchronizeEventRelativeSchedule,
  toggleTaskWeekday,
} from '../../utils/taskAuthoring'
import styles from './TaskScheduleControl.module.css'

interface TaskScheduleControlProps {
  uid: string
  nature: TaskNature
  value?: TaskSchedule
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
  onChange,
  eventAssociation,
  onEventAssociationChange,
}: TaskScheduleControlProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const selectedAssociationId = eventAssociation?.eventId

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
    const nextAssociation = eventId ? { eventId } : undefined
    onEventAssociationChange(nextAssociation)
    onChange(synchronizeEventRelativeSchedule(value, nextAssociation))
  }

  const selectTemporalRule = (rule: string) => {
    if (rule === 'none') {
      onChange(undefined)
      return
    }

    const eventId = eventAssociation?.eventId
    if (!eventId) return

    onChange({ type: 'eventRelative', eventId, leadDays: 14 })
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
  const associationId = selectedAssociationId ?? ''

  return (
    <>
      {nature === 'recurring' && (
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Com que frequência ela se repete?</legend>
          <label className={styles.field}>
            <span>Frequência</span>
            <select
              className={styles.select}
              value={scheduleFrequency}
              onChange={event => selectFrequency(event.currentTarget.value)}
            >
              <option value="daily">Diariamente</option>
              <option value="weekly">Semanalmente</option>
              <option value="monthly">Mensalmente</option>
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
                  <option value="flexible">Flexível</option>
                  <option value="specific">Em dias específicos</option>
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
        </fieldset>
      )}

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Contexto</legend>
        <p className={styles.description}>
          Associe a tarefa a um Event quando ele fizer parte do contexto.
        </p>

        {nature === 'punctual' && (
          <div className={styles.detail}>
            <label className={styles.field}>
              <span>Regra temporal (opcional)</span>
              <select
                className={styles.select}
                value={temporalRule}
                onChange={event => selectTemporalRule(event.currentTarget.value)}
              >
                <option value="none">Nenhuma</option>
                <option value="eventRelative" disabled={!eventAssociation}>
                  Antes do Event associado
                </option>
              </select>
            </label>

            {value?.type === 'eventRelative' && (
              <div className={styles.field}>
                <span>Antecedência</span>
                <input
                  className={styles.numberInput}
                  aria-label="Dias antes do Event associado"
                  type="number"
                  min="0"
                  max="365"
                  value={value.leadDays}
                  onChange={event => onChange({
                    ...value,
                    leadDays: Math.max(0, Math.min(365, Number(event.currentTarget.value))),
                  })}
                />
                <span className={styles.hint}>A regra usa o Event associado acima.</span>
              </div>
            )}
          </div>
        )}

        <label className={styles.field}>
          <span>Event associado</span>
          <select
            className={styles.select}
            value={associationId}
            disabled={eventsLoading}
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
