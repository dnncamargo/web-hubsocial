'use client'

import { useEffect, useState } from 'react'
import { useAuth } from './AuthProvider'
import { useNavigate } from 'react-router'
import styles from './ProtectedRoute.module.css'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { uid, loading } = useAuth()
  const navigate = useNavigate()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (loading) return

    if (!uid) {
      navigate('/auth-login', { replace: true })
      return
    }

    setChecked(true)
  }, [loading, uid, navigate])

  if (loading || !checked) {
    return <div className={styles.loading} role="status">Verificando autenticação...</div>
  }

  return <>{children}</>
}
