'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { updateDoc, doc, addDoc, deleteDoc, collection } from 'firebase/firestore'
import { db } from '../../utils/firebaseConfig'
import { useAuth } from '../../components/auth/AuthProvider'
import { Task } from '../../utils/interfaces'
import { ActionPlanning } from '../../types/actions'
import { AutomationRuleSet } from '../../types/automation'
import ActionPlanningControl from '../../components/actions/ActionPlanningControl'
import AutomationRulesEditor from '../../components/actions/AutomationRulesEditor'
import { OptionalField } from '../../types/optionalFields'
import { buildEventPayload } from '../../utils/eventPayload'
import CalendarEventCreator from '../../components/ui/CalendarEventCreator'
import useEventDate from '../../hooks/useEventDate'
import styles from './TaskEditor.module.css'

interface EditTaskModalProps {
  task: Task
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
}

export default function EditTaskModal({
  task,
  isOpen,
  onClose,
  onUpdated,
}: EditTaskModalProps) {
  const { uid } = useAuth()
  const [content, setContent] = useState(task.content || '')
  const [addingDate, setAddingDate] = useState(false)
  const [actionPlanning, setActionPlanning] = useState<ActionPlanning>(
    task.actionPlanning ?? {},
  )
  const [automation, setAutomation] = useState<AutomationRuleSet>(
    task.automation ?? { match: 'all', rules: [] },
  )
  const dateControl = useEventDate()
  const { allDay, startDate, endDate, startTime, endTime } = dateControl

  useEffect(() => {
    setContent(task.content)
    setActionPlanning(task.actionPlanning ?? {})
    setAutomation(task.automation ?? { match: 'all', rules: [] })
  }, [task])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  const handleUpdate = async () => {
    if (!content.trim()) {
      alert('Digite algo para a tarefa.')
      return
    }

    if (!uid) return

    if (addingDate) {
      if (!startDate || !endDate) {
        alert('Informe as datas de início e término')
        return
      }

      if (!allDay && (!startTime || !endTime)) {
        alert('Informe os horários de início e término')
        return
      }

      const start = new Date(`${startDate}T${startTime}`)
      const end = new Date(`${endDate}T${endTime}`)

      if (!allDay && start >= end) {
        alert('O horário de término deve ser após o horário de início')
        return
      }

      const optionalFields: OptionalField[] = []

      if (task.subtasks && task.subtasks.length > 0) {
        const confirmed = window.confirm(
          'Esta tarefa possui subtarefas.\n\nDeseja que todas elas se incorporem ao novo evento?',
        )
        if (!confirmed) return

        optionalFields.push({
          id: crypto.randomUUID(),
          type: 'tasks',
          label: 'Lista de Tarefas',
          value: task.subtasks.map(subtask => ({
            id: subtask.id,
            text: subtask.content,
            done: subtask.status !== 0,
          })),
        })
      }

      const newEvent = buildEventPayload({
        title: content.trim(),
        startDate,
        endDate,
        allDay,
        ...(!allDay ? { startTime, endTime } : {}),
        createdAt: new Date(),
        optionalFields,
        actionPlanning,
        automation,
      })

      try {
        await addDoc(collection(db, `users/${uid}/events-history`), newEvent)
        await deleteDoc(doc(db, `users/${uid}/tasks-list/${task.id}`))
        onUpdated()
        onClose()
      } catch (error) {
        console.error('Erro ao criar evento:', error)
      }

      return
    }

    try {
      await updateDoc(doc(db, `users/${uid}/tasks-list/${task.id}`), {
        content: content.trim(),
        actionPlanning,
        automation,
      })
      onUpdated()
      onClose()
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error)
    }
  }

  if (!isOpen || !uid) return null

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
        aria-labelledby="edit-task-title"
      >
        <header className={styles.header}>
          <h2 id="edit-task-title" className={styles.title}>Editar tarefa</h2>
        </header>

        <div className={styles.body}>
          <input
            type="text"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleUpdate()
              }
            }}
            placeholder="Descrição da tarefa"
            className={styles.input}
          />

          <label className={styles.optionRow}>
            <input
              type="checkbox"
              checked={addingDate}
              onChange={() => setAddingDate(!addingDate)}
              className={styles.checkbox}
            />
            Criar evento a partir da tarefa
          </label>

          {addingDate && (
            <div className={styles.datePanel}>
              <CalendarEventCreator {...dateControl} />
            </div>
          )}

          <ActionPlanningControl
            planning={actionPlanning}
            onChange={setActionPlanning}
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
            onClick={onClose}
            className={styles.secondaryButton}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            className={styles.primaryButton}
          >
            Atualizar
          </button>
        </footer>
      </section>
    </motion.div>
  )
}
