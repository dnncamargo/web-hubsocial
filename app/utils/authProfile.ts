import type { User } from 'firebase/auth'

export interface AuthUser {
  name: string
  email: string
  picture: string
}

type FirebaseUserIdentity = Pick<
  User,
  'displayName' | 'email' | 'photoURL' | 'providerData'
>

export function mapFirebaseUserToAuthUser(
  firebaseUser: FirebaseUserIdentity,
): AuthUser {
  const providers = firebaseUser.providerData ?? []
  const googleProvider = providers.find(
    (provider) => provider.providerId === 'google.com',
  )
  const providerWithPhoto = googleProvider?.photoURL
    ? googleProvider
    : providers.find((provider) => provider.photoURL)
  const providerWithName = googleProvider?.displayName
    ? googleProvider
    : providers.find((provider) => provider.displayName)
  const providerWithEmail = googleProvider?.email
    ? googleProvider
    : providers.find((provider) => provider.email)

  return {
    name:
      firebaseUser.displayName
      || providerWithName?.displayName
      || firebaseUser.email
      || providerWithEmail?.email
      || '',
    email: firebaseUser.email || providerWithEmail?.email || '',
    picture: firebaseUser.photoURL || providerWithPhoto?.photoURL || '',
  }
}
