export type CreationDraftLifecycleState = {
  isOpen: boolean
  hasMounted: boolean
  revision: number
}

export type CreationDraftLifecycleAction =
  | { type: 'open' }
  | { type: 'dismiss' }
  | { type: 'discard' }

export const initialCreationDraftLifecycleState: CreationDraftLifecycleState = {
  isOpen: false,
  hasMounted: false,
  revision: 0,
}

export function reduceCreationDraftLifecycle(
  state: CreationDraftLifecycleState,
  action: CreationDraftLifecycleAction,
): CreationDraftLifecycleState {
  switch (action.type) {
    case 'open':
      return { ...state, isOpen: true, hasMounted: true }
    case 'dismiss':
      return { ...state, isOpen: false }
    case 'discard':
      return {
        ...state,
        isOpen: false,
        revision: state.revision + 1,
      }
  }
}
