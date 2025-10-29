"use client"
import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { fetchPrompt, updatePrompt } from '@/lib/api_prompts'
import { toast } from 'sonner'
import apiClient from '@/lib/api'

export default function PromptEditClient() {
  const { id } = useParams() as { id?: string }
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [prompt, setPrompt] = useState<any | null>(null)
  const [title, setTitle] = useState('')
  const [promptText, setPromptText] = useState('')
  const [description, setDescription] = useState('')
  const [tagNames, setTagNames] = useState<string[]>([])
  const [variables, setVariables] = useState<string[]>([])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchPrompt(id)
      .then((p) => {
        setPrompt(p)
        setTitle(p.title || '')
        setPromptText(p.prompt_text || '')
        setDescription(p.description || '')
        setTagNames((p.tags || []).map((t: any) => (typeof t === 'string' ? t : t.name)))
        setVariables(p.variables || [])
      })
      .catch((e) => toast.error(String(e)))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    if (!apiClient.isAuthenticated()) {
      toast.error('Please sign in to edit prompts')
      router.push('/login')
      return
    }
    try {
      setLoading(true)
      const payload: any = {
        title,
        prompt_text: promptText,
        description,
        tag_names: tagNames,
        variables,
      }
      await updatePrompt(id, payload)
      toast.success('Prompt updated')
      router.push(`/prompts/${id}`)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update')
    } finally {
      setLoading(false)
    }
  }

  if (!id) return <div className="text-gray-400">No id provided</div>
  if (loading && !prompt) return <div className="text-gray-300">Loading...</div>
  if (!prompt) return <div className="text-gray-400">Prompt not found.</div>

  return (
    <section className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href={`/prompts/${id}`} className="inline-flex items-center gap-2 px-3 py-2 rounded bg-gray-800/30 hover:bg-gray-800/50 text-sm text-white">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold">Edit Prompt</h1>
        </div>
        <div className="text-sm text-gray-400">Editing #{id}</div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 rounded bg-gray-800/50 text-white" />
        </div>

        <div>
          <label className="block text-sm mb-1">Prompt Text</label>
          <textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} rows={6} className="w-full p-2 rounded bg-black/20 text-white" />
        </div>

        <div>
          <label className="block text-sm mb-1">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 rounded bg-gray-800/50 text-white" />
        </div>

        <div>
          <label className="block text-sm mb-1">Tags (comma separated)</label>
          <input value={tagNames.join(', ')} onChange={(e) => setTagNames(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} className="w-full p-2 rounded bg-gray-800/50 text-white" />
        </div>

        <div>
          <label className="block text-sm mb-1">Variables (comma separated)</label>
          <input value={(variables || []).join(', ')} onChange={(e) => setVariables(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} className="w-full p-2 rounded bg-gray-800/50 text-white" />
        </div>

        <div>
          <button disabled={loading} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </section>
  )
}
