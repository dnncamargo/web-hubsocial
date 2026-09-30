'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../components/auth/AuthProvider'
import { motion } from 'motion/react'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import CalendarEventCreator from '../../components/ui/CalendarEventCreator'
import useEventDate from '../../hooks/useEventDate'
import { useEventForm } from '../../hooks/useEventForm'
import { useOptionalFields } from '../../hooks/useOptionalFields'
import { OptionalFieldModal } from '../../components/optional-fields/OptionalFieldModal'
import { OptionalFieldRenderer } from '../../components/optional-fields/OptionalFieldRenderer'
import { useAssociatePerson } from '@/app/hooks/useAssociatePerson'
import { AssociatePersonModal } from './AssociatePersonModal'
import { AssociatePersonRenderer } from './AssociatePersonRenderer'
import { AssociatedPeopleModal } from './AssociatedPeopleModal'
import { EventCategoriesModal } from './EventCategoriesModal'
import { useEventCategories } from '@/app/hooks/useEventCategories'
import { useLocalEditorDraft } from '../../hooks/useLocalEditorDraft'
import {
  isEventEditorDraft,
  type EventEditorDraft,
} from '../../utils/editorDraftStorage'
import { EventCategoriesRenderer } from './EventCategoriesRenderer'
import ActionPlanningControl from '../../components/actions/ActionPlanningControl'
import AutomationRulesEditor from '../../components/actions/AutomationRulesEditor'
import styles from './EventEditor.module.css'

interface AddEventModalProps {
  isOpen: boolean
  onDismiss: () => void
  onCancel: () => void
  onSaved: () => void
  onAdded: () => void
  initialPersonId?: string
}

const AddEventModal: React.FC<AddEventModalProps> = ({
  isOpen,
  onDismiss,
  onCancel,
  onSaved,
  onAdded,
  initialPersonId,
}) => {
  const { uid } = useAuth()
  const [showMore, setShowMore] = useState(false)
  const [showOptionalFieldModal, setShowOptionalFieldModal] = useState(false)
  const [showAddPersonModal, setShowAddPersonModal] = useState(false)
  const [showPersonListModal, setShowPersonListModal] = useState(false)
  const [showCategoriesModal, setShowCategoriesModal] = useState(false)

  const effectiveUid = uid ?? ''
  const dateControl = useEventDate()
  const optionalFieldsControl = useOptionalFields({ context: 'event' })

  const {
    optionalFields,
    addOptionalField,
    availableFieldOptions,
    removeOptionalField,
    updateOptionalField,
    updateLabel,
    resetOptionalFields,
  } = optionalFieldsControl

  const associatePersonControl = useAssociatePerson({ uid: effectiveUid })
  const {
    people,
    fetchPeople,
    associatedPersonIds: personIds,
    associatePerson,
    disassociatePerson,
  } = associatePersonControl

  const eventCategoriesControl = useEventCategories()
  const {
    availableCategories,
    categoryColors,
    selectedCategories,
    toggleCategory,
    handleAddCategory,
    removeCategory,
    setCategoryColor,
    setSelectedCategories,
    error: categoryError,
  } = eventCategoriesControl

  const {
    title,
    setTitle,
    location,
    setLocation,
    actionPlanning,
    setActionPlanning,
    automation,
    setAutomation,
    error,
    setError,
    resetForm,
    createEvent,
  } = useEventForm({
    uid: effectiveUid,
    initialPersonId,
    dateControl,
    optionalFieldsControl,
    associatePersonControl,
    eventCategoriesControl,
  })

  const closeNestedModals = () => {
    setShowOptionalFieldModal(false)
    setShowAddPersonModal(false)
    setShowPersonListModal(false)
    setShowCategoriesModal(false)
  }

  const editorDraft = useLocalEditorDraft<EventEditorDraft>({
    scope: {
      uid,
      entity: 'event',
      operation: 'add',
      context: initialPersonId ? `person:${initialPersonId}` : undefined,
    },
    isOpen,
    isValid: isEventEditorDraft,
    getSnapshot: () => ({
      title,
      location,
      allDay: dateControl.allDay,
      startDate: dateControl.startDate,
      endDate: dateControl.endDate,
      startTime: dateControl.startTime,
      endTime: dateControl.endTime,
      timeZone: dateControl.timeZone,
      categories: selectedCategories,
      personIds,
      optionalFields,
      actionPlanning,
      automation,
      showMore,
    }),
    restoreSnapshot: (draft) => {
      setTitle(draft.title)
      setLocation(draft.location)
      dateControl.setAllDay(draft.allDay)
      dateControl.setStartDate(draft.startDate)
      dateControl.setEndDate(draft.endDate)
      dateControl.setStartTime(draft.startTime)
      dateControl.setEndTime(draft.endTime)
      setSelectedCategories(draft.categories)
      associatePersonControl.setAssociatedPersonIds(draft.personIds)
      resetOptionalFields(draft.optionalFields)
      setActionPlanning(draft.actionPlanning)
      setAutomation(draft.automation)
      setShowMore(draft.showMore)
      setError(null)
    },
    resetState: () => {
      resetForm()
      setShowMore(false)
      closeNestedModals()
    },
  })

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
    setShowAddPersonModal(true)
  }

  const handleDismiss = () => {
    editorDraft.saveOnDismiss()
    closeNestedModals()
    onDismiss()
  }

  const handleCancel = () => {
    editorDraft.saveOnDismiss()
    closeNestedModals()
    onCancel()
  }

  const handleClear = () => {
    editorDraft.clearDraft()
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    handleDismiss()
  }

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    const success = await createEvent()

    if (success) {
      editorDraft.consumeAfterSave()
      onAdded()
      onSaved()
    }
  }

  if (!isOpen || !uid) return null

  return (
    <ProtectedRoute>
      <motion.div
        id="add-event-modal"
        className={styles.modal}
        onClick={handleBackdropClick}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-event-title"
      >
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.content}>
            <div className={styles.toolbar}>
              <button type="button" onClick={handleCancel} className={styles.toolbarButton}>
                Cancelar
              </button>
              <h3 id="add-event-title" className={styles.toolbarTitle}>Novo evento</h3>
              <button
                type="submit"
                disabled={!!error}
                className={styles.toolbarButton}
              >
                Salvar
              </button>
            </div>

            <div className={styles.fieldGroup}>
              <input
                type="text"
                placeholder="Título"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={styles.textInput}
              />
              <input
                type="text"
                placeholder="Local ou chamada de vídeo"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className={styles.textInput}
              />
            </div>

            <div className={styles.dateGroup}>
              <CalendarEventCreator {...dateControl} />
            </div>

            <ActionPlanningControl
              planning={actionPlanning}
              onChange={setActionPlanning}
            />

            <AutomationRulesEditor
              uid={effectiveUid}
              value={automation}
              onChange={setAutomation}
            />

            <div className={styles.moreRow}>
              <span>Mostrar mais campos</span>
              <button
                type="button"
                role="switch"
                aria-checked={showMore}
                onClick={() => setShowMore(!showMore)}
                className={showMore
                  ? `${styles.switch} ${styles.switchActive}`
                  : styles.switch}
              >
                <span
                  className={showMore
                    ? `${styles.switchThumb} ${styles.switchThumbActive}`
                    : styles.switchThumb}
                  aria-hidden="true"
                />
              </button>
            </div>

            {showMore && (
              <div className={styles.moreContent}>
                <AssociatePersonRenderer
                  personIds={personIds}
                  people={people}
                  onOpenPersonList={() => setShowPersonListModal(true)}
                />

                {optionalFields.map(field => (
                  <OptionalFieldRenderer
                    key={field.id}
                    field={field}
                    onChange={(updatedValue) => {
                      updateOptionalField(field.id, { value: updatedValue })
                    }}
                    onLabelChange={(newLabel) => updateLabel(field.id, newLabel)}
                    onRemove={() => removeOptionalField(field.id)}
                  />
                ))}

                <EventCategoriesRenderer
                  selectedCategories={selectedCategories}
                  categoryColors={categoryColors}
                />

                {showOptionalFieldModal && (
                  <OptionalFieldModal
                    context="event"
                    availableFieldOptions={availableFieldOptions}
                    onAddOptionalField={addOptionalField}
                    onClose={() => setShowOptionalFieldModal(false)}
                  />
                )}

                {showCategoriesModal && (
                  <EventCategoriesModal
                    onClose={() => setShowCategoriesModal(false)}
                    availableCategories={availableCategories}
                    selectedCategories={selectedCategories}
                    toggleCategory={toggleCategory}
                    handleAddCategory={handleAddCategory}
                    removeCategory={removeCategory}
                    error={categoryError}
                    categoryColors={categoryColors}
                    setCategoryColor={setCategoryColor}
                  />
                )}

                {showAddPersonModal && (
                  <AssociatePersonModal
                    onClose={() => setShowAddPersonModal(false)}
                    onAssociatePerson={associatePerson}
                    onDisassociatePerson={disassociatePerson}
                    associatedPersonIds={personIds}
                    people={people}
                  />
                )}

                {showPersonListModal && (
                  <AssociatedPeopleModal
                    personIds={personIds}
                    people={people}
                    onDisassociatePerson={disassociatePerson}
                    onClose={() => setShowPersonListModal(false)}
                  />
                )}

                <div className={styles.actions}>
                  <button
                    type="button"
                    onClick={handleOpenAssociatePerson}
                    className={styles.textAction}
                  >
                    + Associar pessoa
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCategoriesModal(true)}
                    className={styles.textAction}
                  >
                    + Adicionar categoria
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOptionalFieldModal(true)}
                    className={styles.textAction}
                  >
                    + Adicionar campo opcional
                  </button>
                </div>
              </div>
            )}

            <div className={styles.draftActions}>
              <button type="button" onClick={handleClear} className={styles.textAction}>
                Limpar
              </button>
            </div>

            {error && <p className={styles.error}>{error}</p>}
          </div>
        </form>
      </motion.div>
    </ProtectedRoute>
  )
}

export default AddEventModal
