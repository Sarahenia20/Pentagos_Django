import React from 'react'
import PromptCreateClient from '@/components/prompts/PromptCreateClient'

export const metadata = {
  title: 'Create Prompt - PentaArt'
}

export default function PromptCreatePage() {
  return (
    <main className="p-6">
      <PromptCreateClient />
    </main>
  )
}
