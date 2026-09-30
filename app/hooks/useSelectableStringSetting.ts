import { useCallback, useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../utils/firebaseConfig'
import { useAuth } from '../components/auth/AuthProvider'
import { normalizeEntityColors, sanitizeEntityColor } from '../utils/entityColors'

interface UseSelectableStringSettingOptions {
  documentId: string
  fieldName: string
  errorLabel: string
  colorFieldName?: string
}

export function useSelectableStringSetting({
  documentId,
  fieldName,
  errorLabel,
  colorFieldName,
}: UseSelectableStringSettingOptions) {
  const { uid } = useAuth()
  const [availableValues, setAvailableValues] = useState<string[]>([])
  const [availableColors, setAvailableColors] = useState<Record<string, string>>({})
  const [selectedValues, setSelectedValues] = useState<string[]>([])

  const fetchAvailableValues = useCallback(async () => {
    if (!uid) {
      setAvailableValues([])
      setAvailableColors({})
      return
    }

    const settingRef = doc(db, `users/${uid}/settings`, documentId)
    const snapshot = await getDoc(settingRef)

    if (snapshot.exists()) {
      const data = snapshot.data()
      const values = data?.[fieldName]
      setAvailableValues(Array.isArray(values) ? values : [])
      setAvailableColors(normalizeEntityColors(
        colorFieldName ? data?.[colorFieldName] : undefined,
      ))
    } else {
      setAvailableValues([])
      setAvailableColors({})
    }
  }, [colorFieldName, documentId, fieldName, uid])

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

  const setValueColor = async (value: string, color: string) => {
    if (!uid || !colorFieldName) return

    const normalizedColor = sanitizeEntityColor(color)
    if (!normalizedColor) return

    const updatedColors = { ...availableColors, [value]: normalizedColor }
    try {
      const settingRef = doc(db, `users/${uid}/settings`, documentId)
      await setDoc(settingRef, { [colorFieldName]: updatedColors }, { merge: true })
      setAvailableColors(updatedColors)
    } catch (error) {
      console.error(`Erro ao salvar a cor de ${errorLabel}:`, error)
    }
  }

  useEffect(() => {
    void fetchAvailableValues()
  }, [fetchAvailableValues])

  return {
    availableValues,
    selectedValues,
    availableColors,
    setSelectedValues,
    toggleValue,
    clearSelectedValues,
    setValueColor,
    handleAddValue,
  }
}
