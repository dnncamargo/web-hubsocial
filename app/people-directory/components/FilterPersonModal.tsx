'use client';

import styles from './PersonDialogs.module.css';
import type { PersonFilter } from '../utils/personFilters';

interface FilterPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: PersonFilter;
  setFilters: (filters: PersonFilter) => void;
  availableRelationships: string[];
}

export default function FilterPersonModal({
  isOpen,
  onClose,
  filters,
  setFilters,
  availableRelationships,
}: FilterPersonModalProps) {
  if (!isOpen) return null;

  const toggleEnabled = () => {
    setFilters({ ...filters, enabled: !filters.enabled });
  };

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={`${styles.dialog} ${styles.filterDialog}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="people-filters-title"
      >
        <div className={styles.header}>
          <h2 id="people-filters-title" className={styles.title}>Filtros de pessoas</h2>
        </div>

        <div className={styles.body}>
        <div className={styles.switchRow}>
          <span className={styles.switchLabel}>Ativar filtros</span>
          <button
            type="button"
            onClick={toggleEnabled}
            role="switch"
            aria-checked={filters.enabled}
            aria-label="Ativar filtros de pessoas"
            className={`${styles.switch} ${filters.enabled ? styles.switchActive : ''}`}
          >
            <span className={`${styles.switchThumb} ${filters.enabled ? styles.switchThumbActive : ''}`} />
          </button>
        </div>

        <div>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={filters.hasPhone}
              onChange={(e) =>
                setFilters({ ...filters, hasPhone: e.target.checked })
              }
              className={styles.checkbox}
            />
            Com telefone
          </label>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={filters.hasEmail}
              onChange={(e) =>
                setFilters({ ...filters, hasEmail: e.target.checked })
              }
              className={styles.checkbox}
            />
            Com e-mail
          </label>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={filters.hasBirthday}
              onChange={(e) =>
                setFilters({ ...filters, hasBirthday: e.target.checked })
              }
              className={styles.checkbox}
            />
            Com aniversário
          </label>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={filters.hasAddressByCep}
              onChange={(e) =>
                setFilters({ ...filters, hasAddressByCep: e.target.checked })
              }
              className={styles.checkbox}
            />
            Com endereço via CEP
          </label>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={filters.hasNote}
              onChange={(e) =>
                setFilters({ ...filters, hasNote: e.target.checked })
              }
              className={styles.checkbox}
            />
            Com anotações
          </label>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={filters.isFavorite}
              onChange={(e) =>
                setFilters({ ...filters, isFavorite: e.target.checked })
              }
              className={styles.checkbox}
            />
            Favoritos
          </label>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={filters.hasContactFrequency}
              onChange={(e) =>
                setFilters({ ...filters, hasContactFrequency: e.target.checked })
              }
              className={styles.checkbox}
            />
            Com frequência de contato
          </label>

          {/* Tipos de relacionamento */}
          <div className={styles.filterRelationshipSection}>
            <p className={styles.sectionLabel}>Tipo de relacionamento</p>
            <div className={styles.relationshipGrid}>
              {availableRelationships.map((rel) => {
                const selected = filters.selectedRelationships.includes(rel);
                return (
                  <button
                    key={rel}
                    type="button"
                    onClick={() => {
                      const updated = selected
                        ? filters.selectedRelationships.filter(r => r !== rel)
                        : [...filters.selectedRelationships, rel];
                      setFilters({ ...filters, selectedRelationships: updated });
                    }}
                    aria-pressed={selected}
                    className={`${styles.relationshipChoice} ${selected ? styles.relationshipChoiceSelected : ''}`}
                  >
                    {rel}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
