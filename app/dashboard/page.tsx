'use client';

import { useState, useEffect, useRef, JSX } from 'react';
import { getDoc, getDocs, doc, query, where, orderBy, collection, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';
import { useAuth } from '../components/auth/AuthProvider';
import { useEventCategories } from '../hooks/useEventCategories';
import { Event, Person } from '../utils/interfaces';
import { hydratePerson } from '../utils/personPayload';
import { ActionHorizon, ActionProjection, ActionProjectionItem } from '../types/actions';
import {
  WeatherSnapshot,
  resolveWeatherWithinDeadline,
} from '../utils/weather';
import { getActionPeriodKeys } from '../utils/actionPlanning';
import {
  hasWeatherRules,
  PlannedActionSource,
  projectActionsForDate,
  projectActionSources,
} from '../utils/actionProjection';
import {
  TaskScheduleEventContext,
} from '../utils/taskSchedule';
import { format, isToday, isTomorrow, eachDayOfInterval, isThisWeek, addMonths, parseISO } from 'date-fns';
import { ArrowUpRight, CalendarDays, Check, MapPin, Star, UserRound } from 'lucide-react';
import { Link } from 'react-router';
import ProtectedRoute from '../components/auth/ProtectedRoute'
import { usePageTitle } from '../hooks/usePageTitle'
import useCivilDate from '../hooks/useCivilDate'
import { formatDateTime } from '../utils/datePresentation'
import {
  buildTaskFocusReconciliationUpdate,
  buildTaskStatusUpdateForTask,
  buildSupertaskStatusUpdate,
  hydrateTask,
} from '../utils/taskPayload'
import { reconcileTaskFocusTree } from '../utils/taskFocus'
import {
  getEffectiveTaskStatus,
  getSupertaskStatusConfirmationMessage,
} from '../utils/taskSubtasks'
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

/**
 * @component
 * @description Componente principal da página inicial, exibindo os próximos eventos e permitindo adicionar novos eventos.
 * @returns {JSX.Element} A interface da página inicial.
 */
export default function Dashboard(): JSX.Element {
  const { uid } = useAuth(); /** @const {uid | null} uid - O usuário do Firebase autenticado. */
  usePageTitle('Hoje')
  const civilDate = useCivilDate()
  const { categoryColors } = useEventCategories();
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
  const [pendingActionKeys, setPendingActionKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const pendingActionKeysRef = useRef(new Set<string>());
  const actionRequestIdRef = useRef(0);
  const isMountedRef = useRef(false);
  const [showSuggestions, setShowSuggestions] = useState(false); /** @state {boolean} showSuggestions - Controla a visibilidade do painel de sugestões de eventos. */

  useEffect(() => {
    isMountedRef.current = true

    // Chama as funções fetchPerson e fetchAndGroupEvents quando o componente é montado.
    // Isso garante que a lista de pessoas e eventos seja carregada assim que o componente for exibido.
    if (uid) {
      fetchAndGroupEvents()
      fetchPlannedActions(undefined, civilDate)
      fetchPerson();
    }

    return () => {
      isMountedRef.current = false
      actionRequestIdRef.current += 1
    }
  }, [uid, civilDate]); // <- Executa quando user estiver pronto ou o dia civil mudar

  /**
  * @async
  * @function fetchPerson
  * @description Busca os dados de todas as pessoas da coleção 'people-directory' no Firestore.
  * @returns {Promise<void>}
  */
  const fetchPerson = async (): Promise<void> => {
    const querySnapshot = await getDocs(collection(db, `users/${uid}/people-directory`));
    const personData = querySnapshot.docs.map(doc => hydratePerson(doc.id, doc.data()));
    setPerson(personData);
  };

  const fetchPlannedActions = async (
    weatherOverride?: WeatherSnapshot | null,
    currentCivilDate: string = format(new Date(), 'yyyy-MM-dd'),
  ): Promise<void> => {
    if (!uid) return

    const requestId = ++actionRequestIdRef.current
    const canCommit = () =>
      isMountedRef.current && actionRequestIdRef.current === requestId
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
                categories: event.categories,
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

    const fetchedTasks = taskSnapshot.docs.map(snapshot =>
      hydrateTask(snapshot.id, snapshot.data(), currentCivilDate),
    )
    const tasks = reconcileTaskFocusTree(fetchedTasks, currentCivilDate)

    if (!canCommit()) return

    void Promise.all(
      tasks.flatMap((task, index) => {
        if (task === fetchedTasks[index]) return []
        const update = buildTaskFocusReconciliationUpdate(fetchedTasks[index], task)
        return update
          ? [updateDoc(doc(db, `users/${uid}/tasks-list`, task.id), update)]
          : []
      }),
    ).catch(error => {
      console.error('Não foi possível persistir a virada de foco das tarefas:', error)
    })

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
      if (task.eventAssociation?.eventId) {
        referencedEventIds.add(task.eventAssociation.eventId)
      }
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

    if (!canCommit()) return

    const taskSourcesByHorizon: Record<ActionHorizon, PlannedActionSource[]> = {
      day: [],
      week: [],
      month: [],
    }

    const projectedTaskActions = projectActionsForDate(
      tasks,
      currentCivilDate,
      { events: linkedEvents },
    )

    for (const action of projectedTaskActions) {
      const task = tasks.find(candidate => candidate.id === action.taskId)
      if (!task) continue

      const actionKey = `task:${task.id}`
      const effectiveStatus = getEffectiveTaskStatus(task, currentCivilDate)

      taskSourcesByHorizon[action.horizon].push({
        item: {
          key: actionKey,
          sourceType: 'task',
          sourceId: task.id,
          title: task.content,
          completed: false,
          source: action.source,
          completionMode: action.completionMode,
          inProgress: effectiveStatus === 1,
          ...(action.effectiveDate ? { date: action.effectiveDate } : {}),
        },
        automation: task.automation,
      })
    }

    const sourcesByHorizon = eventSourcesByHorizon.map(([horizon, sources]) => (
      [horizon, [...sources, ...taskSourcesByHorizon[horizon]]] as const
    ))
    const projectionContext = {
      referenceDate,
      events: linkedEvents,
    }

    setActions(projectActionSources(sourcesByHorizon, projectionContext))

    if (!hasWeatherRules(sourcesByHorizon)) return

    const currentWeather = weatherOverride === undefined
      ? await resolveWeatherWithinDeadline()
      : weatherOverride

    if (!canCommit()) return

    setActions(projectActionSources(sourcesByHorizon, {
      ...projectionContext,
      ...(currentWeather
        ? { weatherCondition: currentWeather.condition }
        : {}),
    }))
  }

  /**
   * @async
   * @function fetchAndGroupEvents
   * @description Busca os eventos futuros da coleção 'events-history' no Firestore, e agrupa por categorias de tempo.
   * @returns {Promise<void>}
   */
  const fetchAndGroupEvents = async (): Promise<void> => {
    const today = new Date()
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

  const handleCompleteAction = async (item: ActionProjectionItem): Promise<void> => {
    if (!uid || (item.completed && !item.completedToday)) return
    if (pendingActionKeysRef.current.has(item.key)) return

    pendingActionKeysRef.current.add(item.key)
    setPendingActionKeys(previous => {
      const next = new Set(previous)
      next.add(item.key)
      return next
    })

    try {
      if (item.sourceType === 'event') {
        await handleToggleEventStatus(item.sourceId, 1)
        return
      }

      const taskReference = doc(db, `users/${uid}/tasks-list`, item.sourceId)
      const taskSnapshot = await getDoc(taskReference)
      if (!taskSnapshot.exists()) return

      const rootTask = hydrateTask(taskSnapshot.id, taskSnapshot.data())
      const targetDate = item.date ?? format(new Date(), 'yyyy-MM-dd')
      if (rootTask.subtasks?.length) {
        const confirmed = window.confirm(
          getSupertaskStatusConfirmationMessage(2, rootTask.subtasks.length),
        )
        if (!confirmed) return

        const bulkUpdate = buildSupertaskStatusUpdate(rootTask, 2, targetDate)
        if (!bulkUpdate) return

        await updateDoc(taskReference, bulkUpdate)
      } else {
        await updateDoc(
          taskReference,
          buildTaskStatusUpdateForTask(rootTask, 2, targetDate),
        )
      }

      await fetchPlannedActions()
    } catch (error) {
      console.error('Erro ao concluir ação do dia:', error)
    } finally {
      pendingActionKeysRef.current.delete(item.key)
      setPendingActionKeys(previous => {
        const next = new Set(previous)
        next.delete(item.key)
        return next
      })
    }
  }

  const totalUpcomingEvents = Object.values(events).flat().length
  const nearestEvents = Object.values(events).flat().slice(0, 3)

  return (
    <ProtectedRoute>
      <main className={styles.page}>
        <ActionsOverview
          actions={actions}
          onCompleteAction={handleCompleteAction}
          pendingActionKeys={pendingActionKeys}
          categoryColors={categoryColors}
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
                              {formatDateTime(event.startDate, event.startTime)}
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
