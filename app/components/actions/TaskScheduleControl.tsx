import type { WeekdayName } from '../../types/automation'
import type { TaskNature, TaskSchedule } from '../../types/tasks'
import {
  changeTaskFrequency,
  changeWeeklyMode,
  toggleTaskWeekday,
} from '../../utils/taskAuthoring'
import styles from './TaskScheduleControl.module.css'

interface TaskScheduleControlProps {
  nature: TaskNature
  value?: TaskSchedule
  onChange: (value: TaskSchedule | undefined) => void
}

const weekdays: Array<{ value: WeekdayName; label: string }> = [
  { value: 'monday', label: 'Seg' },
  { value: 'tuesday', label: 'Ter' },
  { value: 'wednesday', label: 'Qua' },
  { value: 'thursday', label: 'Qui' },
  { value: 'friday', label: 'Sex' },
  { value: 'saturday', label: 'Sáb' },
  { value: 'sunday', label: 'Dom' },
]

export default function TaskScheduleControl({
  nature,
  value,
  onChange,
}: TaskScheduleControlProps) {
  const selectFrequency = (frequency: string) => {
    if (frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly') {
      onChange(changeTaskFrequency(frequency))
    }
  }

  const selectWeeklyMode = (mode: string) => {
    if (value?.type !== 'weekly') return

    if (mode === 'flexible') {
      onChange(changeWeeklyMode(value, 'flexible'))
      return
    }

    onChange(changeWeeklyMode(value, 'specific'))
  }

  const toggleWeekday = (weekday: WeekdayName, selected: boolean) => {
    if (value?.type !== 'weekly') return

    onChange(toggleTaskWeekday(value, weekday, selected))
  }

  const scheduleFrequency = value?.type === 'daily'
    || value?.type === 'weekly'
    || value?.type === 'monthly'
    ? value.type
    : 'daily'
  const weeklyMode = value?.type === 'weekly' && value.weekdays && value.weekdays.length > 0
    ? 'specific'
    : 'flexible'
  if (nature !== 'recurring') return null

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Com que frequência ela se repete?</legend>
      <label className={styles.field}>
        <span>Frequência</span>
        <select
          className={styles.select}
          value={scheduleFrequency}
          onChange={event => selectFrequency(event.currentTarget.value)}
        >
          <option value="daily">Diariamente</option>
          <option value="weekly">Semanalmente</option>
          <option value="monthly">Mensalmente</option>
        </select>
      </label>

      {value?.type === 'weekly' && (
        <div className={styles.detail}>
          <label className={styles.field}>
            <span>Forma semanal</span>
            <select
              className={styles.select}
              value={weeklyMode}
              onChange={event => selectWeeklyMode(event.currentTarget.value)}
            >
              <option value="flexible">Flexível</option>
              <option value="specific">Em dias específicos</option>
            </select>
          </label>

          {weeklyMode === 'specific' && (
            <div className={styles.weekdays}>
              {weekdays.map(weekday => (
                <label className={styles.weekday} key={weekday.value}>
                  <input
                    type="checkbox"
                    checked={value.weekdays?.includes(weekday.value) ?? false}
                    onChange={event =>
                      toggleWeekday(weekday.value, event.currentTarget.checked)}
                  />
                  <span>{weekday.label}</span>
                </label>
              ))}
            </div>
          )}

          {weeklyMode === 'flexible' && (
            <p className={styles.hint}>Uma execução em qualquer dia da semana atual.</p>
          )}
        </div>
      )}

      {value?.type === 'monthly' && (
        <label className={styles.field}>
          <span>Dia do mês</span>
          <input
            className={styles.numberInput}
            type="number"
            min="1"
            max="31"
            value={value.dayOfMonth}
            onChange={event => onChange({
              ...value,
              dayOfMonth: Math.max(1, Math.min(31, Number(event.currentTarget.value))),
            })}
          />
          <p className={styles.hint}>Em meses menores, usa o último dia disponível.</p>
        </label>
      )}
    </fieldset>
  )
}
