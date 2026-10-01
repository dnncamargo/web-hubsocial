'use client'

import { useAuth } from '../../components/auth/AuthProvider'
import {
  updateDoc,
  doc,
  setDoc,
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
  buildTaskDailyCompletionUpdate,
  buildTaskStatusUpdate,
  hydrateTask,
  serializeTask,
} from '../../utils/taskPayload'
import {
  applyTaskStatusTransition,
  getCurrentCivilDate,
} from '../../utils/taskFocus'
import {
  attachSubtask,
  promoteSubtask,
  removeSubtask,
  updateAllSubtasks,
} from '../../utils/taskHierarchy'
import TaskCard from './TaskCard'
import styles from './TaskSection.module.css'

interface TaskSectionProps {
  section: string
  status: 0 | 1 | 2
  tasks: Task[]
  onEditTask: (task: Task, parentTaskId?: string | null) => void
  refreshTasks: () => void
  updateTasksLocally: (tasks: Task[]) => void
}

export default function TaskSection({
  section,
  status,
  tasks,
  onEditTask,
  refreshTasks,
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

  const resetDailyCompletion = (
    task: Task,
    newStatus: 0 | 1 | 2,
    currentCivilDate: string,
  ): Task => {
    const updatedTask = applyTaskStatusTransition(task, newStatus, currentCivilDate)
    delete updatedTask.lastActionCompletedDate
    return updatedTask
  }

  const handlePromoteSubtask = async (subtask: Task, parentTaskId: string): Promise<boolean> => {
    if (!uid) return false

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

        const parentTask = hydrateTask(parentSnap.id, parentSnap.data())
        const result = promoteSubtask(parentTask, subtask.id)
        if (!result.ok) throw new Error(result.reason)

        transaction.set(parentRef, serializeTask(result.value.parent))
        transaction.set(promotedRef, serializeTask(result.value.promoted))
        promoted = true
      })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível promover a subtask.')
    }

    return promoted
  }

  const handleMakeSubtask = async (currentTask: Task) => {
    if (!uid) return

    const index = tasks.findIndex(task => task.id === currentTask.id)
    if (index <= 0) {
      alert('Não há tarefa acima para agrupar.')
      return
    }

    const aboveTask = tasks[index - 1]
    const parentRef = doc(db, `users/${uid}/tasks-list`, aboveTask.id)
    const currentRef = doc(db, `users/${uid}/tasks-list`, currentTask.id)

    try {
      await runTransaction(db, async transaction => {
        const [parentSnap, currentSnap] = await Promise.all([
          transaction.get(parentRef),
          transaction.get(currentRef),
        ])
        if (!parentSnap.exists() || !currentSnap.exists()) return

        const parentTask = hydrateTask(parentSnap.id, parentSnap.data())
        const childTask = hydrateTask(currentSnap.id, currentSnap.data())
        const result = attachSubtask(parentTask, childTask)
        if (!result.ok) throw new Error(result.reason)

        transaction.set(parentRef, serializeTask(result.value))
        transaction.delete(currentRef)
      })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível anexar a subtask.')
    }

    refreshTasks()
  }

  const handleStatusSwitch = async (task: Task, newStatus: 0 | 1 | 2) => {
    if (!uid) return
    const currentCivilDate = getCurrentCivilDate()

    const isParent = (task.subtasks?.length ?? 0) > 0
    const isSubtask = Boolean(task.parentTaskId)

    if (!isParent && !isSubtask) {
      await setDoc(
        doc(db, `users/${uid}/tasks-list`, task.id),
        serializeTask(resetDailyCompletion(task, newStatus, currentCivilDate)),
      )
      refreshTasks()
      return
    }

    if (isParent) {
      const confirmed = window.confirm(
        'Esta tarefa possui subtarefas.\n\nDeseja alterar o status de todas elas para refletir essa mudança?',
      )
      if (!confirmed) return

      const updatedTask = updateAllSubtasks(
        resetDailyCompletion(task, newStatus, currentCivilDate),
        subtask => resetDailyCompletion(subtask, newStatus, currentCivilDate),
      )

      await setDoc(doc(db, `users/${uid}/tasks-list`, task.id), serializeTask(updatedTask))
      refreshTasks()
      return
    }

    if (isSubtask) {
      const parentTask = tasks.find(item => item.id === task.parentTaskId)
      if (!parentTask) return

      const updateParent = window.confirm(
        'Esta é uma subtarefa.\n\n'
        + 'OK: aplicar o novo status à tarefa pai e todas as subtarefas.\n'
        + 'Cancelar: transformar esta subtarefa em tarefa independente e alterar apenas o status dela.',
      )

      if (updateParent) {
        const updatedParent = updateAllSubtasks(
          resetDailyCompletion(parentTask, newStatus, currentCivilDate),
          subtask => resetDailyCompletion(subtask, newStatus, currentCivilDate),
        )

        await setDoc(
          doc(db, `users/${uid}/tasks-list`, updatedParent.id),
          serializeTask(updatedParent),
        )
      } else {
        if (await handlePromoteSubtask(task, parentTask.id)) {
          const promotedTask = resetDailyCompletion(task, newStatus, currentCivilDate)
          await updateDoc(
            doc(db, `users/${uid}/tasks-list`, task.id),
            {
              ...buildTaskStatusUpdate(promotedTask.status, promotedTask.focusedOnDate),
              ...buildTaskDailyCompletionUpdate(null),
            },
          )
        }
      }

      refreshTasks()
    }
  }

  const handleDeleteTask = async (task: Task) => {
    if (!uid) return

    const parent = tasks.find(item =>
      item.subtasks?.some(subtask => subtask.id === task.id),
    )
    const isSubtask = Boolean(parent)
    const isParent = !isSubtask && Boolean(task.subtasks?.length)

    if (isSubtask && task.subtasks?.length) {
      alert('Esta subtask possui descendants legados e não pode ser excluída sem revisão.')
      return
    }

    if (isParent && task.subtasks?.length) {
      const confirmed = window.confirm(
        `Esta tarefa possui ${task.subtasks.length} subtarefas. Todas serão excluídas junto com ela.\n\nDeseja continuar?`,
      )
      if (!confirmed) return

      await deleteDoc(doc(db, `users/${uid}/tasks-list`, task.id))
      refreshTasks()
      return
    }

    if (isSubtask && parent) {

      const confirmed = window.confirm(
        'Esta tarefa é uma subtarefa. Deseja removê-la do grupo e excluí-la?',
      )
      if (!confirmed) return

      const parentRef = doc(db, `users/${uid}/tasks-list`, parent.id)
      await runTransaction(db, async transaction => {
        const parentSnapshot = await transaction.get(parentRef)
        if (!parentSnapshot.exists()) return

        const currentParent = hydrateTask(parentSnapshot.id, parentSnapshot.data())
        const result = removeSubtask(currentParent, task.id)
        if (!result.ok) return

        transaction.set(parentRef, serializeTask(result.value.parent))
      })
      refreshTasks()
      return
    }

    const confirmed = window.confirm('Deseja excluir esta tarefa?')
    if (!confirmed) return

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
                    onPromoteSubtask={() => handlePromoteSubtask(task, task.id)}
                    onMakeSubtask={handleMakeSubtask}
                    onStatusSwitch={(newStatus) =>
                      handleStatusSwitch(task, newStatus)}
                    parentTaskId={null}
                    onDelete={() => handleDeleteTask(task)}
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
                            handlePromoteSubtask(subtask, task.id)}
                          onMakeSubtask={handleMakeSubtask}
                          onStatusSwitch={(newStatus) =>
                            handleStatusSwitch(subtask, newStatus)}
                          parentTaskId={task.id}
                          onDelete={() => handleDeleteTask(subtask)}
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
