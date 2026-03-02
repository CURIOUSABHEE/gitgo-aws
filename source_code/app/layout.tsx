import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { SessionProvider } from '@/components/providers/session-provider'
import { Toaster } from 'react-hot-toast'

import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'gitgo - Launch your Open Source Career',
  description:
    'Upload your resume and connect GitHub. We match you with open source issues you can actually solve.',
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <SessionProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#18181b',
                color: '#fafafa',
                border: '1px solid #27272a',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fafafa',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fafafa',
                },
              },
              loading: {
                iconTheme: {
                  primary: '#3b82f6',
                  secondary: '#fafafa',
                },
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  )
}
