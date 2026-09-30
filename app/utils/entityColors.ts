export type EntityColorMap = Readonly<Record<string, string>>

const HEX_COLOR_PATTERN = /^#[\da-f]{3,4}$|^#[\da-f]{6}$|^#[\da-f]{8}$/i

export function sanitizeEntityColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  const color = value.trim()
  return HEX_COLOR_PATTERN.test(color) ? color : undefined
}

export function normalizeEntityColors(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }

  return Object.entries(value).reduce<Record<string, string>>((colors, [name, value]) => {
    const color = sanitizeEntityColor(value)
    if (color) colors[name] = color
    return colors
  }, {})
}

export function getEntityColor(
  colors: EntityColorMap | undefined,
  name: string,
): string | undefined {
  return colors?.[name]
}
