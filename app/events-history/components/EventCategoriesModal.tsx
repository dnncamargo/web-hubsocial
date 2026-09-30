import styles from './EventDialogs.module.css'
import { getEntityColor, type EntityColorMap } from '../../utils/entityColors'

type EventCategoriesModalProps = {
  onClose: () => void
  availableCategories: string[]
  selectedCategories: string[]
  toggleCategory: (cat: string) => void
  handleAddCategory: (category: string) => void
  categoryColors: EntityColorMap
  setCategoryColor: (category: string, color: string) => Promise<void>
}

export function EventCategoriesModal({
  onClose,
  availableCategories,
  selectedCategories,
  toggleCategory,
  handleAddCategory,
  categoryColors,
  setCategoryColor,
}: EventCategoriesModalProps) {
  return (
    <div className={styles.overlay}>
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
          <div className={styles.choices}>
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
                await handleAddCategory(newCategory)
                toggleCategory(newCategory)
              }
            }}
            className={styles.textButton}
          >
            + Nova categoria
          </button>
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
