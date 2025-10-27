"use client"

export type CommentItem = {
  id: string
  artworkId: number
  text: string
  createdAt: string
  username?: string | null
}

type StorageShape = {
  likes: Record<number, { liked: boolean; count: number }>
  comments: Record<number, CommentItem[]>
}

const KEY = 'pentagos_community_v1'

function nowIso() {
  return new Date().toISOString()
}

function read(): StorageShape {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      return { likes: {}, comments: {} }
    }
    return JSON.parse(raw)
  } catch (e) {
    console.error('storage read error', e)
    return { likes: {}, comments: {} }
  }
}

function write(data: StorageShape) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    // dispatch a storage-like event for same-tab listeners
    try {
      window.dispatchEvent(new Event('pentagos_storage_update'))
    } catch (e) {
      // ignore
    }
  } catch (e) {
    console.error('storage write error', e)
  }
}

export const StorageService = {
  getLikes(artworkId: number): number {
    const s = read()
    const v = s.likes[artworkId]
    return v?.count ?? 0
  },

  isLiked(artworkId: number): boolean {
    const s = read()
    return !!s.likes[artworkId]?.liked
  },

  toggleLike(artworkId: number): { liked: boolean; count: number } {
    const s = read()
    const cur = s.likes[artworkId] ?? { liked: false, count: 0 }
    const liked = !cur.liked
    const count = liked ? cur.count + 1 : Math.max(0, cur.count - 1)
    s.likes[artworkId] = { liked, count }
    write(s)
    return { liked, count }
  },

  getComments(artworkId: number): CommentItem[] {
    const s = read()
    return s.comments[artworkId] ?? []
  },

  addComment(artworkId: number, text: string, username?: string | null): CommentItem {
    const s = read()
    const list = s.comments[artworkId] ?? []
    const item: CommentItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      artworkId,
      text,
      createdAt: nowIso(),
      username: username ?? null,
    }
    list.unshift(item)
    s.comments[artworkId] = list
    write(s)
    return item
  },

  clearAll() {
    try {
      localStorage.removeItem(KEY)
      window.dispatchEvent(new Event('pentagos_storage_update'))
    } catch (e) {
      console.error(e)
    }
  },
}

export default StorageService
