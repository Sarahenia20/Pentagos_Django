import PromptListClient from '@/components/prompts/PromptListClient'

export const metadata = {
  title: 'Prompts - PentaArt'
}

export default function PromptsPage() {
  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-4">Prompt Library</h1>
      <PromptListClient />
    </main>
  )
}
