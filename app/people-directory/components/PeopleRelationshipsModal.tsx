import styles from './PersonDialogs.module.css';
import { getEntityColor, type EntityColorMap } from '../../utils/entityColors';

type PeopleRelationshipsModalProps = {
  onClose: () => void;
  availableRelationships: string[];
  selectedRelationships: string[];
  toggleRelationship: (rel: string) => void;
  handleAddRelationship: (relationship: string) => void;
  relationshipColors: EntityColorMap;
  setRelationshipColor: (relationship: string, color: string) => Promise<void>;
};

export function PeopleRelationshipsModal({
  onClose,
  availableRelationships,
  selectedRelationships,
  toggleRelationship,
  handleAddRelationship,
  relationshipColors,
  setRelationshipColor,
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
            <div key={rel} className={styles.choiceWithColor}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  toggleRelationship(rel);
                }}
                aria-pressed={selectedRelationships.includes(rel)}
                className={`${styles.relationshipChoice} ${selectedRelationships.includes(rel) ? styles.relationshipChoiceSelected : ''}`}
                style={getEntityColorStyle(getEntityColor(relationshipColors, rel))}
              >
                {rel}
              </button>
              <input
                type="color"
                className={styles.colorInput}
                value={relationshipColors[rel] ?? '#627662'}
                onChange={(event) => void setRelationshipColor(rel, event.target.value)}
                aria-label={`Cor do relacionamento ${rel}`}
              />
            </div>
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

function getEntityColorStyle(color: string | undefined): React.CSSProperties | undefined {
  return color ? { '--entity-color': color } as React.CSSProperties : undefined;
}
