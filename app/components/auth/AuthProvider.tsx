'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../utils/firebaseConfig'

interface AuthUser {
  name: string
  email: string
  picture: string
}

interface AuthContextType {
  user: AuthUser | null
  uid: string | null
  loading: boolean
  googleAccessToken: string | null
  setGoogleAccessToken: (token: string | null) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  uid: null,
  loading: true,
  googleAccessToken: null,
  setGoogleAccessToken: () => { },
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null)
  const [uid, setUid] = useState<string | null>(null)

  const updateGoogleAccessToken = (token: string | null) => {
    setGoogleAccessToken(token)

    if (token) {
      localStorage.setItem('googleAccessToken', token)
    } else {
      localStorage.removeItem('googleAccessToken')
    }
  }

  useEffect(() => {
    const storedToken = localStorage.getItem('googleAccessToken')
    if (storedToken) {
      setGoogleAccessToken(storedToken)
    }

    const unsubscribe = onAuthStateChanged(auth, firebaseUser => {
      setUid(firebaseUser?.uid ?? null)
      setUser(firebaseUser
        ? {
            name: firebaseUser.displayName || firebaseUser.email || '',
            email: firebaseUser.email || '',
            picture: firebaseUser.photoURL || '',
          }
        : null)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        uid,
        loading,
        googleAccessToken,
        setGoogleAccessToken: updateGoogleAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

