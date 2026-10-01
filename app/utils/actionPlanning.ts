import { format, startOfWeek } from 'date-fns'
import type { ActionHorizon, ActionPlanning } from '../types/actions'

export interface ActionPeriodKeys {
  day: string
  week: string
  month: string
}

export function getActionPeriodKeys(referenceDate: Date = new Date()): ActionPeriodKeys {
  return {
    day: format(referenceDate, 'yyyy-MM-dd'),
    week: format(startOfWeek(referenceDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    month: format(referenceDate, 'yyyy-MM'),
  }
}

export function isPlannedForActionHorizon(
  planning: ActionPlanning | undefined,
  horizon: ActionHorizon,
  referenceDate: Date = new Date(),
): boolean {
  if (!planning) return false

  const period = getActionPeriodKeys(referenceDate)
  return planning[horizon] === period[horizon]
}

export function setActionPlanningHorizon(
  planning: ActionPlanning | undefined,
  horizon: ActionHorizon,
  selected: boolean,
  referenceDate: Date = new Date(),
): ActionPlanning {
  const nextPlanning: ActionPlanning = { ...planning }

  if (selected) {
    const period = getActionPeriodKeys(referenceDate)
    nextPlanning[horizon] = period[horizon]
  } else {
    delete nextPlanning[horizon]
  }

  return nextPlanning
}
