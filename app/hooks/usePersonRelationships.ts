import { useSelectableStringSetting } from './useSelectableStringSetting'

export function usePersonRelationships() {
  const {
    availableValues,
    selectedValues,
    setSelectedValues,
    toggleValue,
    clearSelectedValues,
    handleAddValue,
  } = useSelectableStringSetting({
    documentId: 'userRelationships',
    fieldName: 'relationship',
    errorLabel: 'novo relacionamento',
  })

  return {
    availableRelationships: availableValues,
    selectedRelationships: selectedValues,
    setSelectedRelationships: setSelectedValues,
    toggleRelationship: toggleValue,
    clearSelectedRelationships: clearSelectedValues,
    handleAddRelationship: handleAddValue,
  }
}
