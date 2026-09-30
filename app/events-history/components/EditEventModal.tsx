'use client'

import { useState, useEffect } from 'react'
import { doc, deleteDoc } from 'firebase/firestore'
import { db } from '../../utils/firebaseConfig'
import { useAuth } from '../../components/auth/AuthProvider'
import { Event } from '../../utils/interfaces'
import { motion } from 'motion/react'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import CalendarEventCreator from '../../components/ui/CalendarEventCreator'
import { useEventForm } from '@/app/hooks/useEventForm'
import { useEventCategories } from '@/app/hooks/useEventCategories'
import { useAssociatePerson } from '@/app/hooks/useAssociatePerson'
import { useOptionalFields } from '@/app/hooks/useOptionalFields'
import useEventDate from '@/app/hooks/useEventDate'
import { AssociatePersonModal } from './AssociatePersonModal'
import { AssociatedPeopleModal } from './AssociatedPeopleModal'
import { EventCategoriesModal } from './EventCategoriesModal'
import { OptionalFieldModal } from '@/app/components/optional-fields/OptionalFieldModal'
import { EventCategoriesRenderer } from './EventCategoriesRenderer'
import { OptionalFieldRenderer } from '@/app/components/optional-fields/OptionalFieldRenderer'
import { AssociatePersonRenderer } from './AssociatePersonRenderer'
import ActionPlanningControl from '../../components/actions/ActionPlanningControl'
import AutomationRulesEditor from '../../components/actions/AutomationRulesEditor'
import styles from './EventEditor.module.css'

interface EditEventModalProps {
  event: Event
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
}

const EditEventModal = ({
  event,
  isOpen,
  onClose,
  onUpdated,
}: EditEventModalProps) => {
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
    setCategoryColor,
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
    updateEvent,
  } = useEventForm({
    uid: effectiveUid,
    event,
    dateControl,
    optionalFieldsControl,
    associatePersonControl,
    eventCategoriesControl,
  })

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      resetOptionalFields()
    }
  }, [isOpen])

  useEffect(() => {
    if (personIds.length > 0) {
      fetchPeople()
    }
  }, [personIds])

  const handleOpenAssociatePerson = async () => {
    await fetchPeople()
    setShowAddPersonModal(true)
  }

  const handleUpdate = async (
    submitEvent: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    submitEvent.preventDefault()
    const success = await updateEvent()

    if (success) {
      onClose()
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!uid) return

    try {
      const eventRef = doc(db, 'users', uid, 'events-history', event.id)
      await deleteDoc(eventRef)
      onUpdated()
      onClose()
    } catch (deleteError) {
      console.error('Erro ao excluir o evento: ', deleteError)
    }
  }

  if (!isOpen || !uid) return null

  return (
    <ProtectedRoute>
      <motion.div
        id="edit-event-modal"
        className={styles.modal}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-event-title"
      >
        <form onSubmit={handleUpdate} className={styles.form}>
          <div className={styles.content}>
            <div className={styles.toolbar}>
              <button type="button" onClick={onClose} className={styles.toolbarButton}>
                Cancelar
              </button>
              <h3 id="edit-event-title" className={styles.toolbarTitle}>Editar evento</h3>
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
                onChange={(inputEvent) => setTitle(inputEvent.target.value)}
                className={styles.textInput}
              />
              <input
                type="text"
                placeholder="Local ou chamada de vídeo"
                value={location}
                onChange={(inputEvent) => setLocation(inputEvent.target.value)}
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
              excludeEventId={event.id}
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

            <div className={styles.destructiveRow}>
              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
              >
                Excluir evento
              </button>
            </div>

            {error && <p className={styles.error}>{error}</p>}
          </div>
        </form>
      </motion.div>
    </ProtectedRoute>
  )
}

export default EditEventModal
