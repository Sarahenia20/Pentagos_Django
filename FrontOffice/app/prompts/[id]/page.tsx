import React from 'react'
import PromptDetailClient from '@/components/prompts/PromptDetailClient'

export const metadata = {
  title: 'Prompt - PentaArt'
}

export default function PromptDetailPage() {
  return (
    <main className="p-6">
      <PromptDetailClient />
    </main>
  )
}
