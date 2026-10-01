import { useEffect, useState } from 'react'
import { formatLocalDate } from '../utils/dateHelpers.ts'

function getNextCivilMidnightDelay(now: Date): number {
  const nextMidnight = new Date(now)
  nextMidnight.setHours(24, 0, 0, 0)
  return Math.max(1000, nextMidnight.getTime() - now.getTime() + 50)
}

export default function useCivilDate(): string {
  const [civilDate, setCivilDate] = useState(() => formatLocalDate(new Date()))

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>

    const refresh = () => {
      const nextCivilDate = formatLocalDate(new Date())
      setCivilDate(previous => previous === nextCivilDate ? previous : nextCivilDate)
    }

    const scheduleMidnightRefresh = () => {
      timeoutId = setTimeout(() => {
        refresh()
        scheduleMidnightRefresh()
      }, getNextCivilMidnightDelay(new Date()))
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    scheduleMidnightRefresh()

    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimeout(timeoutId)
    }
  }, [])

  return civilDate
}
