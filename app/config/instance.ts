const DEFAULT_INSTANCE_NAME = 'App'
const DEFAULT_INSTANCE_DESCRIPTION = 'Aplicação web'

export const instance = {
  name: import.meta.env.NEXT_PUBLIC_INSTANCE_NAME?.trim() || DEFAULT_INSTANCE_NAME,
  description: import.meta.env.NEXT_PUBLIC_INSTANCE_DESCRIPTION?.trim() || DEFAULT_INSTANCE_DESCRIPTION,
} as const
