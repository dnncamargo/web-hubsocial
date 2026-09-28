import { ActionProjection, ActionProjectionItem } from '../../types/actions'
import styles from './ActionsOverview.module.css'

interface ActionsOverviewProps {
  actions: ActionProjection
}

function ActionRow({ item }: { item: ActionProjectionItem }) {
  return (
    <li className={styles.row}>
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

export default function ActionsOverview({ actions }: ActionsOverviewProps) {
  return (
    <div className={styles.container}>
      <ActionSection title="Ações do dia" items={actions.day} primary />

      <div className={styles.secondaryGrid}>
        <ActionSection title="Esta semana" items={actions.week} />
        <ActionSection title="Este mês" items={actions.month} />
      </div>
    </div>
  )
}
