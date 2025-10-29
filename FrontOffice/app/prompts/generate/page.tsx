import PromptGeneratorClient from '@/components/prompts/PromptGeneratorClient'

export const metadata = {
  title: 'AI Prompt Generator'
}

export default function Page() {
  return (
    <main className="min-h-screen">
      <PromptGeneratorClient />
    </main>
  )
}
