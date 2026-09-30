import type { ReactNode } from 'react'
import { CalendarDays, ListChecks } from 'lucide-react'
import { ActionProjection, ActionProjectionItem } from '../../types/actions'
import { getEntityColor, type EntityColorMap } from '../../utils/entityColors'
import styles from './ActionsOverview.module.css'

interface ActionsOverviewProps {
  actions: ActionProjection
  context: ReactNode
  onCompleteAction: (item: ActionProjectionItem) => Promise<void>
  pendingActionKeys: ReadonlySet<string>
  categoryColors?: EntityColorMap
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

function ActionRow({
  item,
  interactive,
  onCompleteAction,
  isPending,
  categoryColors,
}: {
  item: ActionProjectionItem
  interactive: boolean
  onCompleteAction?: (item: ActionProjectionItem) => Promise<void>
  isPending: boolean
  categoryColors?: EntityColorMap
}) {
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
  const markerLabel = item.completedToday
    ? `Desmarcar conclusão de hoje de ${item.title}`
    : item.completed
      ? `${item.title} concluído`
      : item.sourceType === 'task'
        ? `Marcar ${item.title} como concluída hoje`
        : `Marcar ${item.title} como concluído hoje`
  const marker = interactive && onCompleteAction ? (
    <button
      type="button"
      className={`${styles.markerButton} ${markerClassName}`}
      aria-label={markerLabel}
      aria-pressed={item.completedToday ?? false}
      aria-busy={isPending}
      disabled={isPending || (item.completed && !item.completedToday)}
      onClick={() => void onCompleteAction(item)}
    />
  ) : (
    <span className={markerClassName} aria-hidden="true" />
  )

  return (
    <li className={rowClassName}>
      {marker}
      <div className={styles.rowContent}>
        <span className={item.completed ? styles.completedTitle : styles.title}>
          {item.title}
        </span>
        <span className={styles.meta}>
          <SourceIcon className={styles.sourceIcon} aria-hidden="true" />
          {item.sourceType === 'event' ? 'Evento' : 'Tarefa'}
          {item.date ? ` · ${item.date}` : ''}
          {item.time ? ` · ${item.time}` : ''}
          {item.sourceType === 'event' && item.categories && item.categories.length > 0 && (
            <span className={styles.categoryMarkers} aria-label="Categorias do evento">
              {item.categories.map(category => {
                const color = getEntityColor(categoryColors, category)
                return (
                  <span
                    key={category}
                    className={styles.categoryMarker}
                    title={category}
                    style={color ? { '--entity-color': color } as React.CSSProperties : undefined}
                  />
                )
              })}
            </span>
          )}
        </span>
        {item.completedToday && (
          <span className={styles.completedTodayLabel}>Concluída hoje</span>
        )}
        {item.inProgress && !item.completed && !item.completedToday && (
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
  interactive = false,
  onCompleteAction,
  pendingActionKeys,
  categoryColors,
}: {
  title: string
  items: ActionProjectionItem[]
  primary?: boolean
  tertiary?: boolean
  interactive?: boolean
  onCompleteAction?: (item: ActionProjectionItem) => Promise<void>
  pendingActionKeys: ReadonlySet<string>
  categoryColors?: EntityColorMap
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
            <ActionRow
              item={item}
              key={item.key}
              interactive={interactive}
              onCompleteAction={onCompleteAction}
              isPending={pendingActionKeys.has(item.key)}
              categoryColors={categoryColors}
            />
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>Nenhuma ação marcada para este período.</p>
      )}
    </section>
  )
}

export default function ActionsOverview({
  actions,
  context,
  onCompleteAction,
  pendingActionKeys,
  categoryColors,
}: ActionsOverviewProps) {
  return (
    <div className={styles.container}>
      <ActionSection
        title="Ações do dia"
        items={actions.day}
        primary
        interactive
        onCompleteAction={onCompleteAction}
        pendingActionKeys={pendingActionKeys}
        categoryColors={categoryColors}
      />

      <div className={styles.planningGrid}>
        <div className={styles.planningColumn}>
          <ActionSection
            title="Esta semana"
            items={actions.week}
            pendingActionKeys={pendingActionKeys}
            categoryColors={categoryColors}
          />
          <ActionSection
            title="Este mês"
            items={actions.month}
            tertiary
            pendingActionKeys={pendingActionKeys}
            categoryColors={categoryColors}
          />
        </div>
        <div className={styles.contextSlot}>{context}</div>
      </div>
    </div>
  )
}
