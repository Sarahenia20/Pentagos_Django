import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/toaster'
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
    <html lang="en">
      <head>
        <style>{`
html {
    font-family: '__GeistSans_fb8f2c', '__GeistSans_Fallback_fb8f2c';
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
