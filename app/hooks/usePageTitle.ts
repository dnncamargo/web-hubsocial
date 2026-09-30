import { useEffect } from 'react'
import { instance } from '../config/instance'
import { buildPageTitle, type PageTitleContext } from '../utils/pageTitle'

export { buildPageTitle, type PageTitleContext } from '../utils/pageTitle'

export function usePageTitle(context: PageTitleContext, detail?: string | null): void {
  useEffect(() => {
    document.title = buildPageTitle(instance.name, context, detail)
  }, [context, detail])
}
