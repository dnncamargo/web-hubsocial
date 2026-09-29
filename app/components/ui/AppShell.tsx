import { Outlet } from 'react-router'
import MainMenu from './MainMenu'
import WorkspaceHeader from './WorkspaceHeader'
import styles from './AppShell.module.css'

export default function AppShell() {
  return (
    <div className={styles.shell}>
      <MainMenu />
      <div className={styles.content}>
        <WorkspaceHeader />
        <Outlet />
      </div>
    </div>
  )
}
