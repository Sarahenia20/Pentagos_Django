"use client"
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { fetchPrompt, likePrompt, unlikePrompt, savePrompt, deletePrompt, fetchLikedPrompts } from '@/lib/api_prompts'
import useCurrentUser from '@/lib/useCurrentUser'
import { useCurrentUserContext } from '@/lib/CurrentUserProvider'
import { toast } from 'sonner'
import apiClient from '@/lib/api'
import { Prompt } from '@/types/prompt'
import PromptCard from './PromptCard'

export default function PromptDetailClient() {
  const { id } = useParams() as { id?: string }
  const router = useRouter()
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [liked, setLiked] = useState(false)
  // prefer the app-level context when available
  const ctxUser = useCurrentUserContext()
  const currentUser = ctxUser ?? useCurrentUser()

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchPrompt(id)
      .then((p) => {
        setPrompt(p)
        // try to infer whether the current user already liked this prompt
        ;(async () => {
          try {
            if (apiClient.isAuthenticated()) {
              const favs = await fetchLikedPrompts()
              // favs may be an array of UserPromptLibrary entries where `prompt` is nested
              const found = Array.isArray(favs) && favs.some((f: any) => {
                const pid = f?.prompt?.id || f?.prompt_id || f?.prompt
                return String(pid) === String(p.id)
              })
              setLiked(Boolean(found))
            }
          } catch (e) {
            // ignore — not critical
          }
        })()
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [id])

  if (!id) return <div className="text-gray-400">No prompt id provided.</div>
  if (loading) return <div className="text-gray-300">Loading...</div>
  if (error) return <div className="text-red-400">{error}</div>
  if (!prompt) return <div className="text-gray-400">Prompt not found.</div>

  return (
    <section className="p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/prompts" className="inline-flex items-center gap-2 px-3 py-2 rounded bg-gray-800/30 hover:bg-gray-800/50 text-sm text-white">
              <ChevronLeft className="h-4 w-4" />
              Back to prompts
            </Link>
            <h2 className="text-sm text-gray-400">/ Prompt</h2>
          </div>
          <div className="text-xs text-gray-400">{prompt.created_at ? new Date(prompt.created_at).toLocaleString() : ''}</div>
        </div>

        <div className="mb-4 bg-card p-6 rounded-lg shadow-sm">
          <h1 className="text-3xl font-extrabold mb-2">{prompt.title}</h1>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white font-semibold">
              {prompt.author ? String(prompt.author).slice(0,2).toUpperCase() : '—'}
            </div>
            <div className="text-sm text-gray-300">
              <div className="font-medium">{prompt.author || '—'}</div>
              <div className="text-xs text-gray-500">{prompt.category?.name || 'Uncategorized'}</div>
            </div>
          </div>
          {prompt.description && <p className="text-sm text-gray-300 mt-3">{prompt.description}</p>}
        </div>

        <div className="mb-4">
          <pre className="text-sm bg-black/20 p-3 rounded-md overflow-x-auto">{prompt.prompt_text}</pre>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded"
            onClick={() => navigator.clipboard.writeText(prompt.prompt_text)}
          >
            Copy Prompt
          </button>

          <button
            className="px-3 py-1 bg-gray-700 rounded text-white flex items-center gap-2"
              onClick={async () => {
                if (!apiClient.isAuthenticated()) {
                  toast.error('Please sign in to like prompts')
                  window.location.href = '/login'
                  return
                }
                try {
                  if (liked) {
                    // unlike
                    const data = await unlikePrompt(prompt.id)
                    // if server returns likes_count, use it; otherwise decrement locally
                    const newCount = typeof data?.likes_count === 'number' ? data.likes_count : Math.max(0, (prompt.likes_count || 1) - 1)
                    setPrompt({ ...prompt, likes_count: newCount })
                    setLiked(false)
                    toast.success('Unliked')
                  } else {
                    const data = await likePrompt(prompt.id)
                    const newCount = typeof data?.likes_count === 'number' ? data.likes_count : (prompt.likes_count || 0) + 1
                    setPrompt({ ...prompt, likes_count: newCount })
                    setLiked(true)
                    toast.success('Liked')
                  }
                } catch (e) {
                  console.error(e)
                  toast.error(liked ? 'Failed to unlike' : 'Failed to like')
                }
              }}
          >
            <span className="text-pink-400">♥</span>
            <span>{prompt.likes_count}</span>
          </button>

          <button
            className="px-3 py-1 bg-gray-700 rounded text-white"
            onClick={async () => {
              if (!apiClient.isAuthenticated()) {
                toast.error('Please sign in to save prompts')
                window.location.href = '/login'
                return
              }
              try {
                await savePrompt(prompt.id)
                toast.success('Saved to your library')
              } catch (e) {
                console.error(e)
                toast.error('Failed to save')
              }
            }}
          >
            Save
          </button>

          {currentUser?.id === prompt.author_id && (
            <>
              <button
                className="px-3 py-1 bg-gray-700 rounded text-white"
                onClick={() => (window.location.href = `/prompts/${prompt.id}/edit`)}
              >
                Edit
              </button>

              <button
                className="px-3 py-1 bg-red-600 rounded text-white"
                onClick={async () => {
                  if (!apiClient.isAuthenticated()) {
                    toast.error('Please sign in')
                    window.location.href = '/login'
                    return
                  }
                  if (!confirm('Delete this prompt? This cannot be undone.')) return
                  try {
                    await deletePrompt(prompt.id)
                    toast.success('Deleted')
                    window.location.href = '/prompts'
                  } catch (e) {
                    console.error(e)
                    toast.error('Failed to delete (you might not be the author)')
                  }
                }}
              >
                Delete
              </button>
            </>
          )}

          <button
            className="px-3 py-1 bg-gray-700 rounded text-white"
            onClick={() => {
              const url = `${window.location.origin}/prompts/${prompt.id}`
              navigator.clipboard.writeText(url)
              toast.success('Share link copied')
            }}
          >
            Share
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm text-gray-300 mb-2">Category</h3>
            <div className="text-sm">{prompt.category?.name || '—'}</div>
          </div>
          <div>
            <h3 className="text-sm text-gray-300 mb-2">Tags</h3>
            <div className="flex gap-2 flex-wrap">
              {prompt.tags?.map((t: any) => (
                <span key={t.id} className="text-xs bg-purple-700/20 text-purple-300 px-2 py-1 rounded">
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {prompt.variables && prompt.variables.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm text-gray-300 mb-2">Variables</h3>
            <div className="flex gap-2 flex-wrap">
              {prompt.variables.map((v: string, i: number) => (
                <div key={i} className="text-xs bg-gray-800/40 text-gray-200 px-2 py-1 rounded">
                  <code>{`{${v}}`}</code>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Tip: replace variables like <code>{`{${prompt.variables[0]}}`}</code> to customize the output.</p>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-2">Examples</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Placeholder example images */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-gradient-to-br from-purple-700 to-pink-500 rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
