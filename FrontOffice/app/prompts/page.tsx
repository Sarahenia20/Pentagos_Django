import PromptListClient from '@/components/prompts/PromptListClient'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Prompts - PentaArt'
}

export default function PromptsPage() {
  return (
    <div className="min-h-screen dark:bg-black light:bg-white dark:text-white light:text-gray-900">

      <main className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Prompt Library</h1>
          <div className="flex items-center gap-3">
            <Link href="/prompts/create">
              <Button variant="default">Create Prompt</Button>
            </Link>
          </div>
        </div>

        <PromptListClient />
      </main>
    </div>
  )
}
