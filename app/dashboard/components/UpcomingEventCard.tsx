'use client'

import { JSX } from 'react'
import { Event, Person } from '@/app/utils/interfaces'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarCheck2 as CheckIcon,
  CalendarDays as CalendarIcon,
  Link as LinkIcon,
  MapPin,
  SquarePen,
  User,
} from 'lucide-react'
import styles from './UpcomingEventCard.module.css'

interface UpcomingEventCardProps {
  event: Event
  person?: Person
  onToggleStatus?: (eventId: string, newStatus: 0 | 1) => void
}

const formatDate = (date: string, hour?: string) => {
  const [year, month, day] = date.split('-').map(Number)
  const parsedDate = new Date(year, month - 1, day)
  const dayOfWeek = format(parsedDate, 'EEEE', { locale: ptBR })
  const dayOfMonth = format(parsedDate, "d 'de' MMMM", { locale: ptBR })

  return `${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}, ${dayOfMonth}${hour ? ` às ${hour}` : ''}`
}

export default function UpcomingEventCard({
  event,
  person,
  onToggleStatus,
}: UpcomingEventCardProps): JSX.Element {
  const description = event.optionalFields?.find(
    field => field.label === 'Descrição' && typeof field.value === 'string',
  )
  const isCompleted = event.status === 1

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <h2 className={styles.title}>{event.title}</h2>
        <button
          type="button"
          className={isCompleted
            ? `${styles.statusButton} ${styles.statusCompleted}`
            : styles.statusButton}
          aria-pressed={isCompleted}
          onClick={() => onToggleStatus?.(event.id, isCompleted ? 0 : 1)}
        >
          <CheckIcon className={styles.statusIcon} aria-hidden="true" />
          {isCompleted ? 'Concluído' : 'Pendente'}
        </button>
      </header>

      <div className={styles.metaList}>
        <div className={styles.metaRow}>
          <CalendarIcon className={styles.metaIcon} aria-hidden="true" />
          <span className={styles.metaText}>
            {formatDate(event.startDate, event.startTime)}
          </span>
        </div>

        {person && (
          <div className={styles.metaRow}>
            <User className={styles.metaIcon} aria-hidden="true" />
            <span className={styles.metaText}>{person.name}</span>
          </div>
        )}

        {event.location && (
          <div className={styles.metaRow}>
            {event.location.startsWith('http') ? (
              <LinkIcon className={styles.metaIcon} aria-hidden="true" />
            ) : (
              <MapPin className={styles.metaIcon} aria-hidden="true" />
            )}
            <span className={styles.metaText}>{event.location}</span>
          </div>
        )}

        {description && (
          <div className={styles.metaRow}>
            <SquarePen className={styles.metaIcon} aria-hidden="true" />
            <span className={`${styles.metaText} ${styles.description}`}>
              {description.value as string}
            </span>
          </div>
        )}
      </div>

      {event.categories && event.categories.length > 0 && (
        <div className={styles.categories}>
          {event.categories.map(category => (
            <span key={category} className={styles.category}>
              {category}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
