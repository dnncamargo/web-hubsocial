'use client'

import { useAuth } from '../../components/auth/AuthProvider'
import { updateDoc, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore'
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
import TaskCard from './TaskCard'
import styles from './TaskSection.module.css'

interface TaskSectionProps {
  section: string
  status: 0 | 1 | 2
  tasks: Task[]
  onEditTask: (task: Task) => void
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

  const handlePromoteSubtask = async (subtask: Task, parentTaskId: string) => {
    if (!uid) return

    const parentRef = doc(db, `users/${uid}/tasks-list`, parentTaskId)
    const parentSnap = await getDoc(parentRef)

    if (!parentSnap.exists()) return

    const parentTask = {
      id: parentSnap.id,
      ...parentSnap.data(),
    } as Task
    const updatedParent: Task = {
      ...parentTask,
      subtasks: (parentTask.subtasks || []).filter(item => item.id !== subtask.id),
    }

    const promotedTask: Task = {
      ...subtask,
      parentTaskId: null,
      subtasks: [],
    }

    await Promise.all([
      setDoc(doc(db, `users/${uid}/tasks-list`, updatedParent.id), updatedParent),
      setDoc(doc(db, `users/${uid}/tasks-list`, promotedTask.id), promotedTask),
    ])
  }

  const handleMakeSubtask = async (currentTask: Task) => {
    if (!uid) return

    const index = tasks.findIndex(task => task.id === currentTask.id)
    if (index <= 0) {
      alert('Não há tarefa acima para agrupar.')
      return
    }

    const aboveTask = tasks[index - 1]
    const taskAsSubtask = {
      ...currentTask,
      parentTaskId: aboveTask.id,
    }
    const updatedAboveTask: Task = {
      ...aboveTask,
      subtasks: [...(aboveTask.subtasks || []), taskAsSubtask],
    }

    await Promise.all([
      setDoc(doc(db, `users/${uid}/tasks-list`, updatedAboveTask.id), updatedAboveTask),
      deleteDoc(doc(db, `users/${uid}/tasks-list`, currentTask.id)),
    ])

    refreshTasks()
  }

  const handleStatusSwitch = async (task: Task, newStatus: 0 | 1 | 2) => {
    if (!uid) return

    const isParent = (task.subtasks?.length ?? 0) > 0
    const isSubtask = Boolean(task.parentTaskId)

    if (!isParent && !isSubtask) {
      await setDoc(
        doc(db, `users/${uid}/tasks-list`, task.id),
        { ...task, status: newStatus },
      )
      refreshTasks()
      return
    }

    if (isParent) {
      const confirmed = window.confirm(
        'Esta tarefa possui subtarefas.\n\nDeseja alterar o status de todas elas para refletir essa mudança?',
      )
      if (!confirmed) return

      const updatedTask: Task = {
        ...task,
        status: newStatus,
        subtasks: (task.subtasks || []).map(subtask => ({
          ...subtask,
          status: newStatus,
        })),
      }

      await setDoc(doc(db, `users/${uid}/tasks-list`, task.id), updatedTask)
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
        const updatedParent: Task = {
          ...parentTask,
          status: newStatus,
          subtasks: (parentTask.subtasks || []).map(subtask => ({
            ...subtask,
            status: newStatus,
          })),
        }

        await setDoc(
          doc(db, `users/${uid}/tasks-list`, updatedParent.id),
          updatedParent,
        )
      } else {
        await handlePromoteSubtask({ ...task, status: newStatus }, parentTask.id)
      }

      refreshTasks()
    }
  }

  const handleDeleteTask = async (task: Task) => {
    if (!uid) return

    const isParent = Boolean(task.subtasks?.length)
    const isSubtask = !isParent
      && tasks.some(item => item.subtasks?.some(subtask => subtask.id === task.id))

    if (isParent && task.subtasks?.length) {
      const confirmed = window.confirm(
        `Esta tarefa possui ${task.subtasks.length} subtarefas. Todas serão excluídas junto com ela.\n\nDeseja continuar?`,
      )
      if (!confirmed) return

      await deleteDoc(doc(db, `users/${uid}/tasks-list`, task.id))
      refreshTasks()
      return
    }

    if (isSubtask) {
      const parent = tasks.find(item =>
        item.subtasks?.some(subtask => subtask.id === task.id),
      )
      if (!parent) return

      const confirmed = window.confirm(
        'Esta tarefa é uma subtarefa. Deseja removê-la do grupo, promovê-la a tarefa principal e então excluí-la?',
      )
      if (!confirmed) return

      await handlePromoteSubtask(task, parent.id)
      await deleteDoc(doc(db, `users/${uid}/tasks-list`, task.id))
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
