'use client'

import { useGoogleLogin } from '@react-oauth/google'
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { useNavigate } from 'react-router'
import { useAuth } from '../components/auth/AuthProvider'
import { instance } from '../config/instance'
import { auth } from '../utils/firebaseConfig'
import './login.css'

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
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title title-logo">{instance.name}</h1>

        <button
          type="button"
          onClick={() => loginWithGoogle()}
          className="group relative w-full overflow-hidden rounded-md bg-blue-600 px-6 py-3 text-white transition-colors duration-1000 hover:bg-red-600 focus:outline-none"
        >
          <span className="relative z-10">Entrar com Google</span>
          <div className="absolute inset-x-0 bottom-0 h-0 text-white bg-red-600 transition-all duration-300 group-hover:h-full"></div>
        </button>

        <p className="text-gray-300 sm:text-sm text-center mt-4">version 2.0.1</p>
      </div>
    </div>
  )
}
