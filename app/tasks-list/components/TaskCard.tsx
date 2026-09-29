'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowDownRight,
  ArrowUpLeft,
  CircleCheck,
  CirclePlay,
  Flag,
  GripVertical,
  MoreHorizontal,
  SquarePen,
  Trash2,
} from 'lucide-react'
import { Task } from '../../utils/interfaces'
import { useAuth } from '../../components/auth/AuthProvider'
import styles from './TaskCard.module.css'

interface TaskCardProps {
  task: Task
  onEditTask: (task: Task) => void
  onPromoteSubtask: (task: Task) => void
  onMakeSubtask: (task: Task) => void
  onStatusSwitch: (status: 0 | 1 | 2) => void
  parentTaskId?: string | null
  onDelete: () => void
  refreshTasks: () => void
}

const statusMeta = {
  0: {
    label: 'Não iniciada',
    icon: Flag,
    iconClassName: styles.statusPending,
    rowClassName: styles.rowStatusPending,
  },
  1: {
    label: 'Em andamento',
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
  onMakeSubtask,
  onStatusSwitch,
  parentTaskId,
  onDelete,
  refreshTasks,
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
  } = useSortable({ id: task.id })

  const [x, setX] = useState(0)
  const [showActionsOn, setShowActionsOn] = useState<'left' | 'right' | null>(null)

  const threshold = 84
  const deleteSwipe = 160

  const handleResetPosition = () => {
    setX(0)
    setShowActionsOn(null)
  }

  const showStatusActions = () => {
    setX(threshold)
    setShowActionsOn('left')
  }

  const showTaskActions = () => {
    setX(-threshold)
    setShowActionsOn('right')
  }

  const makeSubtask = async () => {
    await onMakeSubtask(task)
    handleResetPosition()
  }

  const promoteSubtask = async () => {
    if (!user) return
    await onPromoteSubtask(task)
    refreshTasks()
    handleResetPosition()
  }

  const editTask = () => {
    if (!user) return
    onEditTask(task)
    handleResetPosition()
  }

  const statusSwitch = (status: 0 | 1 | 2) => {
    onStatusSwitch(status)
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

  const currentStatus = statusMeta[task.status]
  const CurrentStatusIcon = currentStatus.icon
  const rowClass = [
    styles.row,
    currentStatus.rowClassName,
    parentTaskId ? styles.subtaskRow : '',
    isDragging ? styles.rowDragging : '',
  ].filter(Boolean).join(' ')

  return (
    <div ref={setNodeRef} style={sortableStyle} className={styles.container}>
      <div className={styles.actionLayer}>
        <div className={styles.actionGroup}>
          {showActionsOn === 'left' && (
            ([0, 1, 2] as const)
              .filter(status => status !== task.status)
              .map(status => {
                const meta = statusMeta[status]
                const StatusIcon = meta.icon

                return (
                  <button
                    key={status}
                    type="button"
                    className={styles.actionButton}
                    onClick={() => statusSwitch(status)}
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
              {parentTaskId ? (
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={promoteSubtask}
                  aria-label="Promover subtarefa"
                  title="Promover subtarefa"
                >
                  <ArrowUpLeft className={styles.actionIcon} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => {
                    if (task.subtasks && task.subtasks.length > 0) {
                      alert(
                        'Essa tarefa já possui subtarefas e não pode ser transformada em subtarefa.',
                      )
                      handleResetPosition()
                      return
                    }

                    makeSubtask()
                  }}
                  aria-label="Transformar em subtarefa da tarefa anterior"
                  title="Transformar em subtarefa"
                >
                  <ArrowDownRight className={styles.actionIcon} aria-hidden="true" />
                </button>
              )}

              <button
                type="button"
                className={styles.actionButton}
                onClick={editTask}
                aria-label="Editar tarefa"
                title="Editar tarefa"
              >
                <SquarePen className={styles.actionIcon} aria-hidden="true" />
              </button>

              <button
                type="button"
                className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                onClick={deleteTask}
                aria-label="Excluir tarefa"
                title="Excluir tarefa"
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
          if (showActionsOn !== null) {
            handleResetPosition()
          }
        }}
      >
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          className={styles.gripButton}
          aria-label="Reordenar tarefa"
          onClick={(event) => event.stopPropagation()}
        >
          <GripVertical className={styles.gripIcon} aria-hidden="true" />
        </button>

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

        <span
          className={task.status === 2
            ? `${styles.content} ${styles.contentCompleted}`
            : styles.content}
        >
          {task.content}
          {parentTaskId && <span className={styles.subtaskLabel}>Subtarefa</span>}
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
