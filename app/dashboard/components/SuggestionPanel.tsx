// components/SuggestionPanel.tsx
'use client'

import { useEffect, useState } from 'react'
import { addDoc, getDocs, collection } from 'firebase/firestore'
import { db } from '../../utils/firebaseConfig'
import { useAuth } from '../../components/auth/AuthProvider'
import { motion } from 'motion/react'
import { differenceInDays, format, isAfter, parseISO, add } from 'date-fns'
import { X } from 'lucide-react'
import { Person, Event, EventSuggestion } from '../../utils/interfaces'
import { buildEventPayload } from '../../utils/eventPayload'
import SuggestionCard from './SuggestionCard'
import styles from './SuggestionPanel.module.css'

interface SuggestionPanelProps {
  onClose: () => void
  onEventCreated: () => void
}

export default function SuggestionPanel({ onClose, onEventCreated }: SuggestionPanelProps) {
  const { uid } = useAuth()
  const [suggestions, setSuggestions] = useState<EventSuggestion[]>([])

  useEffect(() => {
    if (uid) {
      fetchSuggestions()
    }
  }, [uid])

  if (!uid) {
    return <p className={styles.loadingState}>Carregando usuário...</p>
  }

  const fetchSuggestions = async () => {
    const peopleSnap = await getDocs(collection(db, `users/${uid}/people-directory`))
    const eventsSnap = await getDocs(collection(db, `users/${uid}/events-history`))

    const people = peopleSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Person[]
    const events = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Event[]

    const result = generateSuggestions(people, events)
    setSuggestions(result)
  }

  function getNextContactDate(lastContact: Date | null, frequency: Person['contactFrequency']) {
    if (!frequency || !lastContact) return null

    const freqMap = {
      weekly: 7,
      biweekly: 14,
      monthly: 30,
      quarterly: 90,
    }

    const days = freqMap[frequency]
    return add(lastContact, { days })
  }

  function generateSuggestions(people: Person[], events: Event[]): EventSuggestion[] {
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    const nextSuggestions: EventSuggestion[] = []

    for (const person of people) {
      const birthday = person.birthday ? parseISO(person.birthday) : null
      const lastEvent = events
        .filter(event => event.personIds?.includes(person.id))
        .sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime())[0]

      if (birthday) {
        const upcoming = new Date(now.getFullYear(), birthday.getMonth(), birthday.getDate())
        const daysFromNow = differenceInDays(now, upcoming)

        if ((daysFromNow >= -7 && daysFromNow <= 0) || (daysFromNow > 0 && daysFromNow <= 2)) {
          nextSuggestions.push({
            reason: daysFromNow > 0 ? 'belatedBirthday' : 'birthday',
            person,
            suggestedDate: format(upcoming, 'yyyy-MM-dd'),
          })
        }
      }

      if (person.favorite && !person.birthday) {
        nextSuggestions.push({
          reason: 'favoriteMissingBirthday',
          person,
          suggestedDate: today,
        })
      } else if (
        person.favorite
        && (!lastEvent || differenceInDays(now, parseISO(lastEvent.startDate)) > 90)
      ) {
        nextSuggestions.push({
          reason: 'inactiveFavorite',
          person,
          suggestedDate: today,
        })
      }

      const nextContact = getNextContactDate(
        lastEvent?.startDate ? parseISO(lastEvent.startDate) : null,
        person.contactFrequency,
      )

      if (nextContact && isAfter(now, nextContact)) {
        nextSuggestions.push({
          reason: 'contactFrequency',
          person,
          suggestedDate: today,
        })
      }
    }

    return nextSuggestions
  }

  const handleAccept = async (suggestion: EventSuggestion) => {
    if (suggestion.reason === 'favoriteMissingBirthday') {
      alert(`Adicionar data de nascimento para ${suggestion.person.name}.`)
      return
    }

    const suggestedDate = suggestion.suggestedDate

    await addDoc(collection(db, `users/${uid}/events-history`), buildEventPayload({
      title: suggestion.reason === 'belatedBirthday'
        ? `Feliz aniversário atrasado para ${suggestion.person.name}`
        : `Contato com ${suggestion.person.name}`,
      personIds: [suggestion.person.id],
      allDay: false,
      startDate: suggestedDate,
      endDate: suggestedDate,
      startTime: '12:00',
      endTime: '13:00',
      status: 0,
      createdAt: new Date(),
    }))

    onEventCreated()
    setSuggestions(previous => previous.filter(item => item !== suggestion))
  }

  const handleReject = (suggestion: EventSuggestion) => {
    setSuggestions(previous => previous.filter(item => item !== suggestion))
  }

  return (
    <motion.aside
      animate={{ x: 0 }}
      initial={{ x: '100%' }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={styles.panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="suggestion-panel-title"
    >
      <header className={styles.header}>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Fechar sugestões"
        >
          <X className={styles.closeIcon} aria-hidden="true" />
        </button>
        <h2 id="suggestion-panel-title" className={styles.title}>
          Sugestões de evento
        </h2>
      </header>

      {suggestions.length === 0 ? (
        <p className={styles.emptyState}>
          Adicione pessoas e eventos para ver sugestões.
        </p>
      ) : (
        <div className={styles.list}>
          {suggestions.map(suggestion => (
            <SuggestionCard
              key={`${suggestion.person.id}:${suggestion.reason}:${suggestion.suggestedDate}`}
              suggestion={suggestion}
              onAccept={() => handleAccept(suggestion)}
              onReject={() => handleReject(suggestion)}
            />
          ))}
        </div>
      )}
    </motion.aside>
  )
}
