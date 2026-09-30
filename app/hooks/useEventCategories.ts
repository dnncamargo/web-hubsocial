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
    setValueColor,
  } = useSelectableStringSetting({
    documentId: 'userCategories',
    fieldName: 'category',
    errorLabel: 'nova categoria',
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
    setCategoryColor: setValueColor,
  }
}
