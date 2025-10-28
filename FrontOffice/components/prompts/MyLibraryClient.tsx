"use client"
import React, { useEffect, useState } from 'react'
import { fetchMyPrompts, fetchMyTemplates, fetchLikedPrompts, deleteUserPrompt } from '@/lib/api_prompts'
import { toast } from 'sonner'
import { Prompt } from '@/types/prompt'
import PromptCard from './PromptCard'

type Tab = 'my' | 'saved' | 'liked'

export default function MyLibraryClient() {
  const [tab, setTab] = useState<Tab>('my')
  // keep raw items so we can access wrapper id (UserPromptLibrary) for saved/liked tabs
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const loader = tab === 'my' ? fetchMyTemplates : tab === 'saved' ? fetchMyPrompts : fetchLikedPrompts
    loader()
      .then((data) => {
        const loaded = Array.isArray(data) ? data : (data.results || [])
        // For 'my' tab the backend returns PromptTemplate objects directly.
        // For 'saved' and 'liked' tabs the backend returns UserPromptLibrary entries
        // which include a `prompt` field containing the PromptTemplate. Keep the
        // raw items so we can delete by the wrapper id when needed.
        setItems(loaded)
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [tab])

  async function handleRemove(id: string) {
    try {
      await deleteUserPrompt(id)
      setItems((prev: any[]) => prev.filter((it) => it.id !== id))
      toast.success('Removed from your library')
    } catch (e: any) {
      console.error('failed to remove saved prompt', e)
      toast.error(e?.message || 'Failed to remove')
    }
  }

  if (loading) return <div className="text-gray-300">Loading...</div>

  return (
    <section className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">My Prompt Library</h1>

      <div className="mb-6">
        <nav className="flex gap-3">
          <button onClick={() => setTab('my')} className={`px-4 py-2 rounded-2xl font-medium ${tab === 'my' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' : 'bg-transparent text-muted-foreground border border-white/6'}`}>My Templates</button>
          <button onClick={() => setTab('saved')} className={`px-4 py-2 rounded-2xl font-medium ${tab === 'saved' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' : 'bg-transparent text-muted-foreground border border-white/6'}`}>Saved</button>
          <button onClick={() => setTab('liked')} className={`px-4 py-2 rounded-2xl font-medium ${tab === 'liked' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' : 'bg-transparent text-muted-foreground border border-white/6'}`}>Liked</button>
        </nav>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((it) => {
          const prompt: Prompt = it && it.prompt ? it.prompt : it
          const wrapperId: string | undefined = it && it.prompt ? it.id : undefined
          return (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onRemove={wrapperId ? () => handleRemove(wrapperId) : undefined}
            />
          )
        })}
      </div>

      {!loading && items.length === 0 && (
        <div className="text-center text-gray-400 mt-10">
          <div className="mx-auto mb-6" style={{ width: 220 }}>
            {/* Simple illustrative SVG for empty state */}
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
              <rect x="6" y="10" width="52" height="36" rx="4" fill="rgba(255,255,255,0.03)" />
              <path d="M18 26h28" stroke="rgba(255,255,255,0.06)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="26" cy="36" r="3" fill="rgba(219,39,119,0.9)" />
              <circle cx="36" cy="36" r="3" fill="rgba(99,102,241,0.9)" />
            </svg>
          </div>
          <div className="text-lg font-semibold mb-2">No prompts found</div>
          <div className="max-w-md mx-auto text-sm text-muted-foreground">You don't have any prompts in this tab yet. Try saving prompts from the gallery or create your own templates.</div>
        </div>
      )}
    </section>
  )
}

async function handleRemove(id: string) {
  try {
    await deleteUserPrompt(id)
    setItems((prev) => prev.filter((it) => it.id !== id))
    toast.success('Removed from your library')
  } catch (e: any) {
    console.error('failed to remove saved prompt', e)
    toast.error(e?.message || 'Failed to remove')
  }
}
 