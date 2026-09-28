import { AuthProvider } from './components/auth/AuthProvider';
import { GoogleOAuthProvider } from '@react-oauth/google';
import type { Metadata } from "next";
import { instance } from './config/instance';
import "./globals.css";

import localFont from 'next/font/local';

const brandFont = localFont({
  src: '/assets/Connexus.ttf',
  variable: '--font-brand'
});

export const metadata: Metadata = {
  title: instance.name,
  description: instance.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-br">
      <body className={brandFont.variable}>
        <GoogleOAuthProvider clientId="996833302397-gsksfg2ujfqgt27jg5ulti0ffrnmje9a.apps.googleusercontent.com">
          <AuthProvider>
            {children}
          </AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
};