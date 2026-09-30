import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { mapFirebaseUserToAuthUser } from './authProfile.ts'

const appRoot = fileURLToPath(new URL('../', import.meta.url))
const readAppFile = (...parts) => readFileSync(join(appRoot, ...parts), 'utf8')

const authProvider = readAppFile('components', 'auth', 'AuthProvider.tsx')
const loginPage = readAppFile('auth-login', 'page.tsx')
const protectedRoute = readAppFile('components', 'auth', 'ProtectedRoute.tsx')
const logoutButton = readAppFile('components', 'ui', 'LogoutButton.tsx')
const mainMenu = readAppFile('components', 'ui', 'MainMenu.tsx')

const firebaseUser = {
  displayName: 'Ana Silva',
  email: 'ana@example.com',
  photoURL: 'https://example.com/firebase-photo.jpg',
  providerData: [
    {
      providerId: 'google.com',
      displayName: 'Ana Silva via Google',
      email: 'ana@example.com',
      photoURL: 'https://example.com/google-photo.jpg',
    },
  ],
}

test('maps Firebase identity to the canonical app user', () => {
  assert.deepEqual(mapFirebaseUserToAuthUser(firebaseUser), {
    name: 'Ana Silva',
    email: 'ana@example.com',
    picture: 'https://example.com/firebase-photo.jpg',
  })
})

test('keeps the provider photo after reload when Firebase photoURL is absent', () => {
  const withoutTopLevelPhoto = {
    ...firebaseUser,
    photoURL: null,
  }

  assert.equal(
    mapFirebaseUserToAuthUser(withoutTopLevelPhoto).picture,
    'https://example.com/google-photo.jpg',
  )
  assert.deepEqual(
    mapFirebaseUserToAuthUser(withoutTopLevelPhoto),
    mapFirebaseUserToAuthUser(withoutTopLevelPhoto),
  )
})

test('uses safe identity fallbacks when no photo is available', () => {
  assert.deepEqual(mapFirebaseUserToAuthUser({
    displayName: null,
    email: 'fallback@example.com',
    photoURL: null,
    providerData: [],
  }), {
    name: 'fallback@example.com',
    email: 'fallback@example.com',
    picture: '',
  })
})

test('Firebase uid/session state does not depend on the Google access token', () => {
  assert.match(authProvider, /onAuthStateChanged\(auth, firebaseUser =>/)
  assert.match(protectedRoute, /!loading && !uid/)
  assert.match(mainMenu, /const isAuthenticated = !loading && !!uid/)
  assert.doesNotMatch(mainMenu, /googleAccessToken/)
})

test('logout clears Google authorization without defining Firebase identity', () => {
  assert.match(logoutButton, /await signOut\(auth\)/)
  assert.match(logoutButton, /setGoogleAccessToken\(null\)/)
  assert.match(authProvider, /if \(!firebaseUser\) \{\s*updateGoogleAccessToken\(null\)/)
})

test('login navigation waits for the Firebase observer', () => {
  assert.match(loginPage, /if \(!loading && uid\)/)
  assert.match(loginPage, /await signInWithCredential\(auth, credential\)/)
  assert.doesNotMatch(
    loginPage,
    /signInWithCredential\(auth, credential\)[\s\S]{0,160}navigate\('\/'\)/,
  )
})
