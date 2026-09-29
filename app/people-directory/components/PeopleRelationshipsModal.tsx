import styles from './PersonDialogs.module.css';

type PeopleRelationshipsModalProps = {
  onClose: () => void;
  availableRelationships: string[];
  selectedRelationships: string[];
  toggleRelationship: (rel: string) => void;
  handleAddRelationship: (relationship: string) => void;
};

export function PeopleRelationshipsModal({
  onClose,
  availableRelationships,
  selectedRelationships,
  toggleRelationship,
  handleAddRelationship,
}: PeopleRelationshipsModalProps) {
  return (
    <div className={styles.overlay} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="people-relationships-title"
      >
        <div className={styles.header}>
          <h2 id="people-relationships-title" className={styles.title}>Selecionar relacionamento</h2>
        </div>

        <div className={styles.body}>
          <div className={styles.relationshipGrid}>
          {availableRelationships.map((rel) => (
            <button
              key={rel}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                toggleRelationship(rel);
              }}
              aria-pressed={selectedRelationships.includes(rel)}
              className={`${styles.relationshipChoice} ${selectedRelationships.includes(rel) ? styles.relationshipChoiceSelected : ''}`}
            >
              {rel}
            </button>
          ))}
          </div>

          <button
            type="button"
            onClick={async () => {
              const newRel = prompt('Novo relacionamento:')?.trim();
              if (newRel) {
                await handleAddRelationship(newRel);
                toggleRelationship(newRel);
              }
            }}
            className={styles.actionLink}
          >
            + Novo relacionamento
          </button>
        </div>

        <div className={styles.footer}>
          <button type="button" onClick={onClose} className={styles.closeButton}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
