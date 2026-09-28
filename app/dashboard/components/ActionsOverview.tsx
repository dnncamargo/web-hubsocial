import { ActionProjection, ActionProjectionItem } from '../../types/actions'
import { getWeatherConditionLabel, WeatherSnapshot } from '../../utils/weather'
import styles from './ActionsOverview.module.css'

interface ActionsOverviewProps {
  actions: ActionProjection
  weather: WeatherSnapshot | null
}

function getAutomationStatus(item: ActionProjectionItem) {
  if (item.automation.rules.length === 0) return null

  if (item.automation.highlighted) {
    return {
      label: 'Condição atendida',
      className: styles.automationMatched,
    }
  }

  if (item.automation.rules.some((rule) => rule.status === 'unresolved')) {
    return {
      label: 'Contexto pendente',
      className: styles.automationPending,
    }
  }

  return {
    label: 'Condição não atendida',
    className: styles.automationNotMatched,
  }
}

function ActionRow({ item }: { item: ActionProjectionItem }) {
  const automationStatus = getAutomationStatus(item)
  const rowClassName = item.automation.highlighted
    ? `${styles.row} ${styles.highlightedRow}`
    : styles.row

  return (
    <li className={rowClassName}>
      <span
        className={item.completed ? styles.completedMarker : styles.pendingMarker}
        aria-hidden="true"
      />
      <div className={styles.rowContent}>
        <span className={item.completed ? styles.completedTitle : styles.title}>
          {item.title}
        </span>
        <span className={styles.meta}>
          {item.sourceType === 'event' ? 'Evento' : 'Tarefa'}
          {item.date ? ` · ${item.date}` : ''}
          {item.time ? ` · ${item.time}` : ''}
        </span>
        {automationStatus && (
          <span className={automationStatus.className}>
            {automationStatus.label}
          </span>
        )}
      </div>
    </li>
  )
}

function ActionSection({
  title,
  items,
  primary = false,
}: {
  title: string
  items: ActionProjectionItem[]
  primary?: boolean
}) {
  return (
    <section className={primary ? styles.primarySection : styles.secondarySection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <span className={styles.count}>{items.length}</span>
      </div>

      {items.length > 0 ? (
        <ul className={styles.list}>
          {items.map((item) => (
            <ActionRow item={item} key={item.key} />
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>Nenhuma ação marcada para este período.</p>
      )}
    </section>
  )
}

export default function ActionsOverview({ actions, weather }: ActionsOverviewProps) {
  return (
    <div className={styles.container}>
      {weather && (
        <div className={styles.weatherContext}>
          <span>
            {getWeatherConditionLabel(weather.condition)} · {Math.round(weather.temperatureC)}°C
          </span>
          <span className={styles.weatherAttribution}>
            Dados meteorológicos:{' '}
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open-Meteo
            </a>
            {' '}· condição simplificada pelo app
          </span>
        </div>
      )}

      <ActionSection title="Ações do dia" items={actions.day} primary />

      <div className={styles.secondaryGrid}>
        <ActionSection title="Esta semana" items={actions.week} />
        <ActionSection title="Este mês" items={actions.month} />
      </div>
    </div>
  )
}
