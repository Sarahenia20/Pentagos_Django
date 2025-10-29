"use client"
import React, { useEffect, useState } from 'react'
import { createPrompt, fetchCategories } from '@/lib/api_prompts'
import { toast } from 'sonner'
import apiClient from '@/lib/api'

export default function PromptCreateClient() {
  const [title, setTitle] = useState('')
  const [promptText, setPromptText] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
    const [tagNames, setTagNames] = useState<string[]>([])
    const [tagInput, setTagInput] = useState('')
    const [variables, setVariables] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPublic, setIsPublic] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const cats = await fetchCategories()
        setCategories(Array.isArray(cats) ? cats : (cats.results || []))
      } catch (e) {
        console.error(e)
        setCategories([])
      }
    })()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title || !promptText) {
      setError('Title and prompt text are required')
      return
    }
    if (!apiClient.isAuthenticated()) {
      toast.error('You need to sign in to create prompts')
      window.location.href = '/login'
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        title,
        prompt_text: promptText,
        description,
          tag_names: tagNames,
        variables: variables.split(',').map((s) => s.trim()).filter(Boolean),
        is_public: isPublic,
      }
      if (categoryId) payload.category_id = categoryId
      await createPrompt(payload)
  // clear form
  setTitle('')
  setPromptText('')
  setDescription('')
  setTagNames([])
  setTagInput('')
  setVariables('')
      // optionally navigate to prompts list
      toast.success('Prompt created')
      window.location.href = '/prompts'
    } catch (err: any) {
      setError(err?.message || 'Failed to create prompt')
      toast.error('Failed to create prompt')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create Prompt Template</h1>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Category</label>
            <select value={categoryId ?? ''} onChange={(e) => setCategoryId(e.target.value || null)} className="w-full p-2 rounded bg-gray-800/50 text-white">
              <option value="">Select</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Tags (comma separated)</label>
              <div>
                <label className="block text-sm mb-1">Tags</label>
                <div className="flex items-center gap-2 flex-wrap p-2 rounded bg-gray-800/50">
                  {tagNames.map((t) => (
                    <div key={t} className="text-xs bg-purple-600 text-white px-2 py-1 rounded flex items-center gap-2">
                      <span>{t}</span>
                      <button type="button" aria-label={`remove ${t}`} onClick={() => setTagNames((prev) => prev.filter((x) => x !== t))} className="opacity-80 hover:opacity-100">✕</button>
                    </div>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        const v = tagInput.trim()
                        if (v && !tagNames.includes(v)) setTagNames((prev) => [...prev, v])
                        setTagInput('')
                      } else if (e.key === 'Backspace' && tagInput === '') {
                        // remove last tag
                        setTagNames((prev) => prev.slice(0, -1))
                      }
                    }}
                    placeholder="Add tag and press Enter"
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-white text-sm"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Press Enter to add tags. Tags are optional.</p>
              </div>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Variables (comma separated)</label>
          <input value={variables} onChange={(e) => setVariables(e.target.value)} className="w-full p-2 rounded bg-gray-800/50 text-white" />
        </div>

        <div className="flex items-center gap-2">
          <input id="is_public" type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          <label htmlFor="is_public" className="text-sm text-gray-300">Make Public (share with everyone)</label>
        </div>

        {error && <div className="text-red-400">{error}</div>}

        <div>
            <div className="flex gap-2">
              <button type="button" onClick={() => (window.location.href = '/prompts')} className="px-4 py-2 bg-gray-700 text-white rounded">Cancel</button>
              <button disabled={saving} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded">
                {saving ? 'Saving...' : 'Create Prompt'}
              </button>
            </div>
        </div>
      </form>
    </section>
  )
}
