import styles from './PersonDialogs.module.css';
import { getEntityColor, type EntityColorMap } from '../../utils/entityColors';
import RemoveSelectableValueButton from '../../components/ui/RemoveSelectableValueButton';

type PeopleRelationshipsModalProps = {
  onClose: () => void;
  availableRelationships: string[];
  selectedRelationships: string[];
  toggleRelationship: (rel: string) => void;
  handleAddRelationship: (relationship: string) => Promise<boolean>;
  removeRelationship: (relationship: string) => Promise<boolean>;
  error: string | null;
  relationshipColors: EntityColorMap;
  setRelationshipColor: (relationship: string, color: string) => Promise<void>;
};

export function PeopleRelationshipsModal({
  onClose,
  availableRelationships,
  selectedRelationships,
  toggleRelationship,
  handleAddRelationship,
  removeRelationship,
  error,
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
              <RemoveSelectableValueButton
                value={rel}
                entityLabel="relacionamento"
                existingEntitiesLabel="Pessoas"
                onRemove={() => removeRelationship(rel)}
              />
            </div>
          ))}
          </div>

          <button
            type="button"
            onClick={async () => {
              const newRel = prompt('Novo relacionamento:')?.trim();
              if (newRel) {
                const added = await handleAddRelationship(newRel);
                if (added) toggleRelationship(newRel);
              }
            }}
            className={styles.actionLink}
          >
            + Novo relacionamento
          </button>
          {error && <p className={styles.error} role="alert">{error}</p>}
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
