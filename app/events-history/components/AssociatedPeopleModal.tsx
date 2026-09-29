import { Person } from '@/app/utils/interfaces'
import styles from './EventDialogs.module.css'

type AssociatedPeopleModalProps = {
  personIds: string[]
  people: Person[]
  onDisassociatePerson: (personId: string) => void
  onClose: () => void
}

export function AssociatedPeopleModal({
  personIds,
  people,
  onDisassociatePerson,
  onClose,
}: AssociatedPeopleModalProps) {
  return (
    <div className={styles.overlay}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="associated-people-title"
      >
        <header className={styles.header}>
          <h2 id="associated-people-title" className={styles.title}>
            Pessoas associadas
          </h2>
        </header>

        <div className={styles.body}>
          {personIds.length === 0 ? (
            <p className={styles.empty}>Nenhuma pessoa associada.</p>
          ) : (
            <ul className={styles.associatedList}>
              {personIds.map((id) => {
                const person = people.find(item => item.id === id)
                if (!person) return null

                return (
                  <li key={id} className={styles.personRow}>
                    <span className={styles.personName}>{person.name}</span>
                    <div className={styles.rowActions}>
                      <a href={`/person/${id}`} className={styles.link}>
                        Detalhes
                      </a>
                      <button
                        type="button"
                        onClick={() => onDisassociatePerson(id)}
                        className={styles.dangerButton}
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <footer className={styles.footer}>
          <button type="button" onClick={onClose} className={styles.secondaryButton}>
            Fechar
          </button>
        </footer>
      </section>
    </div>
  )
}
