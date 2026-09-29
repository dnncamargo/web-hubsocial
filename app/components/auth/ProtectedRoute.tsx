'use client'

import { useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { useNavigate } from 'react-router'
import styles from './ProtectedRoute.module.css'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { uid, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !uid) {
      navigate('/auth-login', { replace: true })
    }
  }, [loading, uid, navigate])

  if (loading || !uid) {
    return <div className={styles.loading} role="status">Verificando autenticação...</div>
  }

  return <>{children}</>
}
