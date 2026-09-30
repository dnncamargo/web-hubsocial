import { useCallback, useEffect, useState } from 'react'
import {
  applyTheme,
  getSystemTheme,
  persistTheme,
  readStoredTheme,
  resolveTheme,
  type Theme,
} from '../utils/theme'

function getInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    const attributeTheme = document.documentElement.dataset.theme
    if (attributeTheme === 'light' || attributeTheme === 'dark') {
      return attributeTheme
    }
  }

  return resolveTheme(readStoredTheme(), getSystemTheme() === 'dark')
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (readStoredTheme()) return

      const nextTheme = event.matches ? 'dark' : 'light'
      applyTheme(nextTheme)
      setTheme(nextTheme)
    }

    mediaQuery.addEventListener?.('change', handleSystemThemeChange)
    return () => mediaQuery.removeEventListener?.('change', handleSystemThemeChange)
  }, [])

  const selectTheme = useCallback((nextTheme: Theme) => {
    persistTheme(nextTheme)
    applyTheme(nextTheme)
    setTheme(nextTheme)
  }, [])

  return { theme, selectTheme }
}
