import { useEffect, useState } from 'react'
import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Sun,
} from 'lucide-react'
import {
  getCurrentBrowserWeather,
  getWeatherConditionLabel,
  WeatherSnapshot,
} from '../../utils/weather'
import styles from './CurrentWeather.module.css'

const weatherIcons = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: CloudSnow,
  stormy: CloudLightning,
} as const

export default function CurrentWeather() {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)
  const [isUnavailable, setIsUnavailable] = useState(false)

  useEffect(() => {
    let isMounted = true

    getCurrentBrowserWeather()
      .then((snapshot) => {
        if (!isMounted) return
        setWeather(snapshot)
      })
      .catch(() => {
        if (!isMounted) return
        setIsUnavailable(true)
      })

    return () => {
      isMounted = false
    }
  }, [])

  if (!weather) {
    return (
      <span
        className={`${styles.weather} ${isUnavailable ? styles.unavailable : styles.loading}`}
        aria-label={isUnavailable ? 'Clima atual indisponível' : 'Consultando clima atual'}
        title={isUnavailable ? 'Clima atual indisponível' : 'Consultando clima atual'}
      >
        <Cloud className={styles.icon} aria-hidden="true" />
        <span className={styles.label}>
          {isUnavailable ? 'Clima indisponível' : 'Clima atual'}
        </span>
      </span>
    )
  }

  const Icon = weatherIcons[weather.condition]
  const conditionLabel = getWeatherConditionLabel(weather.condition)
  const temperature = `${Math.round(weather.temperatureC)}°`

  return (
    <span
      className={styles.weather}
      aria-label={`Clima atual: ${conditionLabel}, ${temperature}`}
      title={`Clima atual: ${conditionLabel}, ${temperature}`}
    >
      <Icon className={styles.icon} aria-hidden="true" />
      <span className={styles.temperature}>{temperature}</span>
      <span className={styles.separator} aria-hidden="true">·</span>
      <span className={styles.label}>{conditionLabel}</span>
    </span>
  )
}
