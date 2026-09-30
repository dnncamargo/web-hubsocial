import { useCallback, useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../utils/firebaseConfig'
import { useAuth } from '../components/auth/AuthProvider'
import { normalizeEntityColors, sanitizeEntityColor } from '../utils/entityColors'
import {
  appendSelectableValue,
  buildSelectableSettingUpdate,
  normalizeSelectableValue,
  normalizeSelectableValues,
  removeSelectableValue,
} from '../utils/selectableStringSetting'

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
  const [error, setError] = useState<string | null>(null)

  const fetchAvailableValues = useCallback(async () => {
    setError(null)
    if (!uid) {
      setAvailableValues([])
      setAvailableColors({})
      return
    }

    try {
      const settingRef = doc(db, `users/${uid}/settings`, documentId)
      const snapshot = await getDoc(settingRef)

      if (snapshot.exists()) {
        const data = snapshot.data()
        const values = data?.[fieldName]
        setAvailableValues(normalizeSelectableValues(values))
        setAvailableColors(normalizeEntityColors(
          colorFieldName ? data?.[colorFieldName] : undefined,
        ))
      } else {
        setAvailableValues([])
        setAvailableColors({})
      }
    } catch (error) {
      console.error(`Erro ao carregar ${errorLabel}:`, error)
      setAvailableValues([])
      setAvailableColors({})
      setError(`Erro ao carregar ${errorLabel}. Verifique sua conexão.`)
    }
  }, [colorFieldName, documentId, errorLabel, fieldName, uid])

  const handleAddValue = async (value: string): Promise<boolean> => {
    setError(null)
    const normalizedValue = normalizeSelectableValue(value)
    if (!uid || !normalizedValue) return false

    const updatedValues = appendSelectableValue(availableValues, normalizedValue)
    if (updatedValues.length === normalizeSelectableValues(availableValues).length) {
      return false
    }

    try {
      const settingRef = doc(db, `users/${uid}/settings`, documentId)
      await setDoc(settingRef, buildSelectableSettingUpdate(fieldName, updatedValues), { merge: true })
      setAvailableValues(updatedValues)
      return true
    } catch (error) {
      console.error(`Erro ao adicionar ${errorLabel}:`, error)
      setError(`Erro ao adicionar ${errorLabel}. Verifique sua conexão.`)
      return false
    }
  }

  const removeValue = async (value: string): Promise<boolean> => {
    setError(null)
    const normalizedValue = normalizeSelectableValue(value)
    if (!uid || !normalizedValue) return false

    const normalizedAvailableValues = normalizeSelectableValues(availableValues)
    const updatedValues = removeSelectableValue(normalizedAvailableValues, normalizedValue)
    const updatedSelectedValues = removeSelectableValue(selectedValues, normalizedValue)
    if (updatedValues.length === normalizedAvailableValues.length
      && updatedValues.every((item, index) => item === normalizedAvailableValues[index])) {
      setSelectedValues(updatedSelectedValues)
      return true
    }

    try {
      const settingRef = doc(db, `users/${uid}/settings`, documentId)
      await setDoc(settingRef, buildSelectableSettingUpdate(fieldName, updatedValues), { merge: true })
      setAvailableValues(updatedValues)
      setSelectedValues(updatedSelectedValues)
      return true
    } catch (error) {
      console.error(`Erro ao excluir ${errorLabel}:`, error)
      setError(`Erro ao excluir ${errorLabel}. Verifique sua conexão.`)
      return false
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
    setError(null)
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
      setError(`Erro ao salvar a cor de ${errorLabel}. Verifique sua conexão.`)
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
    removeValue,
    error,
  }
}
