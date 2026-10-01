import { JSX, useEffect, useRef, useState, type RefObject } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, House, ListTodo, Users } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { useTheme } from '../../hooks/useTheme'
import { getTodayISO } from '../../utils/dateHelpers'
import { formatDate } from '../../utils/datePresentation'
import LogoutButton from './LogoutButton'
import ImportContactsModal from './ImportContactsModal'
import CurrentWeather from './CurrentWeather'
import QuickCreateMenu from './QuickCreateMenu'
import { useOutsideDismiss } from '../../hooks/useOutsideDismiss'
import { instance } from '../../config/instance'
import styles from './MainMenu.module.css'

const navItems = [
  { path: '/dashboard', label: 'Hoje', icon: House },
  { path: '/events-history', label: 'Eventos', icon: CalendarDays },
  { path: '/tasks-list', label: 'Tarefas', icon: ListTodo },
  { path: '/people-directory', label: 'Pessoas', icon: Users },
] as const

export default function MainMenu(): JSX.Element {
  const { uid, user, loading } = useAuth()
  const { theme, selectTheme } = useTheme()
  const isAuthenticated = !loading && !!uid
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [showImportContacts, setShowImportContacts] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const desktopAccountButtonRef = useRef<HTMLButtonElement>(null)
  const mobileAccountButtonRef = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    setAvatarFailed(false)
  }, [user?.name, user?.picture])

  useEffect(() => {
    setIsAccountOpen(false)
  }, [pathname])

  useOutsideDismiss({
    open: isAccountOpen,
    insideRefs: [
      accountMenuRef,
      desktopAccountButtonRef,
      mobileAccountButtonRef,
    ],
    onDismiss: () => setIsAccountOpen(false),
  })

  const isActive = (path: string) =>
    path === '/dashboard'
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`)

  const avatarInitial = user?.name.trim().charAt(0).toUpperCase() || 'U'
  const formattedDate = formatDate(getTodayISO())

  const renderNavLink = ({ path, label, icon: Icon }: (typeof navItems)[number]) => (
    <Link
      key={path}
      to={path}
      className={`${styles.navLink} ${isActive(path) ? styles.navLinkActive : ''}`}
      aria-current={isActive(path) ? 'page' : undefined}
      onClick={() => setIsAccountOpen(false)}
    >
      <Icon className={styles.navIcon} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  )

  const accountButton = (
    className: string,
    buttonRef: RefObject<HTMLButtonElement | null>,
  ) => (
    <button
      type="button"
      ref={buttonRef}
      className={className}
      onClick={() => setIsAccountOpen((open) => !open)}
      aria-expanded={isAccountOpen}
      aria-controls="account-menu"
      aria-label="Abrir menu da conta"
    >
      {user?.picture && !avatarFailed ? (
        <img
          src={user.picture}
          alt=""
          className={styles.avatarImage}
          onError={() => setAvatarFailed(true)}
        />
      ) : (
        <span className={styles.avatarFallback} aria-hidden="true">
          {avatarInitial}
        </span>
      )}
      <span className={styles.accountLabel}>Conta</span>
    </button>
  )

  if (!isAuthenticated) {
    return <div className={styles.loading}>Carregando navegação...</div>
  }

  return (
    <>
      <aside className={styles.sidebar} aria-label="Navegação principal">
        <Link to="/dashboard" className={styles.brand}>
          {instance.name}
        </Link>

        <nav className={styles.desktopNav}>
          {navItems.map(renderNavLink)}
        </nav>

        <div className={styles.sidebarAccount}>
          {accountButton(styles.accountButton, desktopAccountButtonRef)}
        </div>
      </aside>

      <header className={styles.mobileHeader}>
        <Link to="/dashboard" className={styles.mobileContext}>
          <span className={styles.mobileEyebrow}>Hoje</span>
          <span className={styles.mobileDate}>{formattedDate}</span>
        </Link>
        <div className={styles.mobileActions}>
          <CurrentWeather />
          {accountButton(styles.mobileAccountButton, mobileAccountButtonRef)}
        </div>
      </header>

      <nav className={styles.bottomNav} aria-label="Navegação principal">
        {navItems.slice(0, 2).map(renderNavLink)}
        <QuickCreateMenu variant="mobile" />
        {navItems.slice(2).map(renderNavLink)}
      </nav>

      <AnimatePresence>
        {isAccountOpen && (
          <motion.div
            id="account-menu"
            ref={accountMenuRef}
            className={styles.accountMenu}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            <button
              type="button"
              className={styles.accountAction}
              onClick={() => {
                setIsAccountOpen(false)
                setShowImportContacts(true)
              }}
            >
              Importar contatos
            </button>

            <a
              href="https://github.com/dnncamargo/web-hubsocial"
              className={styles.accountAction}
              target="_blank"
              rel="noopener noreferrer"
            >
              Repositório
            </a>

            <div className={styles.themeControl} role="group" aria-label="Tema da aplicação">
              <span className={styles.themeLabel}>Tema</span>
              <div className={styles.themeOptions}>
                <button
                  type="button"
                  className={theme === 'light'
                    ? `${styles.themeOption} ${styles.themeOptionActive}`
                    : styles.themeOption}
                  aria-pressed={theme === 'light'}
                  onClick={() => selectTheme('light')}
                >
                  Claro
                </button>
                <button
                  type="button"
                  className={theme === 'dark'
                    ? `${styles.themeOption} ${styles.themeOptionActive}`
                    : styles.themeOption}
                  aria-pressed={theme === 'dark'}
                  onClick={() => selectTheme('dark')}
                >
                  Escuro
                </button>
              </div>
            </div>

            <div className={styles.logoutRow}>
              <LogoutButton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showImportContacts && (
        <ImportContactsModal
          isOpen={showImportContacts}
          onClose={() => setShowImportContacts(false)}
        />
      )}
    </>
  )
}
