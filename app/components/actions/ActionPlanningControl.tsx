'use client'

import { ActionHorizon, ActionPlanning } from '../../types/actions'
import { isPlannedForActionHorizon, setActionPlanningHorizon } from '../../utils/actionPlanning'
import styles from './ActionPlanningControl.module.css'

interface ActionPlanningControlProps {
  planning: ActionPlanning
  onChange: (planning: ActionPlanning) => void
}

const options: Array<{ horizon: ActionHorizon; label: string }> = [
  { horizon: 'day', label: 'Hoje' },
  { horizon: 'week', label: 'Esta semana' },
  { horizon: 'month', label: 'Este mês' },
]

export default function ActionPlanningControl({
  planning,
  onChange,
}: ActionPlanningControlProps) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Ações</legend>
      <p className={styles.description}>
        Inclua manualmente este item nos seus horizontes de ação.
      </p>

      <div className={styles.options}>
        {options.map(({ horizon, label }) => (
          <label className={styles.option} key={horizon}>
            <input
              className={styles.checkbox}
              type="checkbox"
              checked={isPlannedForActionHorizon(planning, horizon)}
              onChange={(event) => {
                onChange(
                  setActionPlanningHorizon(
                    planning,
                    horizon,
                    event.currentTarget.checked,
                  ),
                )
              }}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
