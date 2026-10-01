'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../utils/firebaseConfig'
import { useAuth } from '../../components/auth/AuthProvider'
import { ActionPlanning } from '../../types/actions'
import { AutomationRuleSet } from '../../types/automation'
import { TaskEventAssociation, TaskNature, TaskSchedule } from '../../types/tasks'
import { buildTaskPayload } from '../../utils/taskPayload'
import ActionPlanningControl from '../../components/actions/ActionPlanningControl'
import AutomationRulesEditor from '../../components/actions/AutomationRulesEditor'
import TaskNatureControl from '../../components/actions/TaskNatureControl'
import TaskScheduleControl from '../../components/actions/TaskScheduleControl'
import {
  changeTaskNature,
  isTaskAuthoringDirty,
  type TaskAuthoringState,
} from '../../utils/taskAuthoring'
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
  const [nature, setNature] = useState<TaskNature>('punctual')
  const [schedule, setSchedule] = useState<TaskSchedule | undefined>()
  const [eventAssociation, setEventAssociation] = useState<TaskEventAssociation | undefined>()
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
        eventAssociation,
      }))

      onAdded()
      setActionPlanning({})
      setNature('punctual')
      setSchedule(undefined)
      setEventAssociation(undefined)
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
    setNature('punctual')
    setSchedule(undefined)
    setEventAssociation(undefined)
    setAutomation({ match: 'all', rules: [] })
    onClose()
  }

  const handleClear = () => {
    setContent('')
    setActionPlanning({})
    setNature('punctual')
    setSchedule(undefined)
    setEventAssociation(undefined)
    setAutomation({ match: 'all', rules: [] })
  }

  const handleNatureChange = (nextNature: TaskNature) => {
    setNature(nextNature)
    setSchedule(changeTaskNature(schedule, nextNature))
  }

  const handleTaskEventChange = (eventId: string | undefined) => {
    setEventAssociation(eventId ? { eventId } : undefined)
    setSchedule(current => current?.type === 'eventRelative' ? undefined : current)
  }

  const currentAuthoring: TaskAuthoringState = {
    content,
    nature,
    actionPlanning,
    schedule,
    eventAssociation,
    automation,
    addingDate: false,
  }
  const isDraftDirty = isTaskAuthoringDirty(currentAuthoring, {
    content: '',
    nature: 'punctual',
    actionPlanning: {},
    schedule: undefined,
    eventAssociation: undefined,
    automation: { match: 'all', rules: [] },
    addingDate: false,
  })

  return (
    <motion.div
      className={styles.overlay}
      onClick={(event) => {
        if (event.target === event.currentTarget) handleCancel()
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          void handleAdd()
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-task-title"
      >
        <div className={styles.content}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarStart}>
              <button type="button" onClick={handleCancel} className={styles.toolbarButton}>
                Cancelar
              </button>
              {isDraftDirty && (
                <button type="button" onClick={handleClear} className={styles.toolbarButton}>
                  Limpar
                </button>
              )}
            </div>
            <h2 id="add-task-title" className={styles.toolbarTitle}>Nova tarefa</h2>
            <div className={styles.toolbarEnd}>
              <button type="submit" disabled={adding} className={styles.toolbarButton}>
                {adding ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </div>

          <TaskNatureControl value={nature} onChange={handleNatureChange} />

          <div className={styles.fieldGroup}>
            <input
              type="text"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="O que precisa ser feito?"
              className={styles.input}
              autoFocus
            />
          </div>

          {nature === 'punctual' && (
            <ActionPlanningControl
              legend="Quando você pretende fazer?"
              description="Escolha uma janela de ação ou deixe sem planejamento."
              planning={actionPlanning}
              onChange={setActionPlanning}
            />
          )}

          <TaskScheduleControl
            nature={nature}
            value={schedule}
            onChange={setSchedule}
          />

          <AutomationRulesEditor
            uid={uid}
            value={automation}
            onChange={setAutomation}
            mode="task"
            onTaskEventChange={handleTaskEventChange}
          />

        </div>
      </form>
    </motion.div>
  )
}
