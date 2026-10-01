import { OptionalField, OptionalFieldOption } from '../../types/optionalFields';
import styles from './OptionalFields.module.css';

type OptionalFieldModalProps = {
  context: 'event' | 'person';
  availableFieldOptions: OptionalFieldOption[];
  onClose: () => void;
  onAddOptionalField: (type: OptionalField["type"]) => Promise<void>
};

export function OptionalFieldModal({ availableFieldOptions, onClose, onAddOptionalField }: OptionalFieldModalProps) {
  const handleAdd = async (type: OptionalField['type']) => {
    await onAddOptionalField(type);
    onClose();
  };

  return (
    <div
      className={styles.modalOverlay}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="optional-field-title"
      >
        <header className={styles.modalHeader}>
          <h2 id="optional-field-title" className={styles.modalTitle}>Adicionar campo opcional</h2>
        </header>

        <div className={styles.options}>
          {availableFieldOptions.length > 0 ? availableFieldOptions.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => void handleAdd(option.type)}
              className={styles.option}
            >
              <span>{option.label}</span>
              <span className={styles.optionHint}>Adicionar</span>
            </button>
          )) : (
            <p className={styles.emptyState}>Nenhum campo opcional disponível neste contexto.</p>
          )}
        </div>

        <button type="button" onClick={onClose} className={styles.cancelAction}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
