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
