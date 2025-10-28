import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/toaster'
import ClientRoot from '@/components/ClientRoot'
import { UserNav } from '@/components/user-nav'
import './globals.css'

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
        {/* Provide current user to client components by mounting a client entry that populates the shared store */}
        <ClientRoot />
        <UserNav />
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}