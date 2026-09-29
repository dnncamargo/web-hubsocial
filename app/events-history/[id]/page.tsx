'use client'

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../utils/firebaseConfig'
import { useAuth } from '@/app/components/auth/AuthProvider'
import { Event, Person } from '@/app/utils/interfaces'
import { OptionalField } from '@/app/types/optionalFields'
import { createGoogleCalendarEvent } from '@/app/utils/googleCalendar'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import { CheckCircle, Circle, Star } from 'lucide-react'
import styles from './EventDetails.module.css'

const EventDetails = () => {
  const { uid, googleAccessToken } = useAuth()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [event, setEvent] = useState<Event | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [currentRating, setCurrentRating] = useState(0)

  useEffect(() => {
    if (uid && id) {
      fetchEvent()
    }
  }, [uid, id])

  useEffect(() => {
    if (typeof event?.rating === 'number') {
      setCurrentRating(event.rating)
    }
  }, [event?.rating])

  const fetchEvent = async (): Promise<void> => {
    try {
      const docRef = doc(db, `users/${uid}/events-history/${id}`)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) return

      const eventData = {
        id: docSnap.id,
        ...docSnap.data(),
      } as Event

      setEvent(eventData)

      if (eventData.personIds && eventData.personIds.length > 0) {
        const personPromises = eventData.personIds.map(async (personId) => {
          const personRef = doc(db, `users/${uid}/people-directory`, personId)
          const personSnap = await getDoc(personRef)

          if (personSnap.exists()) {
            return { id: personSnap.id, ...personSnap.data() } as Person
          }

          return null
        })

        const loadedPeople = await Promise.all(personPromises)
        setPeople(loadedPeople.filter((person): person is Person => person !== null))
      } else {
        setPeople([])
      }
    } catch (error) {
      console.error('Erro ao buscar evento:', error)
    }
  }

  const handleRatingChange = async (value: number) => {
    const newRating = currentRating === value ? 0 : value
    setCurrentRating(newRating)

    await updateDoc(doc(db, `users/${uid}/events-history/${id}`), {
      rating: newRating,
    })
  }

  const handleCreateCalendarEvent = async () => {
    if (!googleAccessToken) {
      alert('Autorização do Google não está disponível.')
      return
    }

    try {
      await createGoogleCalendarEvent(event, googleAccessToken)
    } catch (error) {
      console.error('Erro ao criar evento no Google Calendar:', error)
      alert('Não foi possível criar o evento no Google Calendar.')
    }
  }

  const renderOptionalFieldValue = (field: OptionalField) => {
    switch (field.type) {
      case 'text':
      case 'additionalEmail':
      case 'additionalPhone':
      case 'url':
        return field.value as string

      case 'address': {
        const { address, number, district, city, state, zipcode } = field.value
        const parts = [
          address && `Endereço: ${address}`,
          number && `Número: ${number}`,
          district && `Bairro: ${district}`,
          city && `Cidade: ${city}`,
          state && `Estado: ${state}`,
          zipcode && `CEP: ${zipcode}`,
        ].filter(Boolean)

        return parts.join(', ')
      }

      case 'tasks':
        return (
          <ul className={styles.taskList}>
            {(field.value as { id: string; text: string; done?: boolean }[]).map(task => (
              <li key={task.id} className={styles.taskItem}>
                {task.done ? (
                  <CheckCircle
                    className={`${styles.taskIcon} ${styles.taskIconDone}`}
                    aria-hidden="true"
                  />
                ) : (
                  <Circle className={styles.taskIcon} aria-hidden="true" />
                )}
                <span className={task.done ? styles.taskDone : undefined}>
                  {task.text}
                </span>
              </li>
            ))}
          </ul>
        )

      default:
        return 'Valor não suportado'
    }
  }

  if (!event) {
    return <div className={styles.loading}>Carregando as informações do evento...</div>
  }

  return (
    <ProtectedRoute>
      <main className={styles.page}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>Evento</p>
            <h1 className={styles.title}>{event.title}</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={styles.backButton}
          >
            Voltar
          </button>
        </header>

        <div className={styles.layout}>
          <div className={styles.column}>
            <section className={styles.section}>
              <header className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Informações principais</h2>
              </header>
              <dl className={styles.definitionList}>
                <div className={styles.definitionRow}>
                  <dt className={styles.term}>Data</dt>
                  <dd className={styles.value}>{event.startDate}</dd>
                </div>
                <div className={styles.definitionRow}>
                  <dt className={styles.term}>Hora</dt>
                  <dd className={styles.value}>{event.startTime || 'Dia inteiro'}</dd>
                </div>
                {event.location && (
                  <div className={styles.definitionRow}>
                    <dt className={styles.term}>Local</dt>
                    <dd className={styles.value}>{event.location}</dd>
                  </div>
                )}
              </dl>
            </section>

            {event.optionalFields && event.optionalFields.length > 0 && (
              <section className={styles.section}>
                <header className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Outras informações</h2>
                </header>
                <div className={styles.optionalList}>
                  {event.optionalFields.map(field => (
                    <div key={field.id} className={styles.optionalItem}>
                      <p className={styles.optionalLabel}>{field.label}</p>
                      <div className={styles.optionalValue}>
                        {renderOptionalFieldValue(field)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className={styles.column}>
            {people.length > 0 && (
              <section className={styles.section}>
                <header className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Pessoas associadas</h2>
                </header>
                <ul className={styles.peopleList}>
                  {people.map(person => (
                    <li key={person.id} className={styles.personItem}>
                      <p className={styles.personName}>{person.name}</p>
                      {person.phone && (
                        <p className={styles.personMeta}>{person.phone}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className={styles.section}>
              <header className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Avaliação</h2>
              </header>
              <div className={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map(star => {
                  const active = star <= currentRating
                  return (
                    <button
                      key={star}
                      type="button"
                      className={active
                        ? `${styles.starButton} ${styles.starButtonActive}`
                        : styles.starButton}
                      onClick={() => handleRatingChange(star)}
                      aria-label={`Avaliar evento com ${star} estrela${star > 1 ? 's' : ''}`}
                      aria-pressed={active}
                    >
                      <Star
                        className={styles.starIcon}
                        fill={active ? 'currentColor' : 'none'}
                        aria-hidden="true"
                      />
                    </button>
                  )
                })}
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={handleCreateCalendarEvent}
                  className={styles.calendarButton}
                >
                  Criar no Google Calendar
                </button>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </ProtectedRoute>
  )
}

export default EventDetails
