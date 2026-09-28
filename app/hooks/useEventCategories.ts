import { useSelectableStringSetting } from './useSelectableStringSetting'

export function useEventCategories() {
  const {
    availableValues,
    selectedValues,
    setSelectedValues,
    toggleValue,
    clearSelectedValues,
    handleAddValue,
  } = useSelectableStringSetting({
    documentId: 'userCategories',
    fieldName: 'category',
    errorLabel: 'nova categoria',
  })

  return {
    availableCategories: availableValues,
    selectedCategories: selectedValues,
    setSelectedCategories: setSelectedValues,
    toggleCategory: toggleValue,
    clearSelectedCategories: clearSelectedValues,
    handleAddCategory: handleAddValue,
  }
}
