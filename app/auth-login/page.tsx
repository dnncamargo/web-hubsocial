'use client'

import { useGoogleLogin } from '@react-oauth/google'
import { useEffect } from 'react'
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { useNavigate } from 'react-router'
import { useAuth } from '../components/auth/AuthProvider'
import { usePageTitle } from '../hooks/usePageTitle'
import { instance } from '../config/instance'
import { auth } from '../utils/firebaseConfig'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { uid, loading, setGoogleAccessToken } = useAuth()
  usePageTitle('Login')

  useEffect(() => {
    if (!loading && uid) {
      navigate('/', { replace: true })
    }
  }, [loading, uid, navigate])

  const loginWithGoogle = useGoogleLogin({
    scope: [
      'openid',
      'profile',
      'email',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/contacts.readonly',
    ].join(' '),
    onSuccess: async tokenResponse => {
      const accessToken = tokenResponse.access_token

      try {
        const credential = GoogleAuthProvider.credential(null, accessToken)
        await signInWithCredential(auth, credential)

        setGoogleAccessToken(accessToken)
      } catch (error) {
        console.error('Erro ao autenticar com Google/Firebase:', error)
      }
    },
    onError: errorResponse => {
      console.error('Erro no login Google:', errorResponse)
    },
  })

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="login-title">
        <div className={styles.brandBlock}>
          <h1 id="login-title" className={styles.brand}>{instance.name}</h1>
          <p className={styles.description}>{instance.description}</p>
        </div>

        <button
          type="button"
          onClick={() => loginWithGoogle()}
          className={styles.googleButton}
        >
          Entrar com Google
        </button>

        <p className={styles.version}>Versão 2.0.1</p>
      </section>
    </main>
  )
}
