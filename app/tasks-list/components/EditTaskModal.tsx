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
import { TaskEventAssociation, TaskNature, TaskSchedule } from '../../types/tasks'
import {
  buildTaskArchiveUpdate,
  buildTaskRestoreUpdate,
  buildTaskUpdate,
  hydrateTask,
  isTaskArchived,
} from '../../utils/taskPayload'
import ActionPlanningControl from '../../components/actions/ActionPlanningControl'
import AutomationRulesEditor from '../../components/actions/AutomationRulesEditor'
import TaskNatureControl from '../../components/actions/TaskNatureControl'
import TaskScheduleControl from '../../components/actions/TaskScheduleControl'
import { changeTaskNature } from '../../utils/taskAuthoring'
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
  const [nature, setNature] = useState<TaskNature>(task.nature)
  const [schedule, setSchedule] = useState<TaskSchedule | undefined>(task.schedule)
  const [eventAssociation, setEventAssociation] = useState<TaskEventAssociation | undefined>(
    task.eventAssociation,
  )
  const [automation, setAutomation] = useState<AutomationRuleSet>(
    task.automation ?? { match: 'all', rules: [] },
  )
  const [showAssociatePersonModal, setShowAssociatePersonModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showConditions, setShowConditions] = useState(
    (task.automation?.rules.length ?? 0) > 0,
  )
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
    setNature(task.nature)
    setSchedule(task.schedule)
    setEventAssociation(task.eventAssociation)
    setAutomation(task.automation ?? { match: 'all', rules: [] })
    setShowConditions((task.automation?.rules.length ?? 0) > 0)
    setAddingDate(false)
    setSaveError('')
    setShowAssociatePersonModal(false)
    resetAssociatedPeople()
  }, [task.id, isOpen])

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

  const handleNatureChange = (nextNature: TaskNature) => {
    setNature(nextNature)
    setSchedule(changeTaskNature(schedule, nextNature))
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

  const updateTopLevelTask = async () => {
    if (!uid) return

    await updateDoc(
      doc(db, `users/${uid}/tasks-list`, task.id),
      buildTaskUpdate({ content, actionPlanning, automation, schedule, eventAssociation }),
    )
  }

  const handleUpdate = async (submitEvent?: React.FormEvent<HTMLFormElement>) => {
    submitEvent?.preventDefault()
    if (isSaving) return

    const trimmedContent = content.trim()
    if (!trimmedContent) {
      setSaveError('Digite algo para a tarefa.')
      return
    }

    if (!uid) return

    if (addingDate && !validateEventSchedule()) return

    if (addingDate && (task.subtasks?.length ?? 0) > 0) {
      const confirmed = window.confirm(
        'Esta tarefa possui subtarefas.\n\nDeseja que todas elas se incorporem ao novo evento?',
      )
      if (!confirmed) return
    }

    setSaveError('')
    setIsSaving(true)

    try {
      if (addingDate) {
        await convertTopLevelTask()
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

  const handleArchiveToggle = async () => {
    if (isSaving || !uid) return

    const archived = isTaskArchived(task)
    if (!archived) {
      const recurringMessage = task.nature === 'recurring'
        ? '\n\nEnquanto estiver arquivada, novas ocorrências não serão projetadas.'
        : ''
      const confirmed = window.confirm(
        `Arquivar esta tarefa?\n\nEla deixará de aparecer nas áreas de trabalho ativas.\nSeus dados serão preservados.${recurringMessage}`,
      )
      if (!confirmed) return
    }

    setSaveError('')
    setIsSaving(true)

    try {
      await updateDoc(
        doc(db, `users/${uid}/tasks-list`, task.id),
        archived ? buildTaskRestoreUpdate() : buildTaskArchiveUpdate(),
      )
      onUpdated()
      onClose()
    } catch (error) {
      console.error('Erro ao alterar o arquivamento da tarefa:', error)
      setSaveError(error instanceof Error
        ? error.message
        : 'Não foi possível alterar o arquivamento da tarefa. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = () => {
    setContent(task.content)
    setActionPlanning(task.actionPlanning ?? {})
    setNature(task.nature)
    setSchedule(task.schedule)
    setEventAssociation(task.eventAssociation)
    setAutomation(task.automation ?? { match: 'all', rules: [] })
    setAddingDate(false)
    setShowConditions((task.automation?.rules.length ?? 0) > 0)
    setSaveError('')
  }

  if (!isOpen || !uid) return null

  return (
    <motion.div
      className={styles.overlay}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose()
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <form
        className={styles.form}
        onSubmit={(event) => void handleUpdate(event)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-task-title"
      >
        <div className={styles.content}>
          <div className={styles.toolbar}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className={styles.toolbarButton}
            >
              Cancelar
            </button>
            <h2 id="edit-task-title" className={styles.toolbarTitle}>Editar tarefa</h2>
            <button type="submit" disabled={isSaving} className={styles.toolbarButton}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>

          <TaskNatureControl value={nature} onChange={handleNatureChange} />

          <div className={styles.fieldGroup}>
            <input
              type="text"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="O que precisa ser feito?"
              aria-label="O que precisa ser feito?"
              className={styles.input}
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
            uid={uid}
            nature={nature}
            value={schedule}
            onChange={setSchedule}
            eventAssociation={eventAssociation}
            onEventAssociationChange={setEventAssociation}
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

          <div className={styles.disclosure}>
            <button
              type="button"
              className={styles.disclosureButton}
              aria-expanded={showConditions}
              onClick={() => setShowConditions(value => !value)}
            >
              <span>Condições favoráveis</span>
              <span>{showConditions ? 'Ocultar' : 'Adicionar'}</span>
            </button>
            {showConditions && (
              <AutomationRulesEditor
                uid={uid}
                value={automation}
                onChange={setAutomation}
              />
            )}
          </div>

          <div className={styles.draftActions}>
            <button type="button" onClick={handleClear} className={styles.textAction}>
              Limpar
            </button>
          </div>

          <section className={styles.archivePanel} aria-labelledby="task-archive-title">
            <div>
              <h3 id="task-archive-title" className={styles.archiveTitle}>
                {isTaskArchived(task) ? 'Restaurar tarefa' : 'Arquivar tarefa'}
              </h3>
              <p className={styles.archiveDescription}>
                {isTaskArchived(task)
                  ? 'A tarefa voltará a aparecer nas áreas de trabalho ativas. Seus dados e seu status serão preservados.'
                  : 'A tarefa deixará de aparecer nas áreas de trabalho ativas. Seus dados serão preservados.'}
              </p>
            </div>
            <button
              type="button"
              className={isTaskArchived(task)
                ? styles.archiveRestoreButton
                : styles.archiveButton}
              onClick={() => void handleArchiveToggle()}
              disabled={isSaving}
            >
              {isTaskArchived(task) ? 'Restaurar tarefa' : 'Arquivar tarefa'}
            </button>
          </section>

          {saveError && <p className={styles.error} role="alert">{saveError}</p>}
        </div>
      </form>
    </motion.div>
  )
}
