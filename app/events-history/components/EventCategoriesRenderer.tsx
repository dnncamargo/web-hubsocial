import styles from './EventRelations.module.css'

type EventCategoriesRendererProps = {
  selectedCategories: string[]
}

export function EventCategoriesRenderer({
  selectedCategories,
}: EventCategoriesRendererProps) {
  if (selectedCategories.length === 0) return null

  return (
    <div className={styles.categories}>
      {selectedCategories.map(category => (
        <span key={category} className={styles.category}>
          {category}
        </span>
      ))}
    </div>
  )
}
