'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  collection,
  doc,
  runTransaction,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../../utils/firebaseConfig'
import { useAuth } from '../../components/auth/AuthProvider'
import { Task } from '../../utils/interfaces'
import { ActionPlanning } from '../../types/actions'
import { AutomationRuleSet } from '../../types/automation'
import { TaskSchedule } from '../../types/tasks'
import {
  buildTaskUpdate,
  hydrateTask,
  serializeTaskSubtask,
} from '../../utils/taskPayload'
import ActionPlanningControl from '../../components/actions/ActionPlanningControl'
import AutomationRulesEditor from '../../components/actions/AutomationRulesEditor'
import TaskScheduleControl from '../../components/actions/TaskScheduleControl'
import { OptionalField } from '../../types/optionalFields'
import { buildEventPayload } from '../../utils/eventPayload'
import CalendarEventCreator from '../../components/ui/CalendarEventCreator'
import useEventDate from '../../hooks/useEventDate'
import { useAssociatePerson } from '../../hooks/useAssociatePerson'
import { AssociatePersonModal } from '../../events-history/components/AssociatePersonModal'
import { AssociatePersonRenderer } from '../../events-history/components/AssociatePersonRenderer'
import styles from './TaskEditor.module.css'

interface EditTaskModalProps {
  task: Task
  parentTaskId?: string | null
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
}

function buildTaskOptionalFields(task: Task): OptionalField[] {
  if (!task.subtasks || task.subtasks.length === 0) return []

  return [{
    id: crypto.randomUUID(),
    type: 'tasks',
    label: 'Lista de Tarefas',
    value: task.subtasks.map(subtask => ({
      id: subtask.id,
      text: subtask.content,
      done: subtask.status !== 0,
    })),
  }]
}

export default function EditTaskModal({
  task,
  parentTaskId = null,
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
  const [schedule, setSchedule] = useState<TaskSchedule | undefined>(task.schedule)
  const [automation, setAutomation] = useState<AutomationRuleSet>(
    task.automation ?? { match: 'all', rules: [] },
  )
  const [showAssociatePersonModal, setShowAssociatePersonModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const dateControl = useEventDate()
  const {
    allDay,
    startDate,
    endDate,
    startTime,
    endTime,
    timeZone,
  } = dateControl
  const associatePersonControl = useAssociatePerson({ uid: uid ?? '' })
  const {
    people,
    fetchPeople,
    associatedPersonIds,
    associatePerson,
    disassociatePerson,
    error: associatePersonError,
    resetAssociatedPeople,
  } = associatePersonControl

  useEffect(() => {
    setContent(task.content)
    setActionPlanning(task.actionPlanning ?? {})
    setSchedule(task.schedule)
    setAutomation(task.automation ?? { match: 'all', rules: [] })
    setAddingDate(false)
    setSaveError('')
    setShowAssociatePersonModal(false)
    resetAssociatedPeople()
  }, [task.id, parentTaskId])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  const handleOpenAssociatePerson = async () => {
    await fetchPeople()
    setShowAssociatePersonModal(true)
  }

  const validateEventSchedule = () => {
    if (!startDate || !endDate) {
      setSaveError('Informe as datas de início e término.')
      return false
    }

    if (!allDay && (!startTime || !endTime)) {
      setSaveError('Informe os horários de início e término.')
      return false
    }

    return true
  }

  const buildEventFromTask = (sourceTask: Task) => buildEventPayload({
    title: content.trim(),
    startDate,
    endDate,
    allDay,
    ...(!allDay ? { startTime, endTime } : {}),
    timeZone,
    personIds: associatedPersonIds,
    optionalFields: buildTaskOptionalFields(sourceTask),
    actionPlanning,
    automation,
    createdAt: new Date(),
  })

  const convertTopLevelTask = async () => {
    if (!uid) return

    const taskReference = doc(db, `users/${uid}/tasks-list`, task.id)
    await runTransaction(db, async transaction => {
      const taskSnapshot = await transaction.get(taskReference)
      if (!taskSnapshot.exists()) {
        throw new Error('A tarefa não existe mais.')
      }

      const currentTask = hydrateTask(taskSnapshot.id, taskSnapshot.data())
      const eventReference = doc(collection(db, `users/${uid}/events-history`))

      transaction.set(eventReference, buildEventFromTask(currentTask))
      transaction.delete(taskReference)
    })
  }

  const convertEmbeddedSubtask = async () => {
    if (!uid || !parentTaskId) return

    const parentReference = doc(db, `users/${uid}/tasks-list`, parentTaskId)
    await runTransaction(db, async transaction => {
      const parentSnapshot = await transaction.get(parentReference)
      if (!parentSnapshot.exists()) {
        throw new Error('A tarefa pai não existe mais.')
      }

      const parentTask = hydrateTask(parentSnapshot.id, parentSnapshot.data())
      const subtasks = Array.isArray(parentTask.subtasks) ? parentTask.subtasks : []
      const subtaskIndex = subtasks.findIndex(subtask => subtask.id === task.id)
      if (subtaskIndex === -1) {
        throw new Error('A subtarefa não foi encontrada na tarefa pai.')
      }

      const currentSubtask = subtasks[subtaskIndex]
      const eventReference = doc(collection(db, `users/${uid}/events-history`))
      const updatedSubtasks = subtasks.filter(subtask => subtask.id !== task.id)

      transaction.set(eventReference, buildEventFromTask(currentSubtask))
      transaction.update(parentReference, { subtasks: updatedSubtasks })
    })
  }

  const updateTopLevelTask = async () => {
    if (!uid) return

    await updateDoc(
      doc(db, `users/${uid}/tasks-list`, task.id),
      buildTaskUpdate({ content, actionPlanning, automation, schedule }),
    )
  }

  const updateEmbeddedSubtask = async () => {
    if (!uid || !parentTaskId) return

    const parentReference = doc(db, `users/${uid}/tasks-list`, parentTaskId)
    await runTransaction(db, async transaction => {
      const parentSnapshot = await transaction.get(parentReference)
      if (!parentSnapshot.exists()) {
        throw new Error('A tarefa pai não existe mais.')
      }

      const parentTask = hydrateTask(parentSnapshot.id, parentSnapshot.data())
      const subtasks = Array.isArray(parentTask.subtasks) ? parentTask.subtasks : []
      const subtaskIndex = subtasks.findIndex(subtask => subtask.id === task.id)
      if (subtaskIndex === -1) {
        throw new Error('A subtarefa não foi encontrada na tarefa pai.')
      }

      const currentSubtask = subtasks[subtaskIndex]
      const updatedSubtasks = subtasks.map((subtask, index) => (
        index === subtaskIndex
          ? schedule
            ? {
              ...currentSubtask,
              content: content.trim(),
              actionPlanning,
              automation,
              schedule,
            }
            : (() => {
              const { schedule: _schedule, ...withoutSchedule } = currentSubtask
              return {
                ...withoutSchedule,
                content: content.trim(),
                actionPlanning,
                automation,
              }
            })()
          : subtask
      ))

      transaction.update(parentReference, {
        subtasks: updatedSubtasks.map(serializeTaskSubtask),
      })
    })
  }

  const handleUpdate = async () => {
    if (isSaving) return

    const trimmedContent = content.trim()
    if (!trimmedContent) {
      setSaveError('Digite algo para a tarefa.')
      return
    }

    if (!uid) return

    if (addingDate && !validateEventSchedule()) return

    if (addingDate && !parentTaskId && (task.subtasks?.length ?? 0) > 0) {
      const confirmed = window.confirm(
        'Esta tarefa possui subtarefas.\n\nDeseja que todas elas se incorporem ao novo evento?',
      )
      if (!confirmed) return
    }

    setSaveError('')
    setIsSaving(true)

    try {
      if (addingDate) {
        if (parentTaskId) {
          await convertEmbeddedSubtask()
        } else {
          await convertTopLevelTask()
        }
      } else if (parentTaskId) {
        await updateEmbeddedSubtask()
      } else {
        await updateTopLevelTask()
      }

      onUpdated()
      onClose()
    } catch (error) {
      console.error('Erro ao atualizar tarefa ou criar evento:', error)
      setSaveError(error instanceof Error
        ? error.message
        : 'Não foi possível salvar a tarefa. Tente novamente.')
    } finally {
      setIsSaving(false)
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
            placeholder="Descrição da tarefa"
            aria-label="Descrição da tarefa"
            className={styles.input}
          />

          <div className={styles.conversionPanel}>
            <label className={styles.optionRow}>
              <input
                type="checkbox"
                checked={addingDate}
                onChange={() => setAddingDate(!addingDate)}
                className={styles.checkbox}
              />
              Agendar como evento
            </label>

            {addingDate && (
              <>
                <div className={styles.datePanel}>
                  <CalendarEventCreator {...dateControl} />
                </div>

                <div className={styles.associationPanel}>
                  {associatedPersonIds.length > 0 ? (
                    <AssociatePersonRenderer
                      personIds={associatedPersonIds}
                      people={people}
                      onOpenPersonList={handleOpenAssociatePerson}
                    />
                  ) : (
                    <>
                      <p className={styles.associationLabel}>Pessoas associadas</p>
                      <button
                        type="button"
                        className={styles.associationButton}
                        onClick={handleOpenAssociatePerson}
                      >
                        + Associar pessoa
                      </button>
                    </>
                  )}

                  {showAssociatePersonModal && (
                    <AssociatePersonModal
                      onClose={() => setShowAssociatePersonModal(false)}
                      onAssociatePerson={associatePerson}
                      onDisassociatePerson={disassociatePerson}
                      associatedPersonIds={associatedPersonIds}
                      people={people}
                    />
                  )}

                  {associatePersonError && (
                    <p className={styles.error} role="alert">{associatePersonError}</p>
                  )}
                </div>
              </>
            )}
          </div>

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

          {saveError && <p className={styles.error} role="alert">{saveError}</p>}
        </div>

        <footer className={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className={styles.secondaryButton}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            disabled={isSaving}
            className={styles.primaryButton}
          >
            {isSaving ? 'Salvando...' : addingDate ? 'Criar evento' : 'Salvar tarefa'}
          </button>
        </footer>
      </section>
    </motion.div>
  )
}
