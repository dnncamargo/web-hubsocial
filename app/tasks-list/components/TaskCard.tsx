'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowUpLeft,
  CircleCheck,
  CirclePlay,
  Flag,
  GripVertical,
  ListPlus,
  MoreHorizontal,
  SquarePen,
  Trash2,
} from 'lucide-react'
import { Task } from '../../utils/interfaces'
import { useAuth } from '../../components/auth/AuthProvider'
import styles from './TaskCard.module.css'

interface TaskCardProps {
  task: Task
  onEditTask: (task: Task, parentTaskId?: string | null) => void
  onPromoteSubtask: (task: Task) => void
  onCreateSubtask: () => void
  onStatusSwitch: (status: 0 | 1 | 2) => void
  onToggleSubtask?: (completed: boolean) => void
  subtaskCompleted?: boolean
  parentTaskId?: string | null
  onDelete: () => void
  refreshTasks: () => void
  archived?: boolean
}

const statusMeta = {
  0: {
    label: 'Não iniciada',
    icon: Flag,
    iconClassName: styles.statusPending,
    rowClassName: styles.rowStatusPending,
  },
  1: {
    label: 'Em foco',
    icon: CirclePlay,
    iconClassName: styles.statusProgress,
    rowClassName: styles.rowStatusProgress,
  },
  2: {
    label: 'Concluída',
    icon: CircleCheck,
    iconClassName: styles.statusDone,
    rowClassName: styles.rowStatusDone,
  },
} as const

export default function TaskCard({
  task,
  onEditTask,
  onPromoteSubtask,
  onCreateSubtask,
  onStatusSwitch,
  onToggleSubtask,
  subtaskCompleted = false,
  parentTaskId,
  onDelete,
  refreshTasks,
  archived = false,
}: TaskCardProps) {
  const { user } = useAuth()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    setActivatorNodeRef,
    isDragging,
  } = useSortable({ id: task.id, disabled: archived })

  const [x, setX] = useState(0)
  const [showActionsOn, setShowActionsOn] = useState<'left' | 'right' | null>(null)

  const isSubtask = Boolean(parentTaskId)
  const isSupertask = !isSubtask && (task.subtasks?.length ?? 0) > 0
  const isCompleted = isSubtask ? subtaskCompleted : task.status === 2
  const visibleStatus = isSubtask ? (isCompleted ? 2 : 0) : task.status
  const currentStatus = statusMeta[visibleStatus]
  const CurrentStatusIcon = currentStatus.icon
  const threshold = 84
  const deleteSwipe = 160

  const handleResetPosition = () => {
    setX(0)
    setShowActionsOn(null)
  }

  const showStatusActions = () => {
    if (isSubtask || archived) return
    setX(threshold)
    setShowActionsOn('left')
  }

  const showTaskActions = () => {
    setX(-threshold)
    setShowActionsOn('right')
  }

  const promoteSubtask = async () => {
    if (!user) return
    await onPromoteSubtask(task)
    refreshTasks()
    handleResetPosition()
  }

  const editTask = () => {
    if (!user) return
    onEditTask(task, parentTaskId)
    handleResetPosition()
  }

  const deleteTask = () => {
    onDelete()
    handleResetPosition()
  }

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const rowClass = [
    styles.row,
    currentStatus.rowClassName,
    isSubtask ? styles.subtaskRow : '',
    archived ? styles.archivedRow : '',
    isDragging ? styles.rowDragging : '',
  ].filter(Boolean).join(' ')

  return (
    <div ref={setNodeRef} style={sortableStyle} className={styles.container}>
      <div className={styles.actionLayer}>
        <div className={styles.actionGroup}>
          {showActionsOn === 'left' && !isSubtask && (
            ([0, 1, 2] as const)
              .filter(status => status !== task.status && (!isSupertask || status !== 1))
              .map(status => {
                const meta = statusMeta[status]
                const StatusIcon = meta.icon

                return (
                  <button
                    key={status}
                    type="button"
                    className={styles.actionButton}
                    onClick={() => {
                      onStatusSwitch(status)
                      handleResetPosition()
                    }}
                    aria-label={`Mover para ${meta.label}`}
                    title={`Mover para ${meta.label}`}
                  >
                    <StatusIcon
                      className={`${styles.actionIcon} ${meta.iconClassName}`}
                      aria-hidden="true"
                    />
                  </button>
                )
              })
          )}
        </div>

        <div className={styles.actionGroup}>
          {showActionsOn === 'right' && (
            <>
              {isSubtask && !archived ? (
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={promoteSubtask}
                  aria-label="Promover subtarefa"
                  title="Promover subtarefa"
                >
                  <ArrowUpLeft className={styles.actionIcon} aria-hidden="true" />
                </button>
              ) : !archived ? (
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => {
                    onCreateSubtask()
                    handleResetPosition()
                  }}
                  aria-label="Criar subtask"
                  title="Criar subtask"
                >
                  <ListPlus className={styles.actionIcon} aria-hidden="true" />
                </button>
              ) : null}

              <button
                type="button"
                className={styles.actionButton}
                onClick={editTask}
                aria-label={isSubtask ? 'Editar subtask' : 'Editar tarefa'}
                title={isSubtask ? 'Editar subtask' : 'Editar tarefa'}
              >
                <SquarePen className={styles.actionIcon} aria-hidden="true" />
              </button>

              <button
                type="button"
                className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                onClick={deleteTask}
                aria-label={isSubtask ? 'Excluir subtask' : 'Excluir tarefa'}
                title={isSubtask ? 'Excluir subtask' : 'Excluir tarefa'}
              >
                <Trash2 className={styles.actionIcon} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>

      <motion.div
        drag="x"
        dragElastic={0.45}
        dragConstraints={{ left: -deleteSwipe, right: deleteSwipe }}
        animate={{ x }}
        onDrag={(_, info) => {
          const limitedX = Math.max(
            -deleteSwipe,
            Math.min(deleteSwipe, info.offset.x),
          )
          setX(limitedX)
        }}
        onDragEnd={(_, info) => {
          if (info.offset.x >= deleteSwipe) {
            deleteTask()
            return
          }

          handleResetPosition()
        }}
        className={rowClass}
        onClick={() => {
          if (showActionsOn !== null) handleResetPosition()
        }}
      >
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...(!archived ? attributes : {})}
          {...(!archived ? listeners : {})}
          className={styles.gripButton}
          aria-label="Reordenar tarefa"
          disabled={archived}
          onClick={(event) => event.stopPropagation()}
        >
          <GripVertical className={styles.gripIcon} aria-hidden="true" />
        </button>

        {isSubtask ? (
          <input
            type="checkbox"
            className={styles.subtaskCheckbox}
            checked={isCompleted}
            disabled={archived}
            onChange={(event) => {
              event.stopPropagation()
              onToggleSubtask?.(event.target.checked)
            }}
            onClick={(event) => event.stopPropagation()}
            aria-label={isCompleted ? 'Subtask concluída' : 'Subtask não feita'}
          />
        ) : (
          archived ? (
            <span
              className={`${styles.statusButton} ${currentStatus.iconClassName}`}
              aria-label={`Status preservado: ${currentStatus.label}`}
              title={`Status preservado: ${currentStatus.label}`}
            >
              <CurrentStatusIcon className={styles.statusIcon} aria-hidden="true" />
            </span>
          ) : (
            <button
              type="button"
              className={`${styles.statusButton} ${currentStatus.iconClassName}`}
              onClick={(event) => {
                event.stopPropagation()
                showStatusActions()
              }}
              aria-label={`Status: ${currentStatus.label}. Alterar status`}
              title={currentStatus.label}
            >
              <CurrentStatusIcon className={styles.statusIcon} aria-hidden="true" />
            </button>
          )
        )}

        <span
          className={isCompleted
            ? `${styles.content} ${styles.contentCompleted}`
            : styles.content}
        >
          {task.content}
          {isSubtask && <span className={styles.subtaskLabel}>Subtask</span>}
          {archived && <span className={styles.archivedLabel}>Arquivada</span>}
        </span>

        <button
          type="button"
          className={styles.moreButton}
          onClick={(event) => {
            event.stopPropagation()
            showTaskActions()
          }}
          aria-label="Ações da tarefa"
          title="Ações"
        >
          <MoreHorizontal className={styles.moreIcon} aria-hidden="true" />
        </button>
      </motion.div>
    </div>
  )
}
