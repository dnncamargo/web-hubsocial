import { useCallback, useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../utils/firebaseConfig'
import { useAuth } from '../components/auth/AuthProvider'

interface UseSelectableStringSettingOptions {
  documentId: string
  fieldName: string
  errorLabel: string
}

export function useSelectableStringSetting({
  documentId,
  fieldName,
  errorLabel,
}: UseSelectableStringSettingOptions) {
  const { uid } = useAuth()
  const [availableValues, setAvailableValues] = useState<string[]>([])
  const [selectedValues, setSelectedValues] = useState<string[]>([])

  const fetchAvailableValues = useCallback(async () => {
    if (!uid) {
      setAvailableValues([])
      return
    }

    const settingRef = doc(db, `users/${uid}/settings`, documentId)
    const snapshot = await getDoc(settingRef)

    if (snapshot.exists()) {
      const values = snapshot.data()?.[fieldName]
      setAvailableValues(Array.isArray(values) ? values : [])
    }
  }, [documentId, fieldName, uid])

  const handleAddValue = async (value: string) => {
    if (!uid) return

    const trimmed = value.trim()
    if (!trimmed || availableValues.includes(trimmed)) return

    const updatedValues = [...availableValues, trimmed]

    try {
      const settingRef = doc(db, `users/${uid}/settings`, documentId)
      await setDoc(settingRef, { [fieldName]: updatedValues }, { merge: true })
      setAvailableValues(updatedValues)
    } catch (error) {
      console.error(`Erro ao adicionar ${errorLabel}:`, error)
    }
  }

  const toggleValue = (value: string) => {
    setSelectedValues((previousValues) =>
      previousValues.includes(value)
        ? previousValues.filter((item) => item !== value)
        : [...previousValues, value]
    )
  }

  const clearSelectedValues = () => {
    setSelectedValues([])
  }

  useEffect(() => {
    void fetchAvailableValues()
  }, [fetchAvailableValues])

  return {
    availableValues,
    selectedValues,
    setSelectedValues,
    toggleValue,
    clearSelectedValues,
    handleAddValue,
  }
}
