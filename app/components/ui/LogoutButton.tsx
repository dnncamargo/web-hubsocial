'use client'

import { useNavigate } from 'react-router';
import { signOut } from 'firebase/auth';
import { useAuth } from '../auth/AuthProvider';
import { auth } from '../../utils/firebaseConfig';
import { LogOut } from 'lucide-react'
import styles from './MainMenu.module.css'

export default function LogoutButton() {
  const { setGoogleAccessToken } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth)
      setGoogleAccessToken(null)
      navigate('/auth-login')
    } catch (error) {
      console.error('Erro ao sair da conta Firebase:', error)
    }
  }
  
  
  return (
    <button
      type="button"
      onClick={handleLogout}
      className={styles.logoutButton}
    >
      <LogOut width={18} height={18} aria-hidden="true" />
      Sair
    </button>
  )
}
