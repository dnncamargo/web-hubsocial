'use client'

import { useAuth } from '../../components/auth/AuthProvider'
import {
  updateDoc,
  doc,
  deleteDoc,
  runTransaction,
} from 'firebase/firestore'
import { db } from '../../utils/firebaseConfig'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Task } from '../../utils/interfaces'
import {
  buildTaskStatusUpdateForTask,
  buildSupertaskStatusUpdate,
  hydrateTask,
  serializeTask,
  serializeTaskSubtask,
} from '../../utils/taskPayload'
import { getCurrentCivilDate } from '../../utils/taskFocus'
import {
  getEffectiveTaskStatus,
  getSupertaskStatusConfirmationMessage,
  isSubtaskCompletedForOccurrence,
  updateSubtaskCompletionForOccurrence,
} from '../../utils/taskSubtasks'
import { getTaskOccurrenceDateForDate } from '../../utils/taskSchedule'
import {
  promoteSubtask,
  removeSubtask,
} from '../../utils/taskHierarchy'
import TaskCard from './TaskCard'
import styles from './TaskSection.module.css'

interface TaskSectionProps {
  section: string
  status: 0 | 1 | 2
  tasks: Task[]
  onEditTask: (task: Task, parentTaskId?: string | null) => void
  onCreateSubtask: (parent: Task) => void
  refreshTasks: () => void
  updateTaskLocally: (task: Task) => void
  updateTasksLocally: (tasks: Task[]) => void
}

export default function TaskSection({
  section,
  status,
  tasks,
  onEditTask,
  onCreateSubtask,
  refreshTasks,
  updateTaskLocally,
  updateTasksLocally,
}: TaskSectionProps) {
  const { uid } = useAuth()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
  )

  const handlePromoteSubtask = async (subtask: Task, parentTaskId: string): Promise<boolean> => {
    if (!uid) return false

    const targetDate = getCurrentCivilDate()
    const parentRef = doc(db, `users/${uid}/tasks-list`, parentTaskId)
    const promotedRef = doc(db, `users/${uid}/tasks-list`, subtask.id)
    let promoted = false

    try {
      await runTransaction(db, async transaction => {
        const [parentSnap, promotedSnap] = await Promise.all([
          transaction.get(parentRef),
          transaction.get(promotedRef),
        ])

        if (!parentSnap.exists()) return
        if (promotedSnap.exists()) {
          throw new Error('Não foi possível promover: já existe uma Task com esse ID.')
        }

        const parentTask = hydrateTask(parentSnap.id, parentSnap.data(), targetDate)
        const currentSubtask = parentTask.subtasks?.find(item => item.id === subtask.id)
        if (!currentSubtask) throw new Error('A subtarefa não foi encontrada na tarefa pai.')

        const promotedStatus = isSubtaskCompletedForOccurrence(
          parentTask,
          currentSubtask,
          targetDate,
        ) ? 2 : 0
        const parentStatusBeforePromotion = getEffectiveTaskStatus(parentTask, targetDate)
        const result = promoteSubtask(parentTask, subtask.id, promotedStatus)
        if (!result.ok) throw new Error(result.reason)

        const remainingSubtasks = result.value.parent.subtasks ?? []
        const parentStatus = remainingSubtasks.length > 0
          ? getEffectiveTaskStatus(result.value.parent, targetDate)
          : parentStatusBeforePromotion
        const parentUpdate = {
          ...buildTaskStatusUpdateForTask(
            { ...result.value.parent, status: parentStatus },
            parentStatus,
            targetDate,
          ),
          subtasks: remainingSubtasks.map(serializeTaskSubtask),
        }

        transaction.update(parentRef, parentUpdate)
        const promotedTask: Task = { ...result.value.promoted, status: promotedStatus }
        const promotedWire = serializeTask(promotedTask, targetDate)
        if (promotedStatus === 2 && promotedTask.nature === 'recurring') {
          promotedWire.lastActionCompletedDate =
            getTaskOccurrenceDateForDate(promotedTask, targetDate) ?? targetDate
          delete promotedWire.lastFocusedOccurrenceDate
        }
        transaction.set(
          promotedRef,
          promotedWire,
        )
        promoted = true
      })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível promover a subtask.')
    }

    return promoted
  }

  const handleStatusSwitch = async (task: Task, newStatus: 0 | 1 | 2) => {
    if (!uid) return
    const currentCivilDate = getCurrentCivilDate()
    const hasSubtasks = (task.subtasks?.length ?? 0) > 0

    if (hasSubtasks) {
      if (newStatus === 1) return

      const confirmed = window.confirm(
        getSupertaskStatusConfirmationMessage(newStatus, task.subtasks?.length ?? 0),
      )
      if (!confirmed) return

      const update = buildSupertaskStatusUpdate(task, newStatus, currentCivilDate)
      if (update) {
        await updateDoc(doc(db, `users/${uid}/tasks-list`, task.id), update)
      }
    } else {
      await updateDoc(
        doc(db, `users/${uid}/tasks-list`, task.id),
        buildTaskStatusUpdateForTask(task, newStatus, currentCivilDate),
      )
    }

    refreshTasks()
  }

  const handleToggleSubtask = async (
    parent: Task,
    subtask: Task,
    completed: boolean,
  ) => {
    if (!uid) return

    const targetDate = getCurrentCivilDate()
    const parentRef = doc(db, `users/${uid}/tasks-list`, parent.id)
    let optimisticParent: Task | null = null

    try {
      await runTransaction(db, async transaction => {
        const parentSnapshot = await transaction.get(parentRef)
        if (!parentSnapshot.exists()) return

        const currentParent = hydrateTask(parentSnapshot.id, parentSnapshot.data(), targetDate)
        const updatedParent = updateSubtaskCompletionForOccurrence(
          currentParent,
          subtask.id,
          completed,
          targetDate,
        )
        if (!updatedParent) return

        const aggregateStatus = getEffectiveTaskStatus(updatedParent, targetDate)
        optimisticParent = { ...updatedParent, status: aggregateStatus }
        transaction.update(parentRef, {
          ...buildTaskStatusUpdateForTask(
            { ...updatedParent, status: aggregateStatus },
            aggregateStatus,
            targetDate,
          ),
          subtasks: (updatedParent.subtasks ?? []).map(serializeTaskSubtask),
        })
      })
      if (optimisticParent) updateTaskLocally(optimisticParent)
      refreshTasks()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível atualizar a subtask.')
    }
  }

  const handleDeleteTask = async (task: Task) => {
    if (!uid) return

    const parent = tasks.find(item =>
      item.subtasks?.some(subtask => subtask.id === task.id),
    )
    const isSubtask = Boolean(parent)
    const hasSubtasks = (task.subtasks?.length ?? 0) > 0

    if (isSubtask && parent) {
      const confirmed = window.confirm('Deseja excluir esta subtarefa?')
      if (!confirmed) return

      const targetDate = getCurrentCivilDate()
      const parentRef = doc(db, `users/${uid}/tasks-list`, parent.id)
      await runTransaction(db, async transaction => {
        const parentSnapshot = await transaction.get(parentRef)
        if (!parentSnapshot.exists()) return

        const currentParent = hydrateTask(parentSnapshot.id, parentSnapshot.data(), targetDate)
        const statusBeforeRemoval = getEffectiveTaskStatus(currentParent, targetDate)
        const result = removeSubtask(currentParent, task.id)
        if (!result.ok) return

        const remainingSubtasks = result.value.parent.subtasks ?? []
        const nextStatus = remainingSubtasks.length > 0
          ? getEffectiveTaskStatus(result.value.parent, targetDate)
          : statusBeforeRemoval
        transaction.update(parentRef, {
          ...buildTaskStatusUpdateForTask(
            { ...result.value.parent, status: nextStatus },
            nextStatus,
            targetDate,
          ),
          subtasks: remainingSubtasks.map(serializeTaskSubtask),
        })
      })
      refreshTasks()
      return
    }

    if (hasSubtasks) {
      const confirmed = window.confirm(
        `Esta tarefa possui ${task.subtasks?.length ?? 0} subtarefas.\n\nAo excluir a tarefa, todas as subtarefas também serão excluídas.`,
      )
      if (!confirmed) return
    } else if (!window.confirm('Deseja excluir esta tarefa?')) {
      return
    }

    await deleteDoc(doc(db, `users/${uid}/tasks-list`, task.id))
    refreshTasks()
  }

  const handleDragEnd = async (event: {
    active: { id: string | number }
    over: { id: string | number } | null
  }) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tasks.findIndex(task => task.id === active.id)
    const newIndex = tasks.findIndex(task => task.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const reorderedTasks = arrayMove(tasks, oldIndex, newIndex)
    updateTasksLocally(reorderedTasks)

    try {
      await Promise.all(
        reorderedTasks.map((task, index) =>
          updateDoc(
            doc(db, `users/${uid}/tasks-list`, task.id),
            { order: index },
          ),
        ),
      )
    } catch (error) {
      console.error('Erro ao atualizar ordem:', error)
    }
  }

  if (!uid) return null

  const sectionClass = status === 0
    ? `${styles.section} ${styles.notStarted}`
    : status === 1
      ? `${styles.section} ${styles.inProgress}`
      : `${styles.section} ${styles.completed}`

  return (
    <section className={sectionClass}>
      <header className={styles.header}>
        <h2 className={styles.title}>{section}</h2>
        <span className={styles.count}>{tasks.length}</span>
      </header>

      {tasks.length === 0 ? (
        <p className={styles.empty}>Nenhuma tarefa nesta etapa.</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragStart={() => {
            document.body.style.overflow = 'hidden'
          }}
          onDragCancel={() => {
            document.body.style.overflow = ''
          }}
          onDragEnd={(event) => {
            document.body.style.overflow = ''
            handleDragEnd(event)
          }}
        >
          <SortableContext
            items={tasks.map(task => task.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className={styles.list}>
              {tasks.map(task => (
                <li key={task.id} className={styles.taskGroup}>
                  <TaskCard
                    task={task}
                    onEditTask={onEditTask}
                    onPromoteSubtask={() => undefined}
                    onCreateSubtask={() => onCreateSubtask(task)}
                    onStatusSwitch={(newStatus) =>
                      void handleStatusSwitch(task, newStatus)}
                    parentTaskId={null}
                    onDelete={() => void handleDeleteTask(task)}
                    refreshTasks={refreshTasks}
                  />

                  {task.subtasks && task.subtasks.length > 0 && (
                    <div className={styles.subtasks}>
                      {task.subtasks.map(subtask => (
                        <TaskCard
                          key={subtask.id}
                          task={subtask}
                          onEditTask={onEditTask}
                          onPromoteSubtask={() =>
                            void handlePromoteSubtask(subtask, task.id)}
                          onCreateSubtask={() => undefined}
                          onStatusSwitch={() => undefined}
                          onToggleSubtask={(completed) =>
                            void handleToggleSubtask(task, subtask, completed)}
                          subtaskCompleted={isSubtaskCompletedForOccurrence(
                            task,
                            subtask,
                            getCurrentCivilDate(),
                          )}
                          parentTaskId={task.id}
                          onDelete={() => void handleDeleteTask(subtask)}
                          refreshTasks={refreshTasks}
                        />
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  )
}
