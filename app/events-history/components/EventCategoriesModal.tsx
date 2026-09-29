import styles from './EventDialogs.module.css'

type EventCategoriesModalProps = {
  onClose: () => void
  availableCategories: string[]
  selectedCategories: string[]
  toggleCategory: (cat: string) => void
  handleAddCategory: (category: string) => void
}

export function EventCategoriesModal({
  onClose,
  availableCategories,
  selectedCategories,
  toggleCategory,
  handleAddCategory,
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
                <button
                  key={category}
                  type="button"
                  onClick={(event) => {
                    event.preventDefault()
                    toggleCategory(category)
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
