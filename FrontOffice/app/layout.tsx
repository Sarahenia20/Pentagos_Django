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
<<<<<<< Updated upstream
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: `html {
    font-family: '__GeistSans_fb8f2c', '__GeistSans_Fallback_fb8f2c';
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}` }} />
      </head>
=======
    // Use the font classNames to ensure identical server/client markup
    <html lang="en" className={`${GeistSans.className} ${GeistMono.className}`}>
>>>>>>> Stashed changes
      <body>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}