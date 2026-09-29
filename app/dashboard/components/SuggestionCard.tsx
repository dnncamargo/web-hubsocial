import { EventSuggestion } from '../../utils/interfaces'
import styles from './SuggestionCard.module.css'

interface SuggestionCardProps {
  suggestion: EventSuggestion
  onAccept: () => void
  onReject: () => void
}

export default function SuggestionCard({
  suggestion,
  onAccept,
  onReject,
}: SuggestionCardProps) {
  const { person, reason } = suggestion

  const reasonText = {
    birthday: 'Aniversário em breve 🎂',
    belatedBirthday: 'Aniversário recente 🎉',
    contactFrequency: 'Faz tempo desde o último contato 👋',
    inactiveFavorite: 'Favorito sem interação recente ⭐',
    favoriteMissingBirthday: 'Adicionar data de aniversário 📅',
  }

  const translatedReason = reasonText[reason] || 'Motivo desconhecido'

  return (
    <article className={styles.card}>
      <p className={styles.personName}>{person.name}</p>
      <p className={styles.reason}>{translatedReason}</p>

      <div className={styles.actions}>
        <button type="button" onClick={onAccept} className={styles.acceptButton}>
          Criar evento
        </button>
        <button type="button" onClick={onReject} className={styles.rejectButton}>
          Rejeitar
        </button>
      </div>
    </article>
  )
}
