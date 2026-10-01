'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../utils/firebaseConfig'
import { useAuth } from '../../components/auth/AuthProvider'
import { ActionPlanning } from '../../types/actions'
import { AutomationRuleSet } from '../../types/automation'
import { TaskSchedule } from '../../types/tasks'
import { buildTaskPayload } from '../../utils/taskPayload'
import ActionPlanningControl from '../../components/actions/ActionPlanningControl'
import AutomationRulesEditor from '../../components/actions/AutomationRulesEditor'
import TaskScheduleControl from '../../components/actions/TaskScheduleControl'
import styles from './TaskEditor.module.css'

interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onAdded: () => void
}

export default function AddTaskModal({
  isOpen,
  onClose,
  onAdded,
}: AddTaskModalProps) {
  const { uid } = useAuth()
  const [content, setContent] = useState('')
  const [adding, setAdding] = useState(false)
  const [actionPlanning, setActionPlanning] = useState<ActionPlanning>({})
  const [schedule, setSchedule] = useState<TaskSchedule | undefined>()
  const [automation, setAutomation] = useState<AutomationRuleSet>({
    match: 'all',
    rules: [],
  })

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  if (!isOpen || !uid) return null

  const handleAdd = async () => {
    if (!content.trim()) {
      alert('Digite algo para a tarefa.')
      return
    }

    setAdding(true)

    try {
      const tasksQuery = query(
        collection(db, `users/${uid}/tasks-list`),
        where('status', '==', 0),
      )
      const snapshot = await getDocs(tasksQuery)

      await addDoc(collection(db, `users/${uid}/tasks-list`), buildTaskPayload({
        content: content.trim(),
        status: 0,
        order: snapshot.size,
        createdAt: new Date(),
        actionPlanning,
        automation,
        schedule,
      }))

      onAdded()
      setActionPlanning({})
      setSchedule(undefined)
      setAutomation({ match: 'all', rules: [] })
      onClose()
    } catch (error) {
      console.error('Erro ao adicionar tarefa:', error)
    } finally {
      setContent('')
      setAdding(false)
    }
  }

  const handleCancel = () => {
    setContent('')
    setActionPlanning({})
    setSchedule(undefined)
    setAutomation({ match: 'all', rules: [] })
    onClose()
  }

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-task-title"
      >
        <header className={styles.header}>
          <h2 id="add-task-title" className={styles.title}>Nova tarefa</h2>
        </header>

        <div className={styles.body}>
          <input
            type="text"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleAdd()
              }
            }}
            placeholder="Descrição da tarefa"
            className={styles.input}
            autoFocus
          />

          <ActionPlanningControl
            planning={actionPlanning}
            onChange={setActionPlanning}
          />

          <TaskScheduleControl
            uid={uid}
            value={schedule}
            onChange={setSchedule}
          />

          <AutomationRulesEditor
            uid={uid}
            value={automation}
            onChange={setAutomation}
          />
        </div>

        <footer className={styles.footer}>
          <button
            type="button"
            onClick={handleCancel}
            className={styles.secondaryButton}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className={styles.primaryButton}
          >
            {adding ? 'Adicionando...' : 'Adicionar'}
          </button>
        </footer>
      </section>
    </motion.div>
  )
}
