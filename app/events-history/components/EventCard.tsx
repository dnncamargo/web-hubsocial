'use client'

import { JSX } from 'react';
import { useNavigate } from 'react-router';
import { Event } from '../../utils/interfaces';
import { getEntityColor, type EntityColorMap } from '../../utils/entityColors';
import { ArrowRight, Clock, Link, MapPin, SquarePen } from 'lucide-react';
import { formatDateRange } from '../../utils/services';
import styles from './EventCard.module.css';

/**
 * @interface EventCardProps
 * @description Props para o componente `EventCard`, que exibe informações resumidas de um evento e oferece ação de edição.
 * @property {Event} event - O objeto do evento a ser exibido no cartão.
 * @property {(event: Event) => void} onEditEvent - Função chamada ao solicitar a edição do evento. Recebe o objeto do evento como argumento.
 */
interface EventCardProps {
  event: Event;
  onEditEvent: (event: Event) => void;
  categoryColors?: EntityColorMap;
}

/**
 * @component
 * @description Componente para exibir um cartão resumido de um evento, incluindo título, data, hora (opcional), endereço e descrição (opcional). Ao clicar no cartão, navega para a página de detalhes do evento.
 * @param {EventCardProps} { event, onEditEvent } - Props para o componente.
 * @returns {JSX.Element} Um cartão representando as informações do evento.
 */
const EventCard = ({ event, onEditEvent, categoryColors }: EventCardProps): JSX.Element => {
  const navigate = useNavigate();

  const description = event.optionalFields?.find(
    (field) => field.label === 'Descrição' && typeof field.value === 'string',
  )

  const openEvent = () => navigate(`/events-history/${event.id}`)
  const dateRange = formatDateRange(
    event.startDate,
    event.endDate,
    event.startTime,
    event.endTime,
    event.allDay,
  )

  return (
    <article
      className={styles.card}
      role="link"
      tabIndex={0}
      aria-label={`Abrir evento ${event.title}`}
      onClick={openEvent}
      onKeyDown={(eventKey) => {
        if (eventKey.key === 'Enter' || eventKey.key === ' ') {
          eventKey.preventDefault()
          openEvent()
        }
      }}
    >
      <header className={styles.header}>
        <h2 className={styles.title}>{event.title}</h2>
        <span className={styles.date}>
          <span>{dateRange.start}</span>
          {dateRange.end && (
            <>
              <ArrowRight className={styles.dateRangeIcon} aria-hidden="true" />
              <span>{dateRange.end}</span>
            </>
          )}
        </span>
      </header>

      <div className={styles.metaList}>
        {event.startTime && (
          <div className={styles.metaRow}>
            <Clock className={styles.metaIcon} aria-hidden="true" />
            <span className={styles.metaText}>{event.startTime}</span>
          </div>
        )}

        {event.location && (
          <div className={styles.metaRow}>
            {event.location.startsWith('http') ? (
              <Link className={styles.metaIcon} aria-hidden="true" />
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

      <footer className={styles.footer}>
        <div className={styles.categories}>
          {event.categories?.map((category) => (
            <span
              key={category}
              className={styles.category}
              style={getEntityColorStyle(getEntityColor(categoryColors, category))}
            >
              {category}
            </span>
          ))}
        </div>

        <button
          type="button"
          className={styles.editButton}
          onClick={(clickEvent) => {
            clickEvent.stopPropagation()
            onEditEvent(event)
          }}
        >
          Editar
        </button>
      </footer>
    </article>
  )
}

export default EventCard

function getEntityColorStyle(color: string | undefined): React.CSSProperties | undefined {
  return color ? { '--entity-color': color } as React.CSSProperties : undefined
}
