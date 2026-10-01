'use client'

import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { format } from 'date-fns'
import { db } from '../../utils/firebaseConfig'
import { Event } from '../../utils/interfaces'
import { weatherConditions } from '../../utils/weather'
import {
  AutomationRule,
  AutomationRuleSet,
  DayPeriod,
  WeatherCondition,
  WeekdayName,
} from '../../types/automation'
import { formatDate } from '../../utils/datePresentation'
import styles from './AutomationRulesEditor.module.css'

interface AutomationRulesEditorProps {
  uid: string
  value: AutomationRuleSet
  onChange: (value: AutomationRuleSet) => void
  excludeEventId?: string
  mode?: 'event' | 'task'
  onTaskEventChange?: (eventId: string | undefined) => void
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

const dayPeriods: Array<{ value: DayPeriod; label: string }> = [
  { value: 'morning', label: 'Manhã' },
  { value: 'afternoon', label: 'Tarde' },
  { value: 'night', label: 'Noite' },
]

const weekdayByDateIndex: WeekdayName[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

function replaceRuleByType(
  ruleSet: AutomationRuleSet,
  type: AutomationRule['type'],
  nextRule: AutomationRule | null,
): AutomationRuleSet {
  const remainingRules = ruleSet.rules.filter((rule) => rule.type !== type)
  return {
    ...ruleSet,
    rules: nextRule ? [...remainingRules, nextRule] : remainingRules,
  }
}

export default function AutomationRulesEditor({
  uid,
  value,
  onChange,
  excludeEventId,
  mode = 'event',
  onTaskEventChange,
}: AutomationRulesEditorProps) {
  const [events, setEvents] = useState<Event[]>([])
  const notifyTaskEventChange = (eventId: string | undefined) => {
    if (mode === 'task') onTaskEventChange?.(eventId)
  }

  useEffect(() => {
    if (!uid) return

    let active = true

    const loadEvents = async () => {
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
        snapshot.docs
          .map((document) => ({ id: document.id, ...document.data() }) as Event)
          .filter((event) => event.id !== excludeEventId),
      )
    }

    loadEvents().catch((error) => {
      console.error('Erro ao carregar eventos para automação:', error)
    })

    return () => {
      active = false
    }
  }, [uid, excludeEventId])

  const weekdayRule = useMemo(
    () => value.rules.find((rule) => rule.type === 'weekday'),
    [value.rules],
  )

  const weatherRule = useMemo(
    () => value.rules.find((rule) => rule.type === 'weather'),
    [value.rules],
  )

  const dayPeriodRule = useMemo(
    () => value.rules.find((rule) => rule.type === 'dayPeriod'),
    [value.rules],
  )

  const upcomingEventRule = useMemo(
    () => value.rules.find((rule) => rule.type === 'upcomingEvent'),
    [value.rules],
  )

  const currentWeekday = weekdayByDateIndex[new Date().getDay()]

  const toggleWeekdayRule = (enabled: boolean) => {
    if (!enabled) {
      onChange(replaceRuleByType(value, 'weekday', null))
      return
    }

    onChange(
      replaceRuleByType(value, 'weekday', {
        id: crypto.randomUUID(),
        type: 'weekday',
        weekdays: [currentWeekday],
      }),
    )
  }

  const toggleWeekday = (weekday: WeekdayName, selected: boolean) => {
    if (!weekdayRule || weekdayRule.type !== 'weekday') return

    const nextWeekdays = selected
      ? Array.from(new Set([...weekdayRule.weekdays, weekday]))
      : weekdayRule.weekdays.filter((candidate) => candidate !== weekday)

    onChange(
      replaceRuleByType(value, 'weekday', {
        ...weekdayRule,
        weekdays: nextWeekdays,
      }),
    )
  }

  const toggleWeatherRule = (enabled: boolean) => {
    if (!enabled) {
      onChange(replaceRuleByType(value, 'weather', null))
      return
    }

    onChange(
      replaceRuleByType(value, 'weather', {
        id: crypto.randomUUID(),
        type: 'weather',
        condition: 'sunny',
      }),
    )
  }

  const updateWeatherCondition = (condition: WeatherCondition) => {
    if (!weatherRule || weatherRule.type !== 'weather') return

    onChange(
      replaceRuleByType(value, 'weather', {
        ...weatherRule,
        condition,
      }),
    )
  }

  const toggleDayPeriodRule = (enabled: boolean) => {
    onChange(
      replaceRuleByType(value, 'dayPeriod', enabled
        ? {
            id: crypto.randomUUID(),
            type: 'dayPeriod',
            periods: ['morning'],
          }
        : null),
    )
  }

  const toggleDayPeriod = (period: DayPeriod, selected: boolean) => {
    if (!dayPeriodRule || dayPeriodRule.type !== 'dayPeriod') return

    const periods = selected
      ? Array.from(new Set([...dayPeriodRule.periods, period]))
      : dayPeriodRule.periods.filter((candidate) => candidate !== period)

    if (periods.length === 0) return

    onChange(
      replaceRuleByType(value, 'dayPeriod', {
        ...dayPeriodRule,
        periods,
      }),
    )
  }

  const toggleUpcomingEventRule = (enabled: boolean) => {
    if (!enabled) {
      notifyTaskEventChange(undefined)
      onChange(replaceRuleByType(value, 'upcomingEvent', null))
      return
    }

    const eventId = mode === 'event' ? events[0]?.id ?? '' : ''

    onChange(
      replaceRuleByType(value, 'upcomingEvent', {
        id: crypto.randomUUID(),
        type: 'upcomingEvent',
        eventId,
        withinDays: 3,
      }),
    )
    notifyTaskEventChange(undefined)
  }

  const updateUpcomingEvent = (eventId: string) => {
    if (!upcomingEventRule || upcomingEventRule.type !== 'upcomingEvent') return

    notifyTaskEventChange(eventId || undefined)
    onChange(
      replaceRuleByType(value, 'upcomingEvent', {
        ...upcomingEventRule,
        eventId,
      }),
    )
  }

  const updateUpcomingEventWindow = (withinDays: number) => {
    if (!upcomingEventRule || upcomingEventRule.type !== 'upcomingEvent') return

    onChange(
      replaceRuleByType(value, 'upcomingEvent', {
        ...upcomingEventRule,
        withinDays: Math.max(0, Math.min(365, withinDays)),
      }),
    )
  }

  const selectedEventExists =
    upcomingEventRule?.type === 'upcomingEvent' &&
    events.some((event) => event.id === upcomingEventRule.eventId)

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Condições favoráveis</legend>
      <p className={styles.description}>
        Estas condições destacam a ação quando o contexto é favorável. Elas não removem a ação da lista.
      </p>

      <label className={styles.matchMode}>
        <span>Quando houver mais de uma condição</span>
        <select
          className={styles.select}
          value={value.match}
          onChange={(event) =>
            onChange({
              ...value,
              match: event.currentTarget.value as AutomationRuleSet['match'],
            })
          }
        >
          <option value="all">Todas devem corresponder</option>
          <option value="any">Qualquer uma pode corresponder</option>
        </select>
      </label>

      <div className={styles.rule}>
        <label className={styles.ruleToggle}>
          <input
            type="checkbox"
            checked={Boolean(dayPeriodRule)}
            onChange={(event) => toggleDayPeriodRule(event.currentTarget.checked)}
          />
          <span>Período do dia</span>
        </label>

        {dayPeriodRule?.type === 'dayPeriod' && (
          <div className={styles.weekdays}>
            {dayPeriods.map((option) => (
              <label className={styles.weekday} key={option.value}>
                <input
                  type="checkbox"
                  checked={dayPeriodRule.periods.includes(option.value)}
                  onChange={(event) =>
                    toggleDayPeriod(option.value, event.currentTarget.checked)
                  }
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className={styles.rule}>
        <label className={styles.ruleToggle}>
          <input
            type="checkbox"
            checked={Boolean(weekdayRule)}
            onChange={(event) => toggleWeekdayRule(event.currentTarget.checked)}
          />
          <span>Dia da semana</span>
        </label>

        {weekdayRule?.type === 'weekday' && (
          <div className={styles.weekdays}>
            {weekdays.map((weekday) => (
              <label className={styles.weekday} key={weekday.value}>
                <input
                  type="checkbox"
                  checked={weekdayRule.weekdays.includes(weekday.value)}
                  onChange={(event) =>
                    toggleWeekday(weekday.value, event.currentTarget.checked)
                  }
                />
                <span>{weekday.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className={styles.rule}>
        <label className={styles.ruleToggle}>
          <input
            type="checkbox"
            checked={Boolean(weatherRule)}
            onChange={(event) => toggleWeatherRule(event.currentTarget.checked)}
          />
          <span>Clima atual</span>
        </label>

        {weatherRule?.type === 'weather' && (
          <label className={styles.field}>
            <span>Destacar quando estiver</span>
            <select
              className={styles.select}
              value={weatherRule.condition}
              onChange={(event) =>
                updateWeatherCondition(
                  event.currentTarget.value as WeatherCondition,
                )
              }
            >
              {weatherConditions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className={styles.rule}>
        <label className={styles.ruleToggle}>
          <input
            type="checkbox"
            checked={Boolean(upcomingEventRule)}
            disabled={!upcomingEventRule && events.length === 0}
            onChange={(event) =>
              toggleUpcomingEventRule(event.currentTarget.checked)
            }
          />
          <span>Evento próximo</span>
        </label>

        {!upcomingEventRule && events.length === 0 && (
          <p className={styles.hint}>Nenhum evento futuro disponível.</p>
        )}

        {upcomingEventRule?.type === 'upcomingEvent' && (
          <div className={styles.eventRule}>
            <label className={styles.field}>
              <span>Evento</span>
              <select
                className={styles.select}
                value={upcomingEventRule.eventId}
                onChange={(event) => updateUpcomingEvent(event.currentTarget.value)}
              >
                <option value="">Selecione um evento</option>
                {!selectedEventExists && upcomingEventRule.eventId && (
                  <option value={upcomingEventRule.eventId}>
                    Evento indisponível
                  </option>
                )}
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title} · {formatDate(event.startDate)}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Destacar até</span>
              <div className={styles.numberField}>
                <input
                  className={styles.numberInput}
                  type="number"
                  min="0"
                  max="365"
                  value={upcomingEventRule.withinDays}
                  onChange={(event) =>
                    updateUpcomingEventWindow(Number(event.currentTarget.value))
                  }
                />
                <span>dias antes</span>
              </div>
            </label>
          </div>
        )}
      </div>
    </fieldset>
  )
}
