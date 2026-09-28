'use client'

import { useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { LogOut } from 'lucide-react'

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
      onClick={handleLogout}
      className="flex items-center gap-2 px-3 rounded-md text-sm text-gray-600 hover:text-red-600 transition"
    >
      <LogOut className="w-5 h-5" />
      Sair
    </button>
  )
}
