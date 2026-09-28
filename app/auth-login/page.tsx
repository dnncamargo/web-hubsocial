'use client'

import { useGoogleLogin } from '@react-oauth/google'
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { useNavigate } from 'react-router'
import { useAuth } from '../components/auth/AuthProvider'
import { instance } from '../config/instance'
import { auth } from '../utils/firebaseConfig'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setGoogleAccessToken, setUid } = useAuth()

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
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!res.ok) {
          throw new Error(`Falha ao buscar perfil Google: ${res.status}`)
        }

        const userInfo = await res.json()

        localStorage.setItem('googleAccessToken', accessToken)
        localStorage.setItem('userInfo', JSON.stringify(userInfo))
        setGoogleAccessToken(accessToken)

        const credential = GoogleAuthProvider.credential(null, accessToken)
        const userCredential = await signInWithCredential(auth, credential)

        localStorage.setItem('firebaseUid', userCredential.user.uid)
        setUid(userCredential.user.uid)

        navigate('/')
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
