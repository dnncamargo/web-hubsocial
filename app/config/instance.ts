const DEFAULT_INSTANCE_NAME = 'App'
const DEFAULT_INSTANCE_DESCRIPTION = 'Aplicação web'

export const instance = {
  name: process.env.NEXT_PUBLIC_INSTANCE_NAME?.trim() || DEFAULT_INSTANCE_NAME,
  description: process.env.NEXT_PUBLIC_INSTANCE_DESCRIPTION?.trim() || DEFAULT_INSTANCE_DESCRIPTION,
} as const
