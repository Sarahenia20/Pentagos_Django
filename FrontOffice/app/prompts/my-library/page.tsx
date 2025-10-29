import React from 'react'
import MyLibraryClient from '@/components/prompts/MyLibraryClient'

export const metadata = {
  title: 'My Prompts - PentaArt'
}

export default function MyLibraryPage() {
  return (
    <main className="p-6">
      <MyLibraryClient />
    </main>
  )
}
