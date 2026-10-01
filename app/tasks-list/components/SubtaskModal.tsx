'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { doc, runTransaction } from 'firebase/firestore'
import { db } from '../../utils/firebaseConfig'
import { useAuth } from '../../components/auth/AuthProvider'
import { useOutsideDismiss } from '../../hooks/useOutsideDismiss'
import { Task } from '../../utils/interfaces'
import {
  createCanonicalSubtask,
} from '../../utils/taskSubtasks'
import {
  getCurrentCivilDate,
} from '../../utils/taskFocus'
import {
  hydrateTask,
  serializeTask,
} from '../../utils/taskPayload'
import { updateSubtask } from '../../utils/taskHierarchy'
import styles from './TaskEditor.module.css'

interface SubtaskModalProps {
  parent: Task
  subtask?: Task
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

export default function SubtaskModal({
  parent,
  subtask,
  isOpen,
  onClose,
  onSaved,
}: SubtaskModalProps) {
  const { uid } = useAuth()
  const formRef = useRef<HTMLFormElement | null>(null)
  const [content, setContent] = useState(subtask?.content ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const isEditing = Boolean(subtask)

  useEffect(() => {
    setContent(subtask?.content ?? '')
    setSaveError('')
  }, [isOpen, parent.id, subtask?.id])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  useOutsideDismiss({
    open: isOpen,
    insideRefs: [formRef],
    disabled: isSaving,
    onDismiss: onClose,
  })

  if (!isOpen || !uid) return null

  const handleSave = async () => {
    const trimmedContent = content.trim()
    if (!trimmedContent) {
      setSaveError('Digite algo para a subtarefa.')
      return
    }

    setIsSaving(true)
    setSaveError('')

    try {
      const parentReference = doc(db, `users/${uid}/tasks-list`, parent.id)
      const targetDate = getCurrentCivilDate()

      await runTransaction(db, async transaction => {
        const parentSnapshot = await transaction.get(parentReference)
        if (!parentSnapshot.exists()) {
          throw new Error('A tarefa pai não existe mais.')
        }

        const currentParent = hydrateTask(parentSnapshot.id, parentSnapshot.data(), targetDate)
        const nextParent = subtask
          ? updateSubtask(currentParent, subtask.id, currentSubtask => ({
            ...currentSubtask,
            content: trimmedContent,
          }))
          : {
            ...currentParent,
            subtasks: [
              ...(currentParent.subtasks ?? []),
              {
                ...createCanonicalSubtask(trimmedContent, currentParent.id),
                nature: 'punctual' as const,
                subtasks: undefined,
              } as Task,
            ],
          }

        if (!nextParent) {
          throw new Error('A subtarefa não foi encontrada na tarefa pai.')
        }

        transaction.set(parentReference, serializeTask(nextParent, targetDate))
      })

      onSaved()
      onClose()
    } catch (error) {
      setSaveError(error instanceof Error
        ? error.message
        : 'Não foi possível salvar a subtarefa.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = () => {
    setContent('')
    setSaveError('')
  }

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <form
        ref={formRef}
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          void handleSave()
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="subtask-title"
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
            <h2 id="subtask-title" className={styles.toolbarTitle}>
              {isEditing ? 'Editar subtask' : 'Nova subtask'}
            </h2>
            <button type="submit" disabled={isSaving} className={styles.toolbarButton}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>

          <div className={styles.fieldGroup}>
            <input
              type="text"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="O que precisa ser feito?"
              aria-label="O que precisa ser feito?"
              className={styles.input}
              autoFocus
            />
          </div>

          <div className={styles.draftActions}>
            <button type="button" onClick={handleClear} className={styles.textAction}>
              Limpar
            </button>
          </div>

          {saveError && <p className={styles.error} role="alert">{saveError}</p>}
        </div>
      </form>
    </motion.div>
  )
}
