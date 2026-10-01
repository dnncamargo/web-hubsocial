export function normalizeSelectableValue(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const normalized = value.trim()
  return normalized || null
}

export function normalizeSelectableValues(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return Array.from(new Set(
    value
      .map(normalizeSelectableValue)
      .filter((item): item is string => item !== null),
  ))
}

function sameSelectableValueSet(
  first: readonly string[],
  second: readonly string[],
): boolean {
  const firstSet = new Set(first)
  const secondSet = new Set(second)

  return firstSet.size === secondSet.size
    && [...firstSet].every(value => secondSet.has(value))
}

export function normalizeSelectableSelection(
  value: unknown,
  availableValues?: readonly string[],
): string[] {
  const selectedValues = normalizeSelectableValues(value)
  if (!availableValues || availableValues.length === 0) {
    return selectedValues
  }

  const knownValues = normalizeSelectableValues(availableValues)
  const knownValueSet = new Set(knownValues)
  const knownSelectedValues = selectedValues.filter(value => knownValueSet.has(value))

  return sameSelectableValueSet(knownSelectedValues, knownValues)
    ? []
    : knownSelectedValues
}

export function appendSelectableValue(
  values: readonly string[],
  value: unknown,
): string[] {
  const normalizedValue = normalizeSelectableValue(value)
  const normalizedValues = normalizeSelectableValues(values)

  if (!normalizedValue || normalizedValues.includes(normalizedValue)) {
    return normalizedValues
  }

  return [...normalizedValues, normalizedValue]
}

export function removeSelectableValue(
  values: readonly string[],
  value: unknown,
): string[] {
  const normalizedValue = normalizeSelectableValue(value)
  const normalizedValues = normalizeSelectableValues(values)

  if (!normalizedValue) return normalizedValues

  return normalizedValues.filter(item => item !== normalizedValue)
}

export function buildSelectableSettingUpdate(
  fieldName: string,
  values: readonly string[],
): Record<string, string[]> {
  return { [fieldName]: normalizeSelectableValues(values) }
}
