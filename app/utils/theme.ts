export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'themePreference'

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

export function resolveTheme(savedTheme: string | null | undefined, systemPrefersDark: boolean): Theme {
  return isTheme(savedTheme) ? savedTheme : systemPrefersDark ? 'dark' : 'light'
}

export function readStoredTheme(storage?: Pick<Storage, 'getItem'>): Theme | null {
  try {
    const source = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined)
    const value = source?.getItem(THEME_STORAGE_KEY)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

export function persistTheme(theme: Theme, storage?: Pick<Storage, 'setItem'>): void {
  try {
    const source = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined)
    source?.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // A blocked storage must not prevent theme changes for this session.
  }
}

export function applyTheme(
  theme: Theme,
  root?: Pick<HTMLElement, 'dataset' | 'style'>,
): void {
  const target = root ?? (typeof document !== 'undefined' ? document.documentElement : undefined)
  if (!target) return

  target.dataset.theme = theme
  target.style.colorScheme = theme
}

export function getSystemTheme(): Theme {
  const prefersDark = typeof window !== 'undefined'
    && window.matchMedia('(prefers-color-scheme: dark)').matches

  return prefersDark ? 'dark' : 'light'
}
