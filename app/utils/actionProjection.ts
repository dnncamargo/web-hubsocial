import type {
  ActionHorizon,
  ActionProjection,
  ActionProjectionItem,
} from '../types/actions.ts'
import { evaluateAutomation } from './automation.ts'
import type { AutomationEventContext } from './automation.ts'
import type { AutomationRuleSet, WeatherCondition } from '../types/automation.ts'

export interface PlannedActionSource {
  item: Omit<ActionProjectionItem, 'automation'>
  automation?: AutomationRuleSet
}

export type ActionSourcesByHorizon = ReadonlyArray<
  readonly [ActionHorizon, readonly PlannedActionSource[]]
>

export interface ActionProjectionContext {
  referenceDate: Date
  events: AutomationEventContext[]
  weatherCondition?: WeatherCondition
}

export function hasWeatherRules(
  sourcesByHorizon: ActionSourcesByHorizon,
): boolean {
  return sourcesByHorizon.some(([, sources]) =>
    sources.some((source) =>
      source.automation?.rules.some((rule) => rule.type === 'weather'),
    ),
  )
}

export function projectActionSources(
  sourcesByHorizon: ActionSourcesByHorizon,
  context: ActionProjectionContext,
): ActionProjection {
  const projectedTaskKeys = new Set<string>()
  const projection: ActionProjection = {
    day: [],
    week: [],
    month: [],
  }

  for (const [horizon, sources] of sourcesByHorizon) {
    const visibleSources = sources.filter((source) => {
      if (source.item.sourceType !== 'task') return true
      if (projectedTaskKeys.has(source.item.key)) return false

      projectedTaskKeys.add(source.item.key)
      return true
    })

    projection[horizon] = visibleSources
      .map(({ item, automation }) => ({
        ...item,
        automation: evaluateAutomation(automation, {
          referenceDate: context.referenceDate,
          events: context.events,
          ...(context.weatherCondition
            ? { weather: { condition: context.weatherCondition } }
            : {}),
        }),
      }))
      .sort((a, b) => {
        if (a.automation.highlighted !== b.automation.highlighted) {
          return a.automation.highlighted ? -1 : 1
        }

        if (a.inProgress !== b.inProgress) {
          return a.inProgress ? -1 : 1
        }

        const timeOrder = (a.time ?? '99:99').localeCompare(b.time ?? '99:99')
        return timeOrder !== 0 ? timeOrder : a.title.localeCompare(b.title, 'pt-BR')
      })
  }

  return projection
}
