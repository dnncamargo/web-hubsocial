import type { CSSProperties } from 'react'
import { getEntityColor, type EntityColorMap } from '../../utils/entityColors'
import styles from './EventRelations.module.css'

type EventCategoriesRendererProps = {
  selectedCategories: string[]
  categoryColors?: EntityColorMap
}

export function EventCategoriesRenderer({
  selectedCategories,
  categoryColors,
}: EventCategoriesRendererProps) {
  if (selectedCategories.length === 0) return null

  return (
    <div className={styles.categories}>
      {selectedCategories.map(category => (
        <span
          key={category}
          className={styles.category}
          style={getEntityColorStyle(getEntityColor(categoryColors, category))}
        >
          {category}
        </span>
      ))}
    </div>
  )
}

function getEntityColorStyle(color: string | undefined): CSSProperties | undefined {
  return color ? { '--entity-color': color } as CSSProperties : undefined
}
