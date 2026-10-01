import { useEffect, useRef, type RefObject } from 'react'

export type OutsideDismissRef = RefObject<HTMLElement | null>

interface UseOutsideDismissOptions {
  open: boolean
  insideRefs: ReadonlyArray<OutsideDismissRef>
  onDismiss: () => void
  disabled?: boolean
}

/**
 * Calls the consumer's normal dismiss action when a pointer starts outside
 * every region that belongs to an open transient surface.
 *
 * Multiple refs are intentional: a trigger, a surface, and a portalled child
 * can all be part of the same interactive region.
 */
export function useOutsideDismiss({
  open,
  insideRefs,
  onDismiss,
  disabled = false,
}: UseOutsideDismissOptions): void {
  const refsRef = useRef(insideRefs)
  const onDismissRef = useRef(onDismiss)

  useEffect(() => {
    refsRef.current = insideRefs
  }, [insideRefs])

  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    if (!open || disabled) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return

      const isInside = refsRef.current.some((ref) => ref.current?.contains(target))
      if (!isInside) onDismissRef.current()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [disabled, open])
}
