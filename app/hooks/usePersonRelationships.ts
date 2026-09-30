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
    setValueColor,
  } = useSelectableStringSetting({
    documentId: 'userRelationships',
    fieldName: 'relationship',
    errorLabel: 'novo relacionamento',
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
    setRelationshipColor: setValueColor,
  }
}
