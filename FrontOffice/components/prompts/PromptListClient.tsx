"use client"
import React, { useEffect, useState, useRef } from 'react'
import PromptCard from './PromptCard'
import { toast } from 'sonner'
import apiClient from '@/lib/api'
import { fetchPromptsWithMeta, likePrompt, unlikePrompt, savePrompt, fetchCategories, fetchTags } from '@/lib/api_prompts'
import { Prompt } from '@/types/prompt'

export default function PromptListClient() {
  const [query, setQuery] = useState('')
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState<number | null>(null)
  const [nextUrl, setNextUrl] = useState<string | null | undefined>(null)
  const [prevUrl, setPrevUrl] = useState<string | null | undefined>(null)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())

  const debounceRef = useRef<number | null>(null)

  async function load(opts: { q?: string; category?: string | null; tags?: string[]; page?: number } = {}) {
    setLoading(true)
    setError(null)
    try {
      // Build a simple search string using query + filters that backend understands (search + category__/tags__)
      const params: string[] = []
      if (opts.q) params.push(`search=${encodeURIComponent(opts.q)}`)
      if (opts.category) params.push(`category__slug=${encodeURIComponent(opts.category)}`)
      if (opts.tags && opts.tags.length) {
        // for multiple tags we request the first tag (server supports tags__name) or join as repeated params
        opts.tags.forEach((t) => params.push(`tags__name=${encodeURIComponent(t)}`))
      }
  let queryString = params.length ? `?${params.join('&')}` : ''
      // include page if provided
      if (opts.page && opts.page > 1) {
        queryString += queryString ? `&page=${opts.page}` : `?page=${opts.page}`
      }
      const data = await fetchPromptsWithMeta(queryString)
  setPrompts(data.results)
  setTotal(data.count ?? null)
  setNextUrl(data.next)
  setPrevUrl(data.previous)
    } catch (err: any) {
      setError(err?.message || 'Failed to load prompts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    ;(async () => {
      try {
        const cats = await fetchCategories()
        // DRF may return a paginated object { results, count, next, previous }
        setCategories(Array.isArray(cats) ? cats : (cats.results || []))
      } catch (e) {
        // ignore categories failure
        setCategories([])
      }
      try {
        const t = await fetchTags()
        setTags(Array.isArray(t) ? t : (t.results || []))
      } catch (e) {
        // ignore
        setTags([])
      }
    })()
  }, [])

  // debounced live search
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      load({ q: query, category: selectedCategory, tags: selectedTags, page })
    }, 300)
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedCategory, selectedTags, page])

  async function handleLike(id: string) {
    if (!apiClient.isAuthenticated()) {
      toast.error('Please sign in to like prompts')
      window.location.href = '/login'
      return
    }
    try {
      const already = likedIds.has(id)
      if (already) {
        const data = await unlikePrompt(id)
        const newCount = typeof data?.likes_count === 'number' ? data.likes_count : Math.max(0, (prompts.find((p) => p.id === id)?.likes_count || 1) - 1)
        setPrompts((ps) => ps.map((p) => (p.id === id ? { ...p, likes_count: newCount } : p)))
        setLikedIds((s) => {
          const next = new Set(s)
          next.delete(id)
          return next
        })
        toast.success('Unliked')
      } else {
        const data = await likePrompt(id)
        const newCount = typeof data?.likes_count === 'number' ? data.likes_count : (prompts.find((p) => p.id === id)?.likes_count || 0) + 1
        setPrompts((ps) => ps.map((p) => (p.id === id ? { ...p, likes_count: newCount } : p)))
        setLikedIds((s) => new Set(Array.from(s).concat(id)))
        toast.success('Liked')
      }
    } catch (e) {
      console.error('like toggle failed', e)
      toast.error('Failed to toggle like')
    }
  }

  async function handleSave(id: string) {
    if (!apiClient.isAuthenticated()) {
      toast.error('Please sign in to save prompts')
      window.location.href = '/login'
      return
    }
    try {
      await savePrompt(id)
      toast.success('Saved to your library')
    } catch (e) {
      console.error('save failed', e)
      toast.error('Failed to save')
    }
  }

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search prompts..."
          className="flex-1 px-4 py-3 rounded-full dark:bg-white/5 light:bg-gray-100 dark:text-white light:text-gray-900 placeholder:dark:text-gray-400 placeholder:light:text-gray-500 focus:outline-none focus:ring-2 dark:focus:ring-purple-500 light:focus:ring-purple-400 border dark:border-transparent light:border-gray-200"
        />
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSelectedCategory(null)} className={`px-4 py-2 rounded-full text-sm transition-colors ${selectedCategory === null ? 'bg-purple-600 text-white' : 'dark:bg-white/5 light:bg-gray-100 dark:text-gray-200 light:text-gray-700 hover:dark:bg-white/10 hover:light:bg-gray-200'}`}>All</button>
          {categories.map((c) => (
            <button key={c.slug} onClick={() => setSelectedCategory(c.slug)} className={`px-4 py-2 rounded-full text-sm transition-colors ${selectedCategory === c.slug ? 'bg-purple-600 text-white' : 'dark:bg-white/5 light:bg-gray-100 dark:text-gray-200 light:text-gray-700 hover:dark:bg-white/10 hover:light:bg-gray-200'}`}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="text-sm dark:text-gray-300 light:text-gray-700 mr-2 font-medium">Tags:</label>
        <div className="flex gap-2 flex-wrap mt-2">
          {tags.map((t) => {
            const active = selectedTags.includes(t.name)
            return (
              <button
                key={t.name}
                onClick={() => {
                  setSelectedTags((prev) => prev.includes(t.name) ? prev.filter((x) => x !== t.name) : [...prev, t.name])
                }}
                className={`text-sm px-3 py-1 rounded-full border transition-all ${active ? 'bg-purple-600 text-white border-transparent' : 'dark:bg-white/3 light:bg-white dark:text-white/80 light:text-gray-700 dark:border-white/6 light:border-gray-200'} hover:scale-105`}
              >
                {t.name}
              </button>
            )
          })}
        </div>
      </div>

      {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl p-5 dark:bg-white/5 light:bg-gray-100 dark:border-white/6 light:border-gray-200 border animate-pulse">
                  <div className="h-5 rounded w-3/4 mb-3 dark:bg-white/6 light:bg-gray-200" />
                  <div className="h-3 rounded w-full mb-2 dark:bg-white/6 light:bg-gray-200" />
                  <div className="h-28 rounded mb-3 dark:bg-white/6 light:bg-gray-200" />
                  <div className="flex gap-2">
                    <div className="h-8 w-20 rounded dark:bg-white/6 light:bg-gray-200" />
                    <div className="h-8 w-20 rounded dark:bg-white/6 light:bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          )}
      {error && <div className="dark:text-red-400 light:text-red-600 bg-red-50 light:bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {prompts.map((p) => (
          <PromptCard key={p.id} prompt={p} onLike={handleLike} onSave={handleSave} isLiked={likedIds.has(p.id)} />
        ))}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-center gap-4 mt-8">
        <button
          onClick={() => setPage((s) => Math.max(1, s - 1))}
          disabled={page === 1}
          className="px-4 py-2 rounded-full dark:bg-white/5 light:bg-gray-100 dark:text-white light:text-gray-900 disabled:opacity-50 hover:dark:bg-white/10 hover:light:bg-gray-200 transition-colors border dark:border-transparent light:border-gray-200"
        >
          Prev
        </button>

        <div className="text-sm dark:text-gray-300 light:text-gray-700">Page {page}{total ? ` • ${total} items` : ''}</div>

        <button
          onClick={() => setPage((s) => s + 1)}
          disabled={!nextUrl}
          className="px-4 py-2 rounded-full dark:bg-white/5 light:bg-gray-100 dark:text-white light:text-gray-900 disabled:opacity-50 hover:dark:bg-white/10 hover:light:bg-gray-200 transition-colors border dark:border-transparent light:border-gray-200"
        >
          Next
        </button>
      </div>

      {!loading && prompts.length === 0 && <div className="dark:text-gray-400 light:text-gray-600 mt-6 text-center py-12">No prompts found.</div>}
    </section>
  )
}
