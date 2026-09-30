import { useEffect, useRef } from 'react'
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

  useEffect(() => {
    if (!isOpen || !storageKey) return

    const draft = readEditorDraft<T>(scope, callbacks.current.isValid)
    if (draft) {
      callbacks.current.restoreSnapshot(draft)
      return
    }

    callbacks.current.resetState()
  }, [isOpen, storageKey])

  const saveOnDismiss = () => {
    writeEditorDraft(scope, callbacks.current.getSnapshot())
  }

  const clearDraft = () => {
    clearEditorDraft(scope)
    callbacks.current.resetState()
  }

  const consumeAfterSave = () => {
    clearEditorDraft(scope)
  }

  return { saveOnDismiss, clearDraft, consumeAfterSave }
}
