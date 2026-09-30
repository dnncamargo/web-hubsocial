import { useSelectableStringSetting } from './useSelectableStringSetting'

export function usePersonRelationships() {
  const {
    availableValues,
    availableColors,
    selectedValues,
    setSelectedValues,
    toggleValue,
    clearSelectedValues,
    handleAddValue,
    removeValue,
    setValueColor,
    error,
  } = useSelectableStringSetting({
    documentId: 'userRelationships',
    fieldName: 'relationship',
    errorLabel: 'relacionamento',
    colorFieldName: 'relationshipColors',
  })

  return {
    availableRelationships: availableValues,
    relationshipColors: availableColors,
    selectedRelationships: selectedValues,
    setSelectedRelationships: setSelectedValues,
    toggleRelationship: toggleValue,
    clearSelectedRelationships: clearSelectedValues,
    handleAddRelationship: handleAddValue,
    removeRelationship: removeValue,
    setRelationshipColor: setValueColor,
    error,
  }
}
