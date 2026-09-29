import type { ReactNode } from 'react'
import { CalendarDays, ListChecks } from 'lucide-react'
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

type AttentionState = 'completed' | 'inProgress' | 'highlighted' | 'normal'

function getAttentionState(item: ActionProjectionItem): AttentionState {
  if (item.completed) return 'completed'
  if (item.sourceType === 'task' && item.inProgress) return 'inProgress'
  if (item.automation.highlighted) return 'highlighted'
  return 'normal'
}

function ActionRow({ item }: { item: ActionProjectionItem }) {
  const automationStatus = getAutomationStatus(item)
  const SourceIcon = item.sourceType === 'event' ? CalendarDays : ListChecks
  const attentionState = getAttentionState(item)
  const markerClassName = item.completed
    ? styles.completedMarker
    : item.sourceType === 'task' && item.inProgress
      ? styles.inProgressMarker
      : styles.pendingMarker
  const rowClassName = [
    styles.row,
    attentionState === 'highlighted' ? styles.highlightedRow : '',
    attentionState === 'inProgress' ? styles.inProgressRow : '',
  ].filter(Boolean).join(' ')

  return (
    <li className={rowClassName}>
      <span
        className={markerClassName}
        aria-hidden="true"
      />
      <div className={styles.rowContent}>
        <span className={item.completed ? styles.completedTitle : styles.title}>
          {item.title}
        </span>
        <span className={styles.meta}>
          <SourceIcon className={styles.sourceIcon} aria-hidden="true" />
          {item.sourceType === 'event' ? 'Evento' : 'Tarefa'}
          {item.date ? ` · ${item.date}` : ''}
          {item.time ? ` · ${item.time}` : ''}
        </span>
        {item.inProgress && (
          <span className={styles.inProgressLabel}>Em andamento</span>
        )}
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
  const Heading = primary ? 'h1' : 'h2'

  return (
    <section className={sectionClassName}>
      <div className={styles.sectionHeader}>
        <Heading className={styles.sectionTitle}>{title}</Heading>
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
        <div className={styles.planningColumn}>
          <ActionSection title="Esta semana" items={actions.week} />
          <ActionSection title="Este mês" items={actions.month} tertiary />
        </div>
        <div className={styles.contextSlot}>{context}</div>
      </div>
    </div>
  )
}
