import { GoogleOAuthProvider } from '@react-oauth/google'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import { AuthProvider } from './components/auth/AuthProvider'
import { instance } from './config/instance'
import './globals.css'

document.title = instance.name
document.querySelector('meta[name="description"]')?.setAttribute('content', instance.description)

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="996833302397-gsksfg2ujfqgt27jg5ulti0ffrnmje9a.apps.googleusercontent.com">
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
