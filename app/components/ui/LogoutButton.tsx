'use client'

import { useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { LogOut } from 'lucide-react'
import styles from './MainMenu.module.css'

export default function LogoutButton() {
  const { setUid, setUser, setGoogleAccessToken } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    setGoogleAccessToken(null)
    setUid(null)
    setUser(null)
    localStorage.removeItem('googleAccessToken')
    localStorage.removeItem('firebaseUid')
    localStorage.removeItem('userInfo')
    navigate('/auth-login'); // Redireciona
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
