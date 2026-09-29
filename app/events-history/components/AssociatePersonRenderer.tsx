import { Person } from '@/app/utils/interfaces'
import styles from './EventRelations.module.css'

type AssociatePersonRendererProps = {
  personIds: string[]
  people: Person[]
  onOpenPersonList: () => void
}

export function AssociatePersonRenderer({
  personIds,
  people,
  onOpenPersonList,
}: AssociatePersonRendererProps) {
  if (personIds.length === 0) {
    return null
  }

  const firstPerson = people.find(person => person.id === personIds[0])
  const remainingCount = personIds.length - 1

  const label = firstPerson
    ? `${firstPerson.name}${remainingCount > 0 ? ` + ${remainingCount} pessoa${remainingCount > 1 ? 's' : ''}` : ''}`
    : `${personIds.length} pessoa${personIds.length > 1 ? 's' : ''}`

  return (
    <div className={styles.peopleSummary}>
      <span className={styles.summaryLabel}>Pessoas associadas</span>
      <button
        type="button"
        onClick={onOpenPersonList}
        className={styles.summaryButton}
      >
        {label}
      </button>
    </div>
  )
}
