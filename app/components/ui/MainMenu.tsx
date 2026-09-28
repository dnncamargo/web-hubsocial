import { JSX, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, House, ListTodo, Users } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import LogoutButton from './LogoutButton'
import ImportContactsModal from './ImportContactsModal'
import { instance } from '../../config/instance'
import styles from './MainMenu.module.css'

const navItems = [
  { path: '/dashboard', label: 'Hoje', icon: House },
  { path: '/events-history', label: 'Eventos', icon: CalendarDays },
  { path: '/tasks-list', label: 'Tarefas', icon: ListTodo },
  { path: '/people-directory', label: 'Pessoas', icon: Users },
] as const

export default function MainMenu(): JSX.Element {
  const { uid, googleAccessToken, user } = useAuth()
  const isAuthenticated = !!uid && !!googleAccessToken
  const [userPicture, setUserPicture] = useState<string | null>(null)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [showImportContacts, setShowImportContacts] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const savedUserInfo = localStorage.getItem('userInfo')

    if (!savedUserInfo) return

    try {
      const storedUser = JSON.parse(savedUserInfo)
      if (storedUser.picture) {
        setUserPicture(storedUser.picture)
      }
    } catch (error) {
      console.warn('[MainMenu] Falha ao carregar imagem de perfil do localStorage:', error)
    }
  }, [])

  useEffect(() => {
    setIsAccountOpen(false)
  }, [pathname])

  const isActive = (path: string) =>
    path === '/dashboard'
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`)

  const avatarUrl =
    userPicture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name?.[0] || 'U')}&background=ccc&color=000`

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

  const accountButton = (className: string) => (
    <button
      type="button"
      className={className}
      onClick={() => setIsAccountOpen((open) => !open)}
      aria-expanded={isAccountOpen}
      aria-controls="account-menu"
      aria-label="Abrir menu da conta"
    >
      <img src={avatarUrl} alt="" className={styles.avatarImage} />
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
          {accountButton(styles.accountButton)}
        </div>
      </aside>

      <header className={styles.mobileHeader}>
        <Link to="/dashboard" className={styles.mobileBrand}>
          {instance.name}
        </Link>
        {accountButton(styles.mobileAccountButton)}
      </header>

      <nav className={styles.bottomNav} aria-label="Navegação principal">
        {navItems.map(renderNavLink)}
      </nav>

      <AnimatePresence>
        {isAccountOpen && (
          <motion.div
            id="account-menu"
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
