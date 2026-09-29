import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
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
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

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
        >
          {createOptions.map((option) => (
            <button
              key={option.path}
              type="button"
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
