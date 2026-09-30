import { useSelectableStringSetting } from './useSelectableStringSetting'

export function useEventCategories() {
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
    documentId: 'userCategories',
    fieldName: 'category',
    errorLabel: 'categoria',
    colorFieldName: 'categoryColors',
  })

  return {
    availableCategories: availableValues,
    categoryColors: availableColors,
    selectedCategories: selectedValues,
    setSelectedCategories: setSelectedValues,
    toggleCategory: toggleValue,
    clearSelectedCategories: clearSelectedValues,
    handleAddCategory: handleAddValue,
    removeCategory: removeValue,
    setCategoryColor: setValueColor,
    error,
  }
}
