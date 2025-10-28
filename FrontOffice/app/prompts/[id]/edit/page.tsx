import React from 'react'
import PromptEditClient from '@/components/prompts/PromptEditClient'

export const metadata = {
  title: 'Edit Prompt - PentaArt'
}

export default function PromptEditPage() {
  return (
    <main className="p-6">
      <PromptEditClient />
    </main>
  )
}
