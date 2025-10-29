"use client"
import React from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import apiClient from '@/lib/api'
import useCurrentUser from '@/lib/useCurrentUser'
import { useCurrentUserContext } from '@/lib/CurrentUserProvider'
import { Prompt } from '@/types/prompt'

type Props = {
  prompt: Prompt
  onLike?: (id: string) => void
  onSave?: (id: string) => void
  onRemove?: () => void
  isLiked?: boolean
}

export default function PromptCard({ prompt, onLike, onSave, onRemove, isLiked = false }: Props) {
  // prefer shared context when mounted to avoid duplicate /auth/me calls
  const ctxUser = useCurrentUserContext()
  const currentUser = ctxUser ?? useCurrentUser()

  return (
    <article className="rounded-2xl p-6 bg-gradient-to-br from-black/30 via-white/3 to-transparent dark:border-white/6 border shadow-md hover:shadow-2xl transition-transform transform hover:-translate-y-1 duration-200 backdrop-blur-sm light:bg-white light:border-purple-200 light:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold leading-tight tracking-tight light:text-gray-900">
            <Link href={`/prompts/${prompt.id}`} className="hover:underline">
              {prompt.title || 'Untitled prompt'}
            </Link>
          </h3>
          <div className="text-xs text-muted-foreground mt-1 light:text-gray-600">{prompt.author || '—'}</div>
        </div>
        {prompt.category?.name && (
          <div className="text-xs bg-white/6 text-white/90 px-3 py-1 rounded-full whitespace-nowrap text-[12px] light:bg-purple-100 light:text-purple-700 light:border light:border-purple-300">
            {prompt.category.name}
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground my-3 line-clamp-3 light:text-gray-600">{prompt.description}</p>

      <pre className="text-xs bg-white/5 text-muted-foreground p-3 rounded-lg overflow-x-auto font-mono whitespace-pre-wrap break-words border border-white/4 light:bg-purple-50 light:text-gray-800 light:border-purple-200">
        {prompt.prompt_text}
      </pre>

      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-2 items-center flex-wrap">
          {prompt.tags?.slice(0, 4).map((t: any) => (
            <span
              key={t.id || t.name}
              className="text-xs bg-white/6 text-white/90 px-3 py-1 rounded-full border border-white/5 hover:scale-105 transition-transform light:bg-purple-100 light:text-purple-700 light:border-purple-300"
            >
              {t.name}
            </span>
          ))}
          {prompt.tags && prompt.tags.length > 4 && (
            <span className="text-xs bg-white/6 text-white/90 px-3 py-1 rounded-full border border-white/5 light:bg-purple-100 light:text-purple-700 light:border-purple-300">+{prompt.tags.length - 4}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            aria-label="copy prompt"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm hover:opacity-95 transition light:from-pink-500 light:to-purple-600"
            onClick={() => {
              navigator.clipboard.writeText(prompt.prompt_text)
              toast.success('Prompt copied to clipboard')
            }}
          >
            Copy
          </button>

          <button
            aria-label="like prompt"
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${isLiked ? 'bg-red-600/18 text-red-300 border-red-600/30 light:bg-red-50 light:text-red-600 light:border-red-300' : 'bg-white/6 text-white/90 border-white/6 light:bg-white light:text-gray-700 light:border-purple-300'} hover:scale-105 transition-transform`}
            onClick={() => {
              if (!apiClient.isAuthenticated()) {
                toast.error('Please sign in to like prompts')
                window.location.href = '/login'
                return
              }
              onLike?.(prompt.id)
            }}
          >
            <span className={isLiked ? 'text-red-300 light:text-red-600' : 'text-red-400 light:text-red-500'}>♥</span>
            <span className="text-sm">{prompt.likes_count || 0}</span>
          </button>

          <button
            aria-label="save prompt"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/6 text-muted-foreground hover:bg-white/6 transition light:bg-white light:border-purple-300 light:text-purple-700 light:hover:bg-purple-50"
            onClick={() => {
              if (!apiClient.isAuthenticated()) {
                toast.error('Please sign in to save prompts')
                window.location.href = '/login'
                return
              }
              onSave?.(prompt.id)
            }}
          >
            Save
          </button>

          {onRemove && (
            <button
              aria-label="remove from library"
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-600/20 text-red-300 hover:bg-red-600/8 transition light:bg-white light:border-red-300 light:text-red-600 light:hover:bg-red-50"
              onClick={() => {
                if (!apiClient.isAuthenticated()) {
                  toast.error('Please sign in to manage your library')
                  window.location.href = '/login'
                  return
                }
                onRemove()
              }}
            >
              Remove
            </button>
          )}

          <button
            aria-label="share prompt"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/6 text-muted-foreground hover:bg-white/6 transition light:bg-white light:border-purple-300 light:text-purple-700 light:hover:bg-purple-50"
            onClick={() => {
              const url = `${window.location.origin}/prompts/${prompt.id}`
              navigator.clipboard.writeText(url)
              toast.success('Share link copied')
            }}
          >
            Share
          </button>
        </div>
      </div>
    </article>
  )
}
