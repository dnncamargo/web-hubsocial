import { Person } from '@/app/utils/interfaces'
import styles from './EventDialogs.module.css'

type AssociatePersonModalProps = {
  onClose: () => void
  onAssociatePerson: (personId: string) => void
  onDisassociatePerson: (personId: string) => void
  associatedPersonIds: string[]
  people: Person[]
}

export function AssociatePersonModal({
  onClose,
  onAssociatePerson,
  onDisassociatePerson,
  associatedPersonIds,
  people,
}: AssociatePersonModalProps) {
  return (
    <div className={styles.overlay}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="associate-person-title"
      >
        <header className={styles.header}>
          <h2 id="associate-person-title" className={styles.title}>
            Selecionar pessoas
          </h2>
        </header>

        <div className={styles.body}>
          {people.length === 0 ? (
            <p className={styles.empty}>Nenhuma pessoa cadastrada.</p>
          ) : (
            <div className={styles.personList}>
              {people.map(person => (
                <label key={person.id} className={styles.checkRow}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={associatedPersonIds.includes(person.id)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        onAssociatePerson(person.id)
                      } else {
                        onDisassociatePerson(person.id)
                      }
                    }}
                  />
                  {person.name}
                </label>
              ))}
            </div>
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
