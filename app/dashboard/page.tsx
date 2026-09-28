'use client';

import { useState, useEffect, JSX } from 'react';
import { getDoc, getDocs, doc, query, where, orderBy, collection, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';
import { useAuth } from '../components/auth/AuthProvider';
import { Event, Person, Task } from '../utils/interfaces';
import { ActionHorizon, ActionProjection, ActionProjectionItem } from '../types/actions';
import { AutomationRuleSet } from '../types/automation';
import { AutomationEventContext, evaluateAutomation } from '../utils/automation';
import { getCurrentBrowserWeather, WeatherSnapshot } from '../utils/weather';
import { getActionPeriodKeys } from '../utils/actionPlanning';
import { format, isToday, isTomorrow, eachDayOfInterval, isThisWeek, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Star } from 'lucide-react';
import ProtectedRoute from '../components/auth/ProtectedRoute'
import UpcomingEventCard from './components/UpcomingEventCard';
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
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
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

  const fetchPlannedActions = async (): Promise<void> => {
    if (!uid) return

    const referenceDate = new Date()
    const periods = getActionPeriodKeys(referenceDate)
    const horizons: ActionHorizon[] = ['day', 'week', 'month']

    const sourcesByHorizon = await Promise.all(
      horizons.map(async (horizon) => {
        const [eventSnapshot, taskSnapshot] = await Promise.all([
          getDocs(
            query(
              collection(db, `users/${uid}/events-history`),
              where(`actionPlanning.${horizon}`, '==', periods[horizon]),
            ),
          ),
          getDocs(
            query(
              collection(db, `users/${uid}/tasks-list`),
              where(`actionPlanning.${horizon}`, '==', periods[horizon]),
            ),
          ),
        ])

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

        const taskActions: PlannedActionSource[] = taskSnapshot.docs.map((snapshot) => {
          const task = { id: snapshot.id, ...snapshot.data() } as Task
          return {
            item: {
              key: `task:${task.id}`,
              sourceType: 'task',
              sourceId: task.id,
              title: task.content,
              completed: task.status === 2,
            },
            automation: task.automation,
          }
        })

        return [horizon, [...eventActions, ...taskActions]] as const
      }),
    )

    const needsWeather = sourcesByHorizon.some(([, sources]) =>
      sources.some((source) =>
        source.automation?.rules.some((rule) => rule.type === 'weather'),
      ),
    )

    let currentWeather: WeatherSnapshot | null = null

    if (needsWeather) {
      try {
        currentWeather = await getCurrentBrowserWeather()
      } catch (error) {
        console.warn('Contexto de clima indisponível para automação:', error)
      }
    }

    setWeather(currentWeather)

    const referencedEventIds = new Set<string>()

    for (const [, sources] of sourcesByHorizon) {
      for (const source of sources) {
        for (const rule of source.automation?.rules ?? []) {
          if (rule.type === 'upcomingEvent') {
            referencedEventIds.add(rule.eventId)
          }
        }
      }
    }

    const linkedEvents = (
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
          } satisfies AutomationEventContext
        }),
      )
    ).filter((event): event is AutomationEventContext => event !== null)

    const entries = sourcesByHorizon.map(([horizon, sources]) => {
      const items: ActionProjectionItem[] = sources
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

          const timeOrder = (a.time ?? '99:99').localeCompare(b.time ?? '99:99')
          return timeOrder !== 0 ? timeOrder : a.title.localeCompare(b.title, 'pt-BR')
        })

      return [horizon, items] as const
    })

    setActions(Object.fromEntries(entries) as ActionProjection)
  };

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

  /**
   * @function renderEvent
   * @description Renderiza um cartão de resumo de evento, buscando a pessoa associada na lista de pessoas (se houver).
   * @param {Event}
   */
  const renderEvent = (event: Event) => {
    const associatedPerson = person.find(p => event.personIds?.includes(p.id))
    const groupLabels: Record<keyof GroupedEvents, string> = {
    today: 'Hoje',
    tomorrow: 'Amanhã',
    thisWeek: 'Esta semana',
    thisMonth: 'Este mês',
    nextMonth: 'Próximo mês',
    future: 'Futuro',
  }

  const totalUpcomingEvents = Object.values(events).flat().length
  const todayText = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })
  const formattedToday = todayText.charAt(0).toUpperCase() + todayText.slice(1)

  return (
    <ProtectedRoute>
      <main className={styles.page}>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Hoje</p>
            <h1 className={styles.pageTitle}>{formattedToday}</h1>
          </div>

          <button
            type="button"
            className={styles.contextAction}
            onClick={() => setShowSuggestions(true)}
          >
            <Star className={styles.contextActionIcon} aria-hidden="true" />
            Sugestões
          </button>
        </header>

        <ActionsOverview actions={actions} weather={weather} />

        <section className={styles.eventsSection} aria-labelledby="upcoming-events-title">
          <div className={styles.sectionHeading}>
            <h2 id="upcoming-events-title" className={styles.sectionTitle}>
              Próximos eventos
            </h2>
            <span className={styles.sectionCount}>
              {totalUpcomingEvents} {totalUpcomingEvents === 1 ? 'evento' : 'eventos'}
            </span>
          </div>

          {Object.entries(events).map(([groupName, groupEvents]) => {
            if (groupEvents.length === 0) return null

            const groupKey = groupName as keyof GroupedEvents
            return (
              <section key={groupName} className={styles.eventGroup}>
                <h3 className={styles.groupTitle}>
                  {groupLabels[groupKey]} ({groupEvents.length})
                </h3>
                <div className={styles.eventGrid}>
                  {groupEvents.map(renderEvent)}
                </div>
              </section>
            )
          })}

          {totalUpcomingEvents === 0 && (
            <p className={styles.emptyState}>Nenhum evento futuro agendado.</p>
          )}
        </section>

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
