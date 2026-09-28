'use client'

import { useEffect, useState } from 'react'
import { useAuth } from './AuthProvider'
import { useNavigate } from 'react-router'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { uid, googleAccessToken, loading } = useAuth()
  const navigate = useNavigate()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    console.log('[ProtectedRoute] ⏳ loading:', loading)
    console.log('[ProtectedRoute] 🪪 uid:', uid)

    if (loading) return

    if (!googleAccessToken || !uid) {
      console.warn('[ProtectedRoute] ❌ Sessão inválida — redirecionando para login...')
      navigate('/auth-login', { replace: true })
      return
    }

    console.log('[ProtectedRoute] ✅ Sessão válida com token e uid — prosseguindo')
    setChecked(true)
  }, [loading, uid, googleAccessToken, navigate])

  if (loading || !checked) {
    return <div className="animate-pulse text-gray-500 m-6">Verificando autenticação...</div>
  }

  return <>{children}</>
}
