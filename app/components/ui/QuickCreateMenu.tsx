import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Plus } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { useOutsideDismiss } from '../../hooks/useOutsideDismiss'
import styles from './QuickCreateMenu.module.css'

type QuickCreateVariant = 'desktop' | 'mobile'

interface QuickCreateMenuProps {
  variant: QuickCreateVariant
}

const createOptions = [
  { label: 'Nova tarefa', path: '/tasks-list?create=task' },
  { label: 'Novo evento', path: '/events-history?create=event' },
  { label: 'Nova pessoa', path: '/people-directory?create=person' },
] as const

export default function QuickCreateMenu({ variant }: QuickCreateMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuItemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  useEffect(() => {
    if (isOpen) menuItemRefs.current[0]?.focus()
  }, [isOpen])

  useOutsideDismiss({
    open: isOpen,
    insideRefs: [rootRef],
    onDismiss: () => setIsOpen(false),
  })

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = menuItemRefs.current.findIndex(
      (item) => item === document.activeElement,
    )

    if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      triggerRef.current?.focus()
      return
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const targetIndex = event.key === 'Home' ? 0 : createOptions.length - 1
      menuItemRefs.current[targetIndex]?.focus()
      return
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

    event.preventDefault()
    const direction = event.key === 'ArrowDown' ? 1 : -1
    const nextIndex = (currentIndex + direction + createOptions.length) % createOptions.length
    menuItemRefs.current[nextIndex]?.focus()
  }

  const handleCreate = (path: string) => {
    setIsOpen(false)
    navigate(path)
  }

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${variant === 'mobile' ? styles.mobile : styles.desktop}`}
    >
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Criar novo item"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={`quick-create-menu-${variant}`}
      >
        <Plus className={styles.icon} aria-hidden="true" />
        <span className={styles.triggerLabel}>{variant === 'mobile' ? 'Criar' : 'Criar novo'}</span>
      </button>

      {isOpen && (
        <div
          id={`quick-create-menu-${variant}`}
          className={styles.menu}
          role="menu"
          aria-label="Criar novo item"
          onKeyDown={handleMenuKeyDown}
        >
          {createOptions.map((option, index) => (
            <button
              key={option.path}
              type="button"
              ref={(element) => {
                menuItemRefs.current[index] = element
              }}
              className={styles.menuItem}
              role="menuitem"
              onClick={() => handleCreate(option.path)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
