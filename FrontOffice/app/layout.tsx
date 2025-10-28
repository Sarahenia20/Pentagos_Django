import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/toaster'
import ClientRoot from '@/components/ClientRoot'
import { UserNav } from '@/components/user-nav'
import './globals.css'
import AuthHydrate from '@/components/auth-hydrate'

export const metadata: Metadata = {
  title: 'PentaaART',
  description: 'Created by Pentagos',
  generator: 'v0.app' 
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // Use the font classNames to ensure identical server/client markup
    <html lang="en" className={`${GeistSans.className} ${GeistMono.className}`}>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{--font-sans: ${GeistSans.variable}; --font-mono: ${GeistMono.variable};}`,
          }}
        />
      </head>
      <body>
        <AuthHydrate />
        <ClientRoot />
        <UserNav />
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}