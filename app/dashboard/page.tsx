'use client';

import { useState, useEffect, JSX } from 'react';
import { getDoc, getDocs, doc, query, where, orderBy, collection, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';
import { useAuth } from '../components/auth/AuthProvider';
import { Event, Person, Task } from '../utils/interfaces';
import { ActionHorizon, ActionProjection, ActionProjectionItem } from '../types/actions';
import { AutomationRuleSet } from '../types/automation';
import { evaluateAutomation } from '../utils/automation';
import {
  getCurrentBrowserWeather,
  WeatherSnapshot,
} from '../utils/weather';
import { getActionPeriodKeys } from '../utils/actionPlanning';
import {
  getTaskActionCandidates,
  TaskScheduleEventContext,
} from '../utils/taskSchedule';
import { format, isToday, isTomorrow, eachDayOfInterval, isThisWeek, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpRight, CalendarDays, Check, MapPin, Star, UserRound } from 'lucide-react';
import { Link } from 'react-router';
import ProtectedRoute from '../components/auth/ProtectedRoute'
import SuggestionPanel from './components/SuggestionPanel';
import ActionsOverview from './components/ActionsOverview';
import styles from './Dashboard.module.css'

type GroupedEvents = {
  today: Event[],
  tomorrow: Event[],
  thisWeek: Event[],
  thisMonth: Event[],
  nextMonth: Event[],
  future: Event[]
}

type PlannedActionSource = {
  item: Omit<ActionProjectionItem, 'automation'>
  automation?: AutomationRuleSet
}

/**
 * @component
 * @description Componente principal da página inicial, exibindo os próximos eventos e permitindo adicionar novos eventos.
 * @returns {JSX.Element} A interface da página inicial.
 */
export default function Dashboard(): JSX.Element {
  const { uid } = useAuth(); /** @const {uid | null} uid - O usuário do Firebase autenticado. */
  const [person, setPerson] = useState<Person[]>([]); /** @state {Person[]} person - Array de pessoas buscadas do Firestore. */
  const [events, setEvents] = useState<GroupedEvents>({
    today: [],
    tomorrow: [],
    thisWeek: [],
    thisMonth: [],
    nextMonth: [],
    future: []
  }); /** @state {GroupedEvents} events - Array de eventos agrupados por data. */
  const [actions, setActions] = useState<ActionProjection>({
    day: [],
    week: [],
    month: [],
  });
  const [showSuggestions, setShowSuggestions] = useState(false); /** @state {boolean} showSuggestions - Controla a visibilidade do painel de sugestões de eventos. */

  useEffect(() => {
    // Chama as funções fetchPerson e fetchAndGroupEvents quando o componente é montado.
    // Isso garante que a lista de pessoas e eventos seja carregada assim que o componente for exibido.
    if (uid) {
      fetchAndGroupEvents()
      fetchPlannedActions()
      fetchPerson();
    }
  }, [uid]); // <- Executa quando user estiver pronto

  /**
  * @async
  * @function fetchPerson
  * @description Busca os dados de todas as pessoas da coleção 'people-directory' no Firestore.
  * @returns {Promise<void>}
  */
  const fetchPerson = async (): Promise<void> => {
    const querySnapshot = await getDocs(collection(db, `users/${uid}/people-directory`));
    const personData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Person[];
    setPerson(personData);
  };

  const fetchPlannedActions = async (
    weatherOverride?: WeatherSnapshot | null,
  ): Promise<void> => {
    if (!uid) return

    const referenceDate = new Date()
    const horizons: ActionHorizon[] = ['day', 'week', 'month']
    const [eventSourcesByHorizon, taskSnapshot] = await Promise.all([
      Promise.all(
        horizons.map(async (horizon) => {
          const periods = getActionPeriodKeys(referenceDate)
          const eventSnapshot = await getDocs(
            query(
              collection(db, `users/${uid}/events-history`),
              where(`actionPlanning.${horizon}`, '==', periods[horizon]),
            ),
          )

          const eventActions: PlannedActionSource[] = eventSnapshot.docs.map((snapshot) => {
            const event = { id: snapshot.id, ...snapshot.data() } as Event
            return {
              item: {
                key: `event:${event.id}`,
                sourceType: 'event',
                sourceId: event.id,
                title: event.title,
                completed: event.status === 1,
                date: event.startDate,
                ...(event.startTime ? { time: event.startTime } : {}),
              },
              automation: event.automation,
            }
          })

          return [horizon, eventActions] as const
        }),
      ),
      getDocs(collection(db, `users/${uid}/tasks-list`)),
    ])

    const tasks = taskSnapshot.docs.map(snapshot => ({
      id: snapshot.id,
      ...snapshot.data(),
    }) as Task)

    let currentWeather = weatherOverride
    if (weatherOverride === undefined) {
      try {
        currentWeather = await getCurrentBrowserWeather()
      } catch {
        currentWeather = null
      }
    }

    const referencedEventIds = new Set<string>()
    const collectEventReferences = (source: PlannedActionSource) => {
      for (const rule of source.automation?.rules ?? []) {
        if (rule.type === 'upcomingEvent') {
          referencedEventIds.add(rule.eventId)
        }
      }
    }

    for (const [, sources] of eventSourcesByHorizon) {
      sources.forEach(collectEventReferences)
    }

    for (const task of tasks) {
      if (task.schedule?.type === 'eventRelative' && task.schedule.eventId) {
        referencedEventIds.add(task.schedule.eventId)
      }
      collectEventReferences({ item: {
        key: `task:${task.id}`,
        sourceType: 'task',
        sourceId: task.id,
        title: task.content,
        completed: task.status === 2,
      }, automation: task.automation })
    }

    const linkedEvents: TaskScheduleEventContext[] = (
      await Promise.all(
        Array.from(referencedEventIds).map(async (eventId) => {
          const snapshot = await getDoc(
            doc(db, `users/${uid}/events-history/${eventId}`),
          )

          if (!snapshot.exists()) return null

          const event = snapshot.data() as Event
          return {
            id: snapshot.id,
            startDate: event.startDate,
          }
        }),
      )
    ).filter((event): event is TaskScheduleEventContext => event !== null)

    const taskSourcesByHorizon: Record<ActionHorizon, PlannedActionSource[]> = {
      day: [],
      week: [],
      month: [],
    }

    for (const task of tasks) {
      const candidates = getTaskActionCandidates(task, referenceDate, linkedEvents)

      for (const candidate of candidates) {
        taskSourcesByHorizon[candidate.horizon].push({
          item: {
            key: `task:${task.id}`,
            sourceType: 'task',
            sourceId: task.id,
            title: task.content,
            completed: task.status === 2,
            inProgress: task.status === 1,
            ...(candidate.date ? { date: candidate.date } : {}),
          },
          automation: task.automation,
        })
      }
    }

    const sourcesByHorizon = eventSourcesByHorizon.map(([horizon, sources]) => (
      [horizon, [...sources, ...taskSourcesByHorizon[horizon]]] as const
    ))
    const projectedTaskKeys = new Set<string>()

    const entries = sourcesByHorizon.map(([horizon, sources]) => {
      const visibleSources = sources.filter(source => {
        if (source.item.sourceType !== 'task') return true
        if (projectedTaskKeys.has(source.item.key)) return false

        projectedTaskKeys.add(source.item.key)
        return true
      })

      const items: ActionProjectionItem[] = visibleSources
        .map(({ item, automation }) => ({
          ...item,
          automation: evaluateAutomation(automation, {
            referenceDate,
            events: linkedEvents,
            ...(currentWeather
              ? { weather: { condition: currentWeather.condition } }
              : {}),
          }),
        }))
        .sort((a, b) => {
          if (a.automation.highlighted !== b.automation.highlighted) {
            return a.automation.highlighted ? -1 : 1
          }

          if (a.inProgress !== b.inProgress) {
            return a.inProgress ? -1 : 1
          }

          const timeOrder = (a.time ?? '99:99').localeCompare(b.time ?? '99:99')
          return timeOrder !== 0 ? timeOrder : a.title.localeCompare(b.title, 'pt-BR')
        })

      return [horizon, items] as const
    })

    setActions(Object.fromEntries(entries) as ActionProjection)
  }

  /**
   * @async
   * @function fetchAndGroupEvents
   * @description Busca os eventos futuros da coleção 'events-history' no Firestore, e agrupa por categorias de tempo.
   * @returns {Promise<void>}
   */
  const fetchAndGroupEvents = async (): Promise<void> => {
    const today = new Date()
    console.log('today', today)
    const q = query(
      collection(db, `users/${uid}/events-history`),
      where('startDate', '>=', format(today, 'yyyy-MM-dd')),
      orderBy('startDate'),
      orderBy('startTime')
    )
    const querySnapshot = await getDocs(q)
    const allEvents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Event[];
    groupEventsByTime(allEvents);
  }

  /**
   * @function groupEventsByTime
   * @description Agrupa uma lista de eventos (`allEvents`) em categorias temporais: hoje, esta semana, este mês, próximo mês e futuro.
   * Utiliza as funções `parseISO`, `isToday`, `isThisWeek`, `isSameMonth`, e `addMonths` da biblioteca `date-fns` para realizar a categorização.
   * O resultado da agrupamento é um objeto do tipo `GroupedEvents`, que é então utilizado para atualizar o estado `events`.
   * @param {Event[]} allEvents - Um array de objetos `Event`, onde cada objeto deve ter uma propriedade `date` no formato ISO 8601.
   * @returns {void} - Esta função não retorna um valor diretamente, mas atualiza o estado `events` com os eventos agrupados.
   */
  const groupEventsByTime = (allEvents: Event[]): void => {
    const grouped = allEvents.reduce<GroupedEvents>((acc, event) => {
      const date = parseISO(event.startDate);
      const now = new Date();

      const isSameMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      const isNextMonth = date.getMonth() === addMonths(now, 1).getMonth() && date.getFullYear() === addMonths(now, 1).getFullYear();

      if (isToday(date)) {
        acc.today.push(event);
      } else if (isTomorrow(date)) {
        acc.tomorrow.push(event);
      } else if (isThisWeek(date, { weekStartsOn: 0 }) && isSameMonth) {
        acc.thisWeek.push(event);
      } else if (isSameMonth) {
        acc.thisMonth.push(event);
      } else if (isNextMonth) {
        acc.nextMonth.push(event);
      } else {
        acc.future.push(event);
      }

      return acc;
    }, {
      today: [],
      tomorrow: [],
      thisWeek: [],
      thisMonth: [],
      nextMonth: [],
      future: []
    });

    setEvents(grouped);
  };

  const refreshDashboardEvents = async () => {
    await Promise.all([fetchAndGroupEvents(), fetchPlannedActions()]);
  };

  const handleToggleEventStatus = async (eventId: string, newStatus: 0 | 1) => {
    try {
      const eventRef = doc(db, `users/${uid}/events-history`, eventId);
      await updateDoc(eventRef, { status: newStatus });

      // Atualiza o estado local dos eventos agrupados
      setEvents(prev => {
        const updated: GroupedEvents = {
          today: [],
          tomorrow: [],
          thisWeek: [],
          thisMonth: [],
          nextMonth: [],
          future: []
        };

        for (const [groupName, groupEvents] of Object.entries(prev) as [keyof GroupedEvents, Event[]][]) {
          updated[groupName] = groupEvents.map(event =>
            event.id === eventId ? { ...event, status: newStatus } : event
          );
        }

        return updated;
      });

      await fetchPlannedActions();
    } catch (error) {
      console.error('Erro ao atualizar status do evento:', error);
    }
  };

  const totalUpcomingEvents = Object.values(events).flat().length
  const nearestEvents = Object.values(events).flat().slice(0, 3)

  return (
    <ProtectedRoute>
      <main className={styles.page}>
        <ActionsOverview
          actions={actions}
          context={(
            <section className={styles.contextPanel} aria-labelledby="context-title">
              <header className={styles.contextHeader}>
                <div>
                  <p className={styles.contextEyebrow}>Contexto</p>
                  <h2 id="context-title" className={styles.contextTitle}>Ao redor das suas ações</h2>
                </div>
                <div className={styles.contextActions}>
                  <button
                    type="button"
                    className={styles.contextAction}
                    onClick={() => setShowSuggestions(true)}
                  >
                    <Star className={styles.contextActionIcon} aria-hidden="true" />
                    Sugestões
                  </button>
                  <Link to="/events-history" className={styles.contextLink}>
                    Eventos
                    <ArrowUpRight className={styles.contextActionIcon} aria-hidden="true" />
                  </Link>
                </div>
              </header>

              <div className={styles.contextEvents}>
                <div className={styles.contextEventsHeading}>
                  <h3 className={styles.contextSectionTitle}>Próximos eventos</h3>
                  <span className={styles.sectionCount}>{totalUpcomingEvents}</span>
                </div>

                {nearestEvents.length > 0 ? (
                  <div className={styles.contextEventList}>
                    {nearestEvents.map((event) => {
                      const associatedPerson = person.find((item) => event.personIds?.includes(item.id))
                      const isCompleted = event.status === 1

                      return (
                        <article key={event.id} className={styles.contextEvent}>
                          <div className={styles.contextEventBody}>
                            <span className={styles.contextEventDate}>
                              <CalendarDays className={styles.contextEventIcon} aria-hidden="true" />
                              {format(parseISO(event.startDate), "EEE, d MMM", { locale: ptBR })}
                              {event.startTime ? ` · ${event.startTime}` : ''}
                            </span>
                            <h4 className={styles.contextEventTitle}>{event.title}</h4>
                            {(associatedPerson || event.location) && (
                              <span className={styles.contextEventMeta}>
                                {associatedPerson && <><UserRound className={styles.contextEventIcon} aria-hidden="true" />{associatedPerson.name}</>}
                                {event.location && <><MapPin className={styles.contextEventIcon} aria-hidden="true" />{event.location}</>}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className={isCompleted ? `${styles.eventStatus} ${styles.eventStatusCompleted}` : styles.eventStatus}
                            aria-pressed={isCompleted}
                            onClick={() => handleToggleEventStatus(event.id, isCompleted ? 0 : 1)}
                          >
                            <Check className={styles.eventStatusIcon} aria-hidden="true" />
                            {isCompleted ? 'Concluído' : 'Pendente'}
                          </button>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <p className={styles.emptyState}>Nenhum evento futuro agendado.</p>
                )}
              </div>
            </section>
          )}
        />

        {showSuggestions && (
          <SuggestionPanel
            onClose={() => setShowSuggestions(false)}
            onEventCreated={refreshDashboardEvents}
          />
        )}
      </main>
    </ProtectedRoute>
  )
}
