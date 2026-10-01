import { X } from 'lucide-react'
import styles from './RemoveSelectableValueButton.module.css'

type RemoveSelectableValueButtonProps = {
  value: string
  entityLabel: string
  existingEntitiesLabel: string
  onRemove: () => Promise<boolean>
}

export default function RemoveSelectableValueButton({
  value,
  entityLabel,
  existingEntitiesLabel,
  onRemove,
}: RemoveSelectableValueButtonProps) {
  const label = `Excluir ${entityLabel} ${value}`

  return (
    <button
      type="button"
      className={styles.button}
      aria-label={label}
      title={label}
      onClick={async (event) => {
        event.preventDefault()
        event.stopPropagation()
        const confirmed = window.confirm(
          `Excluir ${entityLabel} "${value}"? ${existingEntitiesLabel} existentes não serão alterados.`,
        )
        if (confirmed) await onRemove()
      }}
    >
      <X className={styles.icon} aria-hidden="true" />
    </button>
  )
}
