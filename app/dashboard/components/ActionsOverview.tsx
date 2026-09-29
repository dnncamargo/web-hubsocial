import type { ReactNode } from 'react'
import { ActionProjection, ActionProjectionItem } from '../../types/actions'
import styles from './ActionsOverview.module.css'

interface ActionsOverviewProps {
  actions: ActionProjection
  context: ReactNode
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
  tertiary = false,
}: {
  title: string
  items: ActionProjectionItem[]
  primary?: boolean
  tertiary?: boolean
}) {
  const sectionClassName = primary
    ? styles.primarySection
    : tertiary
      ? styles.tertiarySection
      : styles.secondarySection

  return (
    <section className={sectionClassName}>
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

export default function ActionsOverview({ actions, context }: ActionsOverviewProps) {
  return (
    <div className={styles.container}>
      <ActionSection title="Ações do dia" items={actions.day} primary />

      <div className={styles.planningGrid}>
        <ActionSection title="Esta semana" items={actions.week} />
        <div className={styles.contextSlot}>{context}</div>
      </div>

      <ActionSection title="Este mês" items={actions.month} tertiary />
    </div>
  )
}
