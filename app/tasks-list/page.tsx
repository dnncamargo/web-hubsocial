'use client'

import { useEffect, useState } from 'react'
import { collection, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore'
import { db } from '../utils/firebaseConfig'
import { useAuth } from '../components/auth/AuthProvider'
import { useSearchParams } from 'react-router'
import { Task } from '../utils/interfaces'
import { Plus } from 'lucide-react'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import { usePageTitle } from '../hooks/usePageTitle'
import useCivilDate from '../hooks/useCivilDate'
import AddTaskModal from './components/AddTaskModal'
import TaskSection from './components/TaskSection'
import EditTaskModal from './components/EditTaskModal'
import SubtaskModal from './components/SubtaskModal'
import {
  buildTaskFocusReconciliationUpdate,
  hydrateTask,
  isTaskArchived,
} from '../utils/taskPayload'
import { reconcileTaskFocusTree } from '../utils/taskFocus'
import { getEffectiveTaskStatus } from '../utils/taskSubtasks'
import styles from './TasksList.module.css'

export default function TasksList() {
  const { uid } = useAuth()
  const civilDate = useCivilDate()
  usePageTitle('Tarefas')
  const [searchParams, setSearchParams] = useSearchParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false)
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [subtaskEditor, setSubtaskEditor] = useState<{
    parent: Task
    subtask?: Task
  } | null>(null)

  useEffect(() => {
    if (uid) {
      fetchTasks()
    }
  }, [uid, civilDate])

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
      hydrateTask(snapshot.id, snapshot.data(), civilDate),
    )
    const reconciledTasks = reconcileTaskFocusTree(fetchedTasks, civilDate)

    // A reconciliação é pura para que a UI já reflita a virada de dia; o
    // write idempotente de cada documento alterado acontece em segundo plano.
    setTasks(reconciledTasks)
    void Promise.all(
      reconciledTasks.flatMap((task, index) => {
        if (task === fetchedTasks[index]) return []
        const update = buildTaskFocusReconciliationUpdate(fetchedTasks[index], task)
        return update
          ? [updateDoc(doc(db, `users/${uid}/tasks-list`, task.id), update)]
          : []
      }),
    ).catch(error => {
      console.error('Não foi possível persistir a virada de foco das tarefas:', error)
    })
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
    if (parentTaskId) {
      const parent = tasks.find(candidate => candidate.id === parentTaskId)
      if (parent) setSubtaskEditor({ parent, subtask: task })
      return
    }

    setSelectedTask(task)
    setIsEditTaskModalOpen(true)
  }

  const updateTaskLocally = (updatedTask: Task): void => {
    setTasks(previous => previous.map(task =>
      task.id === updatedTask.id ? updatedTask : task))
  }

  const openCreateSubtaskModal = (parent: Task): void => {
    setSubtaskEditor({ parent })
  }

  const sections = [
    { label: 'Não iniciadas', status: 0 as const },
    { label: 'Em foco', status: 1 as const },
    { label: 'Concluídas', status: 2 as const },
  ]
  const effectiveTasks = tasks.map(task => ({
    ...task,
    status: getEffectiveTaskStatus(task, civilDate),
  }))
  const activeTasks = effectiveTasks.filter(task => !isTaskArchived(task))
  const archivedTasks = tasks.filter(task => isTaskArchived(task))

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

        <label className={styles.archiveFilter}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
          />
          Mostrar arquivadas
        </label>

        {tasks.length === 0 ? (
          <p className={styles.emptyState}>Nenhuma tarefa cadastrada.</p>
        ) : (
          <div className={styles.board}>
            {sections.map(({ label, status }) => (
              <TaskSection
                key={status}
                section={label}
                status={status}
                tasks={activeTasks.filter(task => task.status === status)}
                onEditTask={openEditTaskModal}
                onCreateSubtask={openCreateSubtaskModal}
                refreshTasks={fetchTasks}
                updateTaskLocally={updateTaskLocally}
                updateTasksLocally={(updatedTasks) =>
                  handleUpdateSectionTasks(status, updatedTasks)}
              />
            ))}
          </div>
        )}

        {showArchived && archivedTasks.length > 0 && (
          <div className={styles.archivedBoard}>
            <TaskSection
              section="Arquivadas"
              status={0}
              tasks={archivedTasks}
              archived
              onEditTask={openEditTaskModal}
              onCreateSubtask={openCreateSubtaskModal}
              refreshTasks={fetchTasks}
              updateTaskLocally={updateTaskLocally}
              updateTasksLocally={() => undefined}
            />
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
            isOpen={isEditTaskModalOpen}
            onClose={() => setIsEditTaskModalOpen(false)}
            onUpdated={fetchTasks}
          />
        )}

        {subtaskEditor && (
          <SubtaskModal
            parent={subtaskEditor.parent}
            subtask={subtaskEditor.subtask}
            isOpen
            onClose={() => setSubtaskEditor(null)}
            onSaved={fetchTasks}
          />
        )}
      </main>
    </ProtectedRoute>
  )
}
