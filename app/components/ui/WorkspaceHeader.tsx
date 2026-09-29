import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import CurrentWeather from './CurrentWeather'
import QuickCreateMenu from './QuickCreateMenu'
import styles from './WorkspaceHeader.module.css'

export default function WorkspaceHeader() {
  const dateText = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })
  const formattedDate = dateText.charAt(0).toUpperCase() + dateText.slice(1)

  return (
    <header className={styles.header} aria-label="Contexto do workspace">
      <div className={styles.context}>
        <span className={styles.eyebrow}>Hoje</span>
        <span className={styles.date}>{formattedDate}</span>
      </div>
      <div className={styles.actions}>
        <CurrentWeather />
        <QuickCreateMenu variant="desktop" />
      </div>
    </header>
  )
}
