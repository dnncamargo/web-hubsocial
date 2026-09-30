'use client'

import { useEffect, useReducer, useState, JSX } from 'react'
import { getDocs, query, orderBy, collection, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../utils/firebaseConfig'
import { useAuth } from '../components/auth/AuthProvider'
import { useSearchParams } from 'react-router'
import { Event } from '../utils/interfaces'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import EventCard from './components/EventCard'
import EventCalendarMonth from './components/EventCalendarMonth'
import AddEventModal from './components/AddEventModal'
import EditEventModal from './components/EditEventModal'
import { CalendarDays, List, ListFilter, Plus, Search } from 'lucide-react'
import EventFilterModal from './components/FilterEventModal'
import {
  defaultEventFilters,
  evaluateEventFilters,
  normalizeEventFilters,
} from './utils/eventFilters'
import type { EventFilter } from './utils/eventFilters'
import { useEventCategories } from '../hooks/useEventCategories'
import {
  initialCreationDraftLifecycleState,
  reduceCreationDraftLifecycle,
} from '../utils/creationDraftLifecycle'
import styles from './EventsHistory.module.css'

type EventViewMode = 'list' | 'calendar'

const EventsHistory = (): JSX.Element => {
  const { uid } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [addEventDraft, dispatchAddEventDraft] = useReducer(
    reduceCreationDraftLifecycle,
    initialCreationDraftLifecycleState,
  )
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [filtersLoaded, setFiltersLoaded] = useState(false)
  const [filters, setFilters] = useState<EventFilter>(defaultEventFilters)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [viewMode, setViewMode] = useState<EventViewMode>('list')

  const { availableCategories, categoryColors } = useEventCategories()

  useEffect(() => {
    if (uid) {
      fetchEvents()
    }
  }, [uid])

  useEffect(() => {
    if (!uid || !filtersLoaded || availableCategories.length === 0) return

    const normalizedFilters = normalizeEventFilters(filters, availableCategories)
    if (normalizedFilters.selectedCategories.join('\u0000') === filters.selectedCategories.join('\u0000')) {
      return
    }

    setFilters(normalizedFilters)
    const eventsSettingRef = doc(db, `users/${uid}/settings`, 'userEventsFilters')
    void setDoc(eventsSettingRef, normalizedFilters)
  }, [availableCategories, filters, filtersLoaded, uid])

  useEffect(() => {
    if (searchParams.get('create') !== 'event') return

    dispatchAddEventDraft({ type: 'open' })
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('create')
    setSearchParams(nextSearchParams, { replace: true })
  }, [searchParams, setSearchParams])

  const openAddEventModal = () => {
    dispatchAddEventDraft({ type: 'open' })
  }

  const dismissAddEventModal = () => {
    dispatchAddEventDraft({ type: 'dismiss' })
  }

  const discardAddEventDraft = () => {
    dispatchAddEventDraft({ type: 'discard' })
  }

  useEffect(() => {
    const init = async () => {
      if (!uid) return

      try {
        const eventSettingRef = doc(db, `users/${uid}/settings`, 'userEventsFilters')
        const snapshot = await getDoc(eventSettingRef)

        if (snapshot.exists()) {
          setFilters(normalizeEventFilters(snapshot.data()))
        }
      } catch (error) {
        console.error('Erro ao carregar filtros:', error)
      } finally {
        setFiltersLoaded(true)
      }
    }

    init()
  }, [uid])

  const fetchEvents = async (): Promise<void> => {
    try {
      const eventsQuery = query(
        collection(db, `users/${uid}/events-history`),
        orderBy('startDate', 'asc'),
      )
      const querySnapshot = await getDocs(eventsQuery)
      const eventData = querySnapshot.docs
        .map(snapshot => ({
          id: snapshot.id,
          ...snapshot.data(),
        }) as Event)
        .sort((first, second) => {
          const dateOrder = first.startDate.localeCompare(second.startDate)
          if (dateOrder !== 0) return dateOrder

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

      setEvents(eventData)
    } catch (error) {
      console.error('Erro ao buscar eventos:', error)
    }
  }

  const openEditEventModal = (event: Event): void => {
    setSelectedEvent(event)
    setIsEditModalOpen(true)
  }

  const filteredEvents = (!filters.enabled || !filtersLoaded)
    ? events
    : events.filter(event =>
      evaluateEventFilters(event, filters, availableCategories).matches)

  const visibleEvents = filteredEvents.filter(event => {
    if (!isSearching || searchQuery.trim() === '') return true
    return event.title?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const updateFilters = (updated: EventFilter) => {
    setFilters(updated)

    if (uid) {
      const eventsSettingRef = doc(db, `users/${uid}/settings`, 'userEventsFilters')
      setDoc(eventsSettingRef, updated)
    }
  }

  const effectiveFilters = normalizeEventFilters(filters, availableCategories)
  const hasEffectiveFilter = Boolean(
    effectiveFilters.startDate
    || effectiveFilters.endDate
    || effectiveFilters.hasRating > 0
    || effectiveFilters.hasTasks
    || effectiveFilters.hasNotes
    || effectiveFilters.hasAddressByCEP
    || effectiveFilters.selectedCategories.length > 0,
  )
  const filtersAreActive = filters.enabled && hasEffectiveFilter
  const searchIsActive = isSearching && searchQuery.trim() !== ''

  return (
    <ProtectedRoute>
      <main className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headingBlock}>
            <h1 className={styles.title}>Eventos</h1>
            <p className={styles.subtitle}>Consulte seus eventos em lista ou calendário.</p>
          </div>

          <div className={styles.toolbar} aria-label="Ações de eventos">
            <div className={styles.viewSwitch} aria-label="Visualização de eventos">
              <button
                type="button"
                className={viewMode === 'list'
                  ? `${styles.viewButton} ${styles.viewButtonActive}`
                  : styles.viewButton}
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
              >
                <List className={styles.icon} aria-hidden="true" />
                Lista
              </button>
              <button
                type="button"
                className={viewMode === 'calendar'
                  ? `${styles.viewButton} ${styles.viewButtonActive}`
                  : styles.viewButton}
                onClick={() => setViewMode('calendar')}
                aria-pressed={viewMode === 'calendar'}
              >
                <CalendarDays className={styles.icon} aria-hidden="true" />
                Calendário
              </button>
            </div>
            <button
              type="button"
              className={searchIsActive
                ? `${styles.iconButton} ${styles.iconButtonActive}`
                : styles.iconButton}
              onClick={() => setShowSearchModal(true)}
              aria-label="Pesquisar eventos"
              aria-pressed={searchIsActive}
            >
              <Search className={styles.icon} aria-hidden="true" />
            </button>

            <button
              type="button"
              className={filtersAreActive
                ? `${styles.iconButton} ${styles.iconButtonActive}`
                : styles.iconButton}
              onClick={() => setShowFilterModal(true)}
              aria-label="Filtrar eventos"
              aria-pressed={filtersAreActive}
            >
              <ListFilter className={styles.icon} aria-hidden="true" />
            </button>

            <button
              type="button"
              className={styles.primaryButton}
              onClick={openAddEventModal}
            >
              <Plus className={styles.icon} aria-hidden="true" />
              Novo evento
            </button>
          </div>
        </header>

        <div className={styles.resultMeta}>
          <span>
            {visibleEvents.length} {visibleEvents.length === 1 ? 'evento' : 'eventos'}
          </span>
          {(searchIsActive || filtersAreActive) && <span>Visualização filtrada</span>}
        </div>

        {viewMode === 'calendar' ? (
          <EventCalendarMonth events={visibleEvents} categoryColors={categoryColors} />
        ) : events.length === 0 ? (
          <p className={styles.emptyState}>Nenhum evento registrado.</p>
        ) : visibleEvents.length === 0 ? (
          <p className={styles.emptyState}>
            Nenhum evento corresponde à pesquisa ou aos filtros atuais.
          </p>
        ) : (
          <>
            <div className={styles.grid}>
              {visibleEvents.map(event => (
                <div key={event.id} className={styles.eventItem}>
                  <EventCard
                    event={event}
                    onEditEvent={openEditEventModal}
                    categoryColors={categoryColors}
                  />
                </div>
              ))}
            </div>
            <p className={styles.endMarker}>Fim dos resultados</p>
          </>
        )}

        <EventFilterModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filters={filters}
          setFilters={updateFilters}
          availableCategories={availableCategories}
        />

        {showSearchModal && (
          <div className={styles.searchOverlay} role="presentation">
            <section
              className={styles.searchDialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="event-search-title"
            >
              <header className={styles.searchHeader}>
                <h2 id="event-search-title" className={styles.searchTitle}>
                  Buscar evento
                </h2>
                {searchQuery && (
                  <button
                    type="button"
                    className={styles.searchClear}
                    onClick={() => {
                      setSearchQuery('')
                      setIsSearching(false)
                    }}
                  >
                    Limpar
                  </button>
                )}
              </header>

              <div className={styles.searchBody}>
                <input
                  type="search"
                  placeholder="Título do evento"
                  className={styles.searchInput}
                  value={searchQuery}
                  autoFocus
                  onChange={(event) => {
                    setSearchQuery(event.target.value)
                    setIsSearching(true)
                  }}
                />

                <button
                  type="button"
                  className={styles.searchClose}
                  onClick={() => setShowSearchModal(false)}
                >
                  Fechar
                </button>
              </div>
            </section>
          </div>
        )}

        {addEventDraft.hasMounted && (
          <AddEventModal
            key={addEventDraft.revision}
            isOpen={addEventDraft.isOpen}
            onDismiss={dismissAddEventModal}
            onCancel={dismissAddEventModal}
            onSaved={discardAddEventDraft}
            onAdded={fetchEvents}
          />
        )}

        {isEditModalOpen && selectedEvent && (
          <EditEventModal
            event={selectedEvent}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onUpdated={fetchEvents}
          />
        )}
      </main>
    </ProtectedRoute>
  )
}

export default EventsHistory
