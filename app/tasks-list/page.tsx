'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../utils/firebaseConfig'
import { useAuth } from '../components/auth/AuthProvider'
import { useSearchParams } from 'react-router'
import { Task } from '../utils/interfaces'
import { Plus } from 'lucide-react'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import { usePageTitle } from '../hooks/usePageTitle'
import AddTaskModal from './components/AddTaskModal'
import TaskSection from './components/TaskSection'
import EditTaskModal from './components/EditTaskModal'
import { hydrateTask } from '../utils/taskPayload'
import styles from './TasksList.module.css'

export default function TasksList() {
  const { uid } = useAuth()
  usePageTitle('Tarefas')
  const [searchParams, setSearchParams] = useSearchParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false)
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedTaskParentId, setSelectedTaskParentId] = useState<string | null>(null)

  useEffect(() => {
    if (uid) {
      fetchTasks()
    }
  }, [uid])

  useEffect(() => {
    if (searchParams.get('create') !== 'task') return

    setIsAddTaskModalOpen(true)
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('create')
    setSearchParams(nextSearchParams, { replace: true })
  }, [searchParams, setSearchParams])

  const fetchTasks = async () => {
    if (!uid) return

    const tasksQuery = query(
      collection(db, `users/${uid}/tasks-list`),
      orderBy('order'),
    )

    const querySnapshot = await getDocs(tasksQuery)
    const fetchedTasks = querySnapshot.docs.map(snapshot =>
      hydrateTask(snapshot.id, snapshot.data()),
    )

    setTasks(fetchedTasks)
  }

  const handleUpdateSectionTasks = (
    status: 0 | 1 | 2,
    updatedTasks: Task[],
  ) => {
    setTasks(previous => {
      const otherTasks = previous.filter(task => task.status !== status)
      return [...otherTasks, ...updatedTasks]
    })
  }

  const openEditTaskModal = (task: Task, parentTaskId?: string | null): void => {
    setSelectedTask(task)
    setSelectedTaskParentId(parentTaskId ?? null)
    setIsEditTaskModalOpen(true)
  }

  const sections = [
    { label: 'Não iniciadas', status: 0 as const },
    { label: 'Em foco', status: 1 as const },
    { label: 'Concluídas', status: 2 as const },
  ]

  return (
    <ProtectedRoute>
      <main className={styles.page}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <h1 className={styles.title}>Lista de Tarefas</h1>
            <p className={styles.subtitle}>
              Acompanhe o trabalho em fluxo, da entrada à conclusão.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddTaskModalOpen(true)}
            className={styles.primaryButton}
          >
            <Plus className={styles.buttonIcon} aria-hidden="true" />
            Nova tarefa
          </button>
        </header>

        {tasks.length === 0 ? (
          <p className={styles.emptyState}>Nenhuma tarefa cadastrada.</p>
        ) : (
          <div className={styles.board}>
            {sections.map(({ label, status }) => (
              <TaskSection
                key={status}
                section={label}
                status={status}
                tasks={tasks.filter(task => task.status === status)}
                onEditTask={openEditTaskModal}
                refreshTasks={fetchTasks}
                updateTasksLocally={(updatedTasks) =>
                  handleUpdateSectionTasks(status, updatedTasks)}
              />
            ))}
          </div>
        )}

        {isAddTaskModalOpen && (
          <AddTaskModal
            isOpen={isAddTaskModalOpen}
            onClose={() => setIsAddTaskModalOpen(false)}
            onAdded={fetchTasks}
          />
        )}

        {isEditTaskModalOpen && selectedTask && (
          <EditTaskModal
            task={selectedTask}
            parentTaskId={selectedTaskParentId}
            isOpen={isEditTaskModalOpen}
            onClose={() => setIsEditTaskModalOpen(false)}
            onUpdated={fetchTasks}
          />
        )}
      </main>
    </ProtectedRoute>
  )
}
