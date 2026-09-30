export type PageTitleContext = 'Hoje' | 'Eventos' | 'Tarefas' | 'Pessoas' | 'Login' | 'Evento' | 'Pessoa'

export function buildPageTitle(
  instanceName: string,
  context: PageTitleContext,
  detail?: string | null,
): string {
  const baseTitle = `${instanceName.trim()} [${context}]`
  const normalizedDetail = typeof detail === 'string' ? detail.trim() : ''

  return normalizedDetail ? `${baseTitle} ${normalizedDetail}` : baseTitle
}
