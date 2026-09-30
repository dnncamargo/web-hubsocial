'use client'

import { Star, X } from 'lucide-react'
import styles from './EventDialogs.module.css'

export interface EventFilter {
  enabled: boolean
  startDate: string
  endDate: string
  hasRating: number
  hasTasks: boolean
  hasNotes: boolean
  hasAddressByCEP: boolean
  selectedCategories: string[]
}

interface EventFilterModalProps {
  isOpen: boolean
  onClose: () => void
  filters: EventFilter
  setFilters: (filters: EventFilter) => void
  availableCategories: string[]
}

export default function EventFilterModal({
  isOpen,
  onClose,
  filters,
  setFilters,
  availableCategories,
}: EventFilterModalProps) {
  if (!isOpen) return null

  const toggleEnabled = () => {
    setFilters({ ...filters, enabled: !filters.enabled })
  }

  const isEndBeforeStart =
    filters.startDate
    && filters.endDate
    && filters.endDate < filters.startDate

  return (
    <div className={styles.overlay}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-filter-title"
      >
        <header className={styles.header}>
          <h2 id="event-filter-title" className={styles.title}>Filtros</h2>
        </header>

        <div className={styles.body}>
          <div className={styles.switchRow}>
            <span className={styles.switchLabel}>Ativar filtros</span>
            <button
              type="button"
              role="switch"
              aria-checked={filters.enabled}
              onClick={toggleEnabled}
              className={filters.enabled
                ? `${styles.switch} ${styles.switchActive}`
                : styles.switch}
            >
              <span
                className={filters.enabled
                  ? `${styles.switchThumb} ${styles.switchThumbActive}`
                  : styles.switchThumb}
                aria-hidden="true"
              />
            </button>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="event-filter-start">Data inicial</label>
            <div className={styles.dateControl}>
              <input
                id="event-filter-start"
                type="date"
                value={filters.startDate}
                onChange={(event) =>
                  setFilters({ ...filters, startDate: event.target.value })}
                className={styles.input}
              />
              {filters.startDate && (
                <button
                  type="button"
                  className={styles.clearDateButton}
                  aria-label="Remover data inicial"
                  onClick={() => setFilters({ ...filters, startDate: '' })}
                >
                  <X className={styles.clearDateIcon} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="event-filter-end">Data final</label>
            <div className={styles.dateControl}>
              <input
                id="event-filter-end"
                type="date"
                value={filters.endDate}
                onChange={(event) =>
                  setFilters({ ...filters, endDate: event.target.value })}
                className={styles.input}
              />
              {filters.endDate && (
                <button
                  type="button"
                  className={styles.clearDateButton}
                  aria-label="Remover data final"
                  onClick={() => setFilters({ ...filters, endDate: '' })}
                >
                  <X className={styles.clearDateIcon} aria-hidden="true" />
                </button>
              )}
            </div>
            {isEndBeforeStart && (
              <p className={styles.error}>
                A data final não pode ser anterior à inicial.
              </p>
            )}
          </div>

          <div className={styles.field}>
            <p className={styles.sectionLabel}>Avaliação do evento</p>
            <div className={styles.rating} aria-label="Avaliação mínima">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = star <= filters.hasRating
                return (
                  <button
                    key={star}
                    type="button"
                    className={active
                      ? `${styles.starButton} ${styles.starButtonActive}`
                      : styles.starButton}
                    onClick={() =>
                      setFilters({
                        ...filters,
                        hasRating: filters.hasRating === star ? 0 : star,
                      })}
                    aria-label={`Filtrar por avaliação mínima de ${star}`}
                    aria-pressed={active}
                  >
                    <Star
                      className={styles.starIcon}
                      fill={active ? 'currentColor' : 'none'}
                      aria-hidden="true"
                    />
                  </button>
                )
              })}
            </div>
          </div>

          <div className={styles.checkList}>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={filters.hasTasks}
                onChange={(event) =>
                  setFilters({ ...filters, hasTasks: event.target.checked })}
                className={styles.checkbox}
              />
              Com tarefas
            </label>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={filters.hasNotes}
                onChange={(event) =>
                  setFilters({ ...filters, hasNotes: event.target.checked })}
                className={styles.checkbox}
              />
              Com anotações
            </label>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={filters.hasAddressByCEP}
                onChange={(event) =>
                  setFilters({ ...filters, hasAddressByCEP: event.target.checked })}
                className={styles.checkbox}
              />
              Com endereço via CEP
            </label>
          </div>

          <div className={styles.field}>
            <p className={styles.sectionLabel}>Categorias</p>
            <div className={styles.choices}>
              {availableCategories.map((category) => {
                const selected = filters.selectedCategories.includes(category)
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      const updated = selected
                        ? filters.selectedCategories.filter(item => item !== category)
                        : [...filters.selectedCategories, category]
                      setFilters({ ...filters, selectedCategories: updated })
                    }}
                    className={selected
                      ? `${styles.choice} ${styles.choiceSelected}`
                      : styles.choice}
                    aria-pressed={selected}
                  >
                    {category}
                  </button>
                )
              })}
            </div>
          </div>
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
