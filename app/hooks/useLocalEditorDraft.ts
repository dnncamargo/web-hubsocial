import { useEffect, useRef, useState } from 'react'
import {
  clearEditorDraft,
  getEditorDraftKey,
  readEditorDraft,
  writeEditorDraft,
  type EditorDraftScope,
} from '../utils/editorDraftStorage'

interface UseLocalEditorDraftOptions<T> {
  scope: EditorDraftScope
  isOpen: boolean
  getSnapshot: () => T
  restoreSnapshot: (snapshot: T) => void
  resetState: () => void
  isValid?: (value: unknown) => value is T
}

export function useLocalEditorDraft<T>({
  scope,
  isOpen,
  getSnapshot,
  restoreSnapshot,
  resetState,
  isValid,
}: UseLocalEditorDraftOptions<T>) {
  const callbacks = useRef({ getSnapshot, restoreSnapshot, resetState, isValid })
  callbacks.current = { getSnapshot, restoreSnapshot, resetState, isValid }

  const storageKey = getEditorDraftKey(scope)
  const [hasDraft, setHasDraft] = useState(false)

  useEffect(() => {
    if (!isOpen || !storageKey) {
      setHasDraft(false)
      return
    }

    const draft = readEditorDraft<T>(scope, callbacks.current.isValid)
    if (draft) {
      setHasDraft(true)
      callbacks.current.restoreSnapshot(draft)
      return
    }

    setHasDraft(false)
    callbacks.current.resetState()
  }, [isOpen, storageKey])

  const saveOnDismiss = () => {
    if (writeEditorDraft(scope, callbacks.current.getSnapshot())) {
      setHasDraft(true)
    }
  }

  const clearDraft = () => {
    clearEditorDraft(scope)
    setHasDraft(false)
    callbacks.current.resetState()
  }

  const consumeAfterSave = () => {
    clearEditorDraft(scope)
    setHasDraft(false)
  }

  return {
    saveOnDismiss,
    clearDraft,
    consumeAfterSave,
    hasDraft,
    canClearDraft: hasDraft,
  }
}
