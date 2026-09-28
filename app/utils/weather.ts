import { WeatherCondition } from '../types/automation'

const WEATHER_ENDPOINT = 'https://api.open-meteo.com/v1/forecast'
const CACHE_DURATION_MS = 15 * 60 * 1000

export const weatherConditions: Array<{
  value: WeatherCondition
  label: string
}> = [
  { value: 'sunny', label: 'Ensolarado' },
  { value: 'cloudy', label: 'Nublado' },
  { value: 'rainy', label: 'Chuvoso' },
  { value: 'snowy', label: 'Nevando' },
  { value: 'stormy', label: 'Tempestade' },
]

export function getWeatherConditionLabel(condition: WeatherCondition): string {
  return (
    weatherConditions.find((option) => option.value === condition)?.label ??
    condition
  )
}

export interface WeatherSnapshot {
  condition: WeatherCondition
  temperatureC: number
  weatherCode: number
  observedAt: string
  provider: 'Open-Meteo'
}

interface OpenMeteoCurrentResponse {
  current?: {
    temperature_2m?: number
    weather_code?: number
    time?: string
  }
}

let cachedWeather:
  | {
      snapshot: WeatherSnapshot
      expiresAt: number
    }
  | undefined

export function mapWeatherCodeToCondition(
  weatherCode: number,
): WeatherCondition | null {
  if (weatherCode === 0 || weatherCode === 1) return 'sunny'

  if ([2, 3, 45, 48].includes(weatherCode)) return 'cloudy'

  if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(
      weatherCode,
    )
  ) {
    return 'rainy'
  }

  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return 'snowy'

  if ([95, 96, 97, 99].includes(weatherCode)) return 'stormy'

  return null
}

function getBrowserCoordinates(): Promise<GeolocationCoordinates> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('Geolocalização indisponível neste navegador.'))
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => reject(new Error('Não foi possível obter a localização atual.')),
      {
        enableHighAccuracy: false,
        maximumAge: CACHE_DURATION_MS,
        timeout: 8000,
      },
    )
  })
}

async function fetchWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherSnapshot> {
  const url = new URL(WEATHER_ENDPOINT)
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('current', 'temperature_2m,weather_code')
  url.searchParams.set('timezone', 'auto')

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Falha ao consultar o clima atual.')
  }

  const data = (await response.json()) as OpenMeteoCurrentResponse
  const weatherCode = data.current?.weather_code
  const temperatureC = data.current?.temperature_2m
  const observedAt = data.current?.time

  if (
    weatherCode === undefined ||
    temperatureC === undefined ||
    observedAt === undefined
  ) {
    throw new Error('Resposta meteorológica incompleta.')
  }

  const condition = mapWeatherCodeToCondition(weatherCode)
  if (!condition) {
    throw new Error(`Código meteorológico não suportado: ${weatherCode}`)
  }

  return {
    condition,
    temperatureC,
    weatherCode,
    observedAt,
    provider: 'Open-Meteo',
  }
}

export async function getCurrentBrowserWeather(): Promise<WeatherSnapshot> {
  if (cachedWeather && cachedWeather.expiresAt > Date.now()) {
    return cachedWeather.snapshot
  }

  const coordinates = await getBrowserCoordinates()
  const snapshot = await fetchWeather(
    coordinates.latitude,
    coordinates.longitude,
  )

  cachedWeather = {
    snapshot,
    expiresAt: Date.now() + CACHE_DURATION_MS,
  }

  return snapshot
}
