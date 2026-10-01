import type { TaskNature } from '../../types/tasks'
import styles from './TaskNatureControl.module.css'

interface TaskNatureControlProps {
  value: TaskNature
  onChange: (value: TaskNature) => void
}

export default function TaskNatureControl({ value, onChange }: TaskNatureControlProps) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Esta tarefa acontece uma vez ou se repete?</legend>
      <div className={styles.options} role="radiogroup" aria-label="Natureza da tarefa">
        {([
          ['punctual', 'Pontual', 'Acontece uma vez.'],
          ['recurring', 'Recorrente', 'Volta conforme uma frequência.'],
        ] as const).map(([nature, label, description]) => (
          <label
            className={value === nature
              ? `${styles.option} ${styles.optionSelected}`
              : styles.option}
            key={nature}
          >
            <input
              type="radio"
              name="task-nature"
              value={nature}
              checked={value === nature}
              onChange={() => onChange(nature)}
            />
            <span>
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
