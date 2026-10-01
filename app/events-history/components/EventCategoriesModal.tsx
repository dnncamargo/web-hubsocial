import styles from './EventDialogs.module.css'
import { getEntityColor, type EntityColorMap } from '../../utils/entityColors'
import RemoveSelectableValueButton from '../../components/ui/RemoveSelectableValueButton'

type EventCategoriesModalProps = {
  onClose: () => void
  availableCategories: string[]
  selectedCategories: string[]
  toggleCategory: (cat: string) => void
  handleAddCategory: (category: string) => Promise<boolean>
  removeCategory: (category: string) => Promise<boolean>
  error: string | null
  categoryColors: EntityColorMap
  setCategoryColor: (category: string, color: string) => Promise<void>
}

export function EventCategoriesModal({
  onClose,
  availableCategories,
  selectedCategories,
  toggleCategory,
  handleAddCategory,
  removeCategory,
  error,
  categoryColors,
  setCategoryColor,
}: EventCategoriesModalProps) {
  return (
    <div
      className={styles.overlay}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-categories-title"
      >
        <header className={styles.header}>
          <h2 id="event-categories-title" className={styles.title}>
            Selecionar categorias
          </h2>
        </header>

        <div className={styles.body}>
          <div className={`${styles.choices} ${styles.editableChoices}`}>
            {availableCategories.map((category) => {
              const selected = selectedCategories.includes(category)
              return (
                <div key={category} className={styles.choiceWithColor}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      toggleCategory(category)
                    }}
                    className={selected
                      ? `${styles.choice} ${styles.choiceSelected}`
                      : styles.choice}
                    style={getEntityColorStyle(getEntityColor(categoryColors, category))}
                    aria-pressed={selected}
                  >
                    {category}
                  </button>
                  <input
                    type="color"
                    className={styles.colorInput}
                    value={categoryColors[category] ?? '#536d82'}
                    onChange={(event) => void setCategoryColor(category, event.target.value)}
                    aria-label={`Cor da categoria ${category}`}
                  />
                  <RemoveSelectableValueButton
                    value={category}
                    entityLabel="categoria"
                    existingEntitiesLabel="Eventos"
                    onRemove={() => removeCategory(category)}
                  />
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={async (event) => {
              event.preventDefault()
              const newCategory = prompt('Nova categoria:')?.trim()
              if (newCategory) {
                const added = await handleAddCategory(newCategory)
                if (added) toggleCategory(newCategory)
              }
            }}
            className={styles.textButton}
          >
            + Nova categoria
          </button>
          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>

        <footer className={styles.footer}>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              onClose()
            }}
            className={styles.secondaryButton}
          >
            Fechar
          </button>
        </footer>
      </section>
    </div>
  )
}

function getEntityColorStyle(color: string | undefined): React.CSSProperties | undefined {
  return color ? { '--entity-color': color } as React.CSSProperties : undefined
}
