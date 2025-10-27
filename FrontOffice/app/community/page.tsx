"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"


import { ArrowRight, TrendingUp, Star, Sparkles, Heart, MessageCircle, Share2, X } from "lucide-react"
import { UserNav } from "@/components/user-nav"
import StorageService, { CommentItem } from "./storage"

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState("trending")

  const [likesMap, setLikesMap] = useState<Record<number, number>>({})
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({})
  const [commentsMap, setCommentsMap] = useState<Record<number, CommentItem[]>>({})
  const [openCommentsFor, setOpenCommentsFor] = useState<number | null>(null)
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({})
  const [commentErrors, setCommentErrors] = useState<Record<number, string | null>>({})
  const [moderationModal, setModerationModal] = useState<{ message: string } | null>(null)

  const trendingArtworks = [
    {
      id: 1,
      title: "Neon Dreams",
      likes: 524,
      artist: "@neonartist",
      image: "/neon-cyberpunk-art.jpg",
      prompt: "Futuristic cyberpunk street at night, neon lights, rainy city",
      ai_provider: "SDXL",
      size: "1024x1024",
      created_at: "2025-10-20",
    },
    {
      id: 2,
      title: "Abstract Flow",
      likes: 391,
      artist: "@flowmaster",
      image: "/abstract-colorful-flow.jpg",
      prompt: "Colorful abstract ribbons and flowing shapes",
      ai_provider: "DALL·E",
      size: "1024x1024",
      created_at: "2025-10-15",
    },
    {
      id: 3,
      title: "Digital Sunset",
      likes: 287,
      artist: "@sunsetlover",
      image: "/digital-sunset-landscape.jpg",
      prompt: "Digital landscape with sunset over mountains",
      ai_provider: "SDXL",
      size: "1024x1024",
      created_at: "2025-10-18",
    },
    {
      id: 4,
      title: "Cosmic Portal",
      likes: 156,
      artist: "@cosmicart",
      image: "/cosmic-portal-space.jpg",
      prompt: "A swirling cosmic portal with stars and nebulas",
      ai_provider: "Midjourney",
      size: "1024x1024",
      created_at: "2025-09-30",
    },
    {
      id: 5,
      title: "Fractal Mind",
      likes: 423,
      artist: "@fractalist",
      image: "/fractal-patterns-colorful.jpg",
      prompt: "Intricate fractal patterns in vivid colors",
      ai_provider: "SDXL",
      size: "1024x1024",
      created_at: "2025-10-05",
    },
    {
      id: 6,
      title: "Urban Glow",
      likes: 312,
      artist: "@urbanartist",
      image: "/urban-city-glow-night.jpg",
      prompt: "City skyline at night with glowing windows and reflections",
      ai_provider: "Gpt4o-image",
      size: "1024x1024",
      created_at: "2025-10-10",
    },
  ]

  const featuredArtists = [
    { username: "@neonartist", artworks: 127, followers: "2.3k" },
    { username: "@flowmaster", artworks: 89, followers: "1.8k" },
    { username: "@cosmicart", artworks: 156, followers: "3.1k" },
  ]

  useEffect(() => {
    function dedupeComments(list: CommentItem[] | undefined) {
      if (!list || list.length === 0) return [] as CommentItem[]
      const seen = new Set<string>()
      const out: CommentItem[] = []
      for (const c of list) {
        if (!seen.has(c.id)) {
          seen.add(c.id)
          out.push(c)
        }
      }
      return out
    }

    const initialLikes: Record<number, number> = {}
    const initialLiked: Record<number, boolean> = {}
    const initialComments: Record<number, CommentItem[]> = {}
    trendingArtworks.forEach((a) => {
      initialLikes[a.id] = StorageService.getLikes(a.id) || a.likes || 0
      initialLiked[a.id] = StorageService.isLiked(a.id)
      initialComments[a.id] = dedupeComments(StorageService.getComments(a.id) || [])
    })
    setLikesMap(initialLikes)
    setLikedMap(initialLiked)
    setCommentsMap(initialComments)

    const onStorage = () => {
      const updatedLikes: Record<number, number> = {}
      const updatedLiked: Record<number, boolean> = {}
      const updatedComments: Record<number, CommentItem[]> = {}
      trendingArtworks.forEach((a) => {
        updatedLikes[a.id] = StorageService.getLikes(a.id) || a.likes || 0
        updatedLiked[a.id] = StorageService.isLiked(a.id)
        updatedComments[a.id] = dedupeComments(StorageService.getComments(a.id) || [])
      })
      setLikesMap(updatedLikes)
      setLikedMap(updatedLiked)
      setCommentsMap(updatedComments)
    }

    window.addEventListener('pentagos_storage_update', onStorage)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('pentagos_storage_update', onStorage)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  function handleToggleLike(artworkId: number) {
    const res = StorageService.toggleLike(artworkId)
    setLikesMap((s) => ({ ...s, [artworkId]: res.count }))
    setLikedMap((s) => ({ ...s, [artworkId]: res.liked }))
  }

  function openComments(artworkId: number) {
    setOpenCommentsFor((cur) => (cur === artworkId ? null : artworkId))
  }

  function handleCommentChange(artworkId: number, text: string) {
    setCommentInputs((s) => ({ ...s, [artworkId]: text }))
    setCommentErrors((s) => ({ ...(s || {}), [artworkId]: null }))
  }

  async function moderateComment(text: string): Promise<{ allowed: boolean; reason?: string; severity?: 'inline' | 'modal' }> {
    const lower = text.toLowerCase()
    const banned = ['fuck', 'shit', 'bitch', 'asshole', 'nigger', 'cunt', 'rape', 'kill', 'bomb', 'terror']
    for (const w of banned) {
      if (lower.includes(w)) return { allowed: false, reason: 'Your comment contains words that are not allowed.', severity: 'modal' }
    }
    const urlRegex = /https?:\/\/[\w\-\.]+/i
    if (urlRegex.test(text)) return { allowed: false, reason: 'Links are not allowed in comments.', severity: 'inline' }
    if (/([a-z])\1{20,}/i.test(text)) return { allowed: false, reason: 'Comment looks like spam.', severity: 'inline' }

    // OpenAI Moderation (optional) - set NEXT_PUBLIC_OPENAI_API_KEY in env to enable
    const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY
    if (OPENAI_KEY) {
      try {
        const res = await fetch('https://api.openai.com/v1/moderations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_KEY}`,
          },
          body: JSON.stringify({ input: text }),
        })
        if (res.ok) {
          const j = await res.json().catch(() => ({}))
          const flagged = j?.results && j.results[0] && j.results[0].flagged
          if (flagged) return { allowed: false, reason: 'Comment blocked by moderation.', severity: 'modal' }
        }
      } catch (e) {
        console.warn('openai moderation failed', e)
      }
    }

    // Generic moderation endpoint (optional): set NEXT_PUBLIC_MODERATION_API_URL and optional KEY
    const MOD_API = process.env.NEXT_PUBLIC_MODERATION_API_URL
    const MOD_KEY = process.env.NEXT_PUBLIC_MODERATION_API_KEY
    if (MOD_API) {
      try {
        const res = await fetch(MOD_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(MOD_KEY ? { 'Authorization': `Bearer ${MOD_KEY}` } : {}),
          },
          body: JSON.stringify({ text }),
        })
        if (res.ok) {
          const j = await res.json().catch(() => ({}))
          if (j.flagged === true || j.blocked === true || j.allowed === false) {
            return { allowed: false, reason: j.reason || 'Comment blocked by moderation.', severity: 'modal' }
          }
        }
      } catch (e) {
        console.warn('moderation endpoint failed', e)
      }
    }

    return { allowed: true }
  }

  async function handleAddComment(artworkId: number) {
    const text = (commentInputs[artworkId] || '').trim()
    if (!text) return
    const mod = await moderateComment(text)
    if (!mod.allowed) {
      // severity determines UI: 'modal' shows a prominent modal alert, 'inline' shows a small inline error
      if (mod.severity === 'modal') {
        setModerationModal({ message: mod.reason || 'Comment blocked by moderation.' })
      } else {
        setCommentErrors((s) => ({ ...(s || {}), [artworkId]: mod.reason || 'Comment blocked.' }))
      }
      return
    }
    const item = StorageService.addComment(artworkId, text, null)
    setCommentsMap((s) => {
      const prev = (s && s[artworkId]) || []
      const merged = [item, ...prev.filter((c) => c.id !== item.id)]
      return { ...(s || {}), [artworkId]: merged }
    })
    setCommentInputs((s) => ({ ...s, [artworkId]: '' }))
    setCommentErrors((s) => ({ ...(s || {}), [artworkId]: null }))
  }

  const activeArt = openCommentsFor !== null ? trendingArtworks.find((a) => a.id === openCommentsFor) : null

  return (
    <div className="min-h-screen dark:bg-black light:bg-white dark:text-white light:text-gray-900 overflow-hidden">
      <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-purple-900/20 dark:via-black dark:to-pink-900/20 light:bg-gradient-to-br light:from-purple-100 light:via-white light:to-pink-100" />
      <div className="relative z-10">
        <UserNav />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold dark:text-white light:text-gray-900 mb-2">Community Discovery</h1>
                <p className="dark:text-gray-300 light:text-gray-600">Explore trending artworks and discover talented artists</p>
              </div>
              <Link href="/gallery">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
                  Continue to Gallery
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <TabsList className="dark:bg-gray-900/50 light:bg-purple-50 dark:border-purple-500/20 light:border-purple-200 border backdrop-blur-xl">
                <TabsTrigger value="trending" className="data-[state=active]:dark:bg-purple-500 data-[state=active]:light:bg-pink-500 data-[state=active]:dark:text-white data-[state=active]:light:text-gray-900">
                  <TrendingUp className="mr-2 h-4 w-4 dark:text-purple-400 light:text-purple-600" />
                  Trending
                </TabsTrigger>
                <TabsTrigger value="featured" className="data-[state=active]:dark:bg-purple-500 data-[state=active]:light:bg-pink-500 data-[state=active]:dark:text-white data-[state=active]:light:text-gray-900">
                  <Star className="mr-2 h-4 w-4" />
                  Featured
                </TabsTrigger>
                <TabsTrigger value="new" className="data-[state=active]:dark:bg-purple-500 data-[state=active]:light:bg-pink-500 data-[state=active]:dark:text-white data-[state=active]:light:text-gray-900">
                  <Sparkles className="mr-2 h-4 w-4" />
                  New
                </TabsTrigger>
              </TabsList>

              <TabsContent value="trending" className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold dark:text-white light:text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 dark:text-purple-400 light:text-purple-600" />
                    Trending Today
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trendingArtworks.map((artwork) => (
                      <Card key={artwork.id} className="dark:bg-gray-900/50 light:bg-white dark:border-purple-500/20 light:border-purple-200 backdrop-blur-xl overflow-hidden group cursor-pointer hover:scale-105 transition-transform hover:shadow-lg hover:shadow-purple-500/20">
                        <div className="relative aspect-square" onClick={() => openComments(artwork.id)} role="button" tabIndex={0}>
                          <Image src={artwork.image || "/placeholder.svg"} alt={artwork.title} fill className="object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                              <h3 className="dark:text-white light:text-gray-900 font-bold text-lg">{artwork.title}</h3>
                              <p className="dark:text-gray-300 light:text-gray-600 text-sm">{artwork.artist}</p>
                            </div>
                          </div>
                        </div>

                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm dark:text-gray-300 light:text-gray-600">
                              <button onClick={(e) => { e.stopPropagation(); handleToggleLike(artwork.id) }} className={`flex items-center gap-1 transition-colors ${likedMap[artwork.id] ? 'text-pink-400' : 'dark:text-gray-300 light:text-gray-600'}`} aria-pressed={!!likedMap[artwork.id]}>
                                <Heart className="h-4 w-4" />
                                {likesMap[artwork.id] ?? artwork.likes}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); openComments(artwork.id) }} className="flex items-center gap-1 hover:dark:text-purple-400 hover:light:text-pink-400 transition-colors">
                                <MessageCircle className="h-4 w-4" />
                                {(commentsMap[artwork.id] || []).length}
                              </button>
                            </div>
                            <button className="dark:text-gray-300 light:text-gray-600 hover:dark:text-purple-400 hover:light:text-pink-400 transition-colors">
                              <Share2 className="h-4 w-4" />
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {activeArt && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setOpenCommentsFor(null)} aria-hidden />
                    <div className="relative z-10 w-[90%] max-w-6xl h-[80%] bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-2xl grid grid-cols-12">
                      <div className="col-span-7 bg-black relative">
                        <Image src={activeArt.image || '/placeholder.svg'} alt={activeArt.title} fill className="object-contain" />
                      </div>
                      <div className="col-span-5 flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="dark:bg-purple-600 light:bg-pink-500 text-white">{activeArt.artist.slice(1,3).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold dark:text-white light:text-gray-900">{activeArt.artist}</div>
                              <div className="text-xs text-gray-400">{activeArt.title}</div>
                            </div>
                          </div>
                          <button onClick={() => setOpenCommentsFor(null)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="flex-1 overflow-auto p-4 space-y-4">
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold dark:text-white light:text-gray-900">Prompt</h4>
                            <p className="text-sm dark:text-gray-200 light:text-gray-700">{(activeArt as any).prompt}</p>
                            <div className="mt-2 text-xs text-gray-400 flex gap-4">
                              <div><span className="font-semibold text-gray-300">AI:</span> {(activeArt as any).ai_provider}</div>
                              <div><span className="font-semibold text-gray-300">Size:</span> {(activeArt as any).size}</div>
                              <div><span className="font-semibold text-gray-300">Date:</span> {new Date((activeArt as any).created_at).toLocaleDateString()}</div>
                            </div>
                          </div>

                          {(commentsMap[activeArt.id] || []).map((c) => (
                            <div key={c.id} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs">{(c.username || 'G').slice(0,1).toUpperCase()}</div>
                                <div className="text-sm font-semibold dark:text-white light:text-gray-900">{c.username ?? 'Guest'}</div>
                                <div className="text-xs text-gray-400">• {new Date(c.createdAt).toLocaleString()}</div>
                              </div>
                              <div className="text-sm dark:text-gray-200 light:text-gray-800 ml-9">{c.text}</div>
                            </div>
                          ))}
                          {(commentsMap[activeArt.id] || []).length === 0 && (
                            <div className="text-sm text-gray-400">No comments yet — be the first!</div>
                          )}
                        </div>
                        <div className="p-4 border-t dark:border-gray-800">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-4">
                              <button onClick={(e) => { e.stopPropagation(); handleToggleLike(activeArt.id) }} className={`flex items-center gap-2 ${likedMap[activeArt.id] ? 'text-pink-400' : 'dark:text-gray-300 light:text-gray-700'}`}>
                                <Heart className="h-5 w-5" />
                                <div className="text-sm">{likesMap[activeArt.id] ?? activeArt.likes}</div>
                              </button>
                              <div className="flex items-center gap-2 dark:text-gray-300 light:text-gray-700">
                                <MessageCircle className="h-5 w-5" />
                                <div className="text-sm">{(commentsMap[activeArt.id] || []).length}</div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-400">{new Date().toLocaleDateString()}</div>
                          </div>
                          <div className="flex gap-3 items-start">
                            <input value={commentInputs[activeArt.id] || ''} onChange={(e) => handleCommentChange(activeArt.id, e.target.value)} placeholder="Add a comment..." className="flex-1 rounded-md px-3 py-2 dark:bg-gray-800 light:bg-gray-100 border dark:border-gray-700 light:border-gray-200" />
                            <Button size="sm" onClick={() => handleAddComment(activeArt.id)}>Post</Button>
                          </div>
                          {commentErrors[activeArt.id] && <div className="mt-2 text-sm text-red-400">{commentErrors[activeArt.id]}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </TabsContent>

              <TabsContent value="featured">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredArtists.map((artist) => (
                    <Card key={artist.username} className="dark:bg-gray-900/50 light:bg-white dark:border-purple-500/20 light:border-purple-200 backdrop-blur-xl hover:border-purple-500/50 transition-colors cursor-pointer hover:shadow-md">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                          <Avatar className="h-16 w-16 border-2 dark:border-purple-500 light:border-purple-200">
                            <AvatarImage src={`/placeholder_64px.png?height=64&width=64`} />
                            <AvatarFallback className="dark:bg-purple-600 light:bg-pink-500 text-white">{artist.username.slice(1, 3).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="dark:text-white light:text-gray-900 font-bold">{artist.username}</h3>
                            <p className="dark:text-gray-400 light:text-gray-600 text-sm">{artist.followers} followers</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="dark:bg-purple-500/20 light:bg-pink-500/20 dark:text-purple-300 light:text-pink-300 dark:border-purple-500/30 light:border-pink-500/30">{artist.artworks} artworks</Badge>
                          <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">Follow</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="new">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...trendingArtworks].reverse().map((artwork) => (
                    <Card key={artwork.id} className="dark:bg-gray-900/50 light:bg-white dark:border-purple-500/20 light:border-purple-200 backdrop-blur-xl overflow-hidden group cursor-pointer hover:scale-105 transition-transform hover:shadow-lg">
                      <div className="relative aspect-square">
                        <Image src={artwork.image || "/placeholder.svg"} alt={artwork.title} fill className="object-cover" />
                        <Badge className="absolute top-4 right-4 bg-green-500 text-white"><Sparkles className="h-3 w-3 mr-1" />New</Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="dark:text-white light:text-gray-900 font-bold mb-1">{artwork.title}</h3>
                        <p className="dark:text-gray-400 light:text-gray-600 text-sm mb-3">{artwork.artist}</p>
                        <div className="flex items-center gap-4 text-sm dark:text-gray-400 light:text-gray-600">
                          <span className="flex items-center gap-1"><Heart className="h-4 w-4" />{artwork.likes}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      {moderationModal && <ModerationModal state={moderationModal} onClose={() => setModerationModal(null)} />}
    </div>
  )
}

// Render moderation modal inside the same file (component uses `moderationModal` state)
// We render the modal here by exporting it below and referencing the state from the component.

// Moderation modal (rendered by the page component)
// Rendered outside the component tree to avoid nested JSX complexities — helper mount point
// We'll append modal markup at the end of the file via a small component-like block
export function ModerationModal({ state, onClose }: { state: { message: string } | null; onClose: () => void }) {
  if (!state) return null
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-[10000] w-full max-w-xl mx-4">
        <div className="bg-red-600 text-white rounded-xl shadow-2xl overflow-hidden transform transition-transform scale-100 ring-4 ring-red-700/30">
          <div className="p-4 flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                !
              </div>
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold">Comment blocked</div>
              <div className="mt-2 text-sm opacity-90">{state.message}</div>
            </div>
            <div className="ml-4">
              <button onClick={onClose} className="text-white/90 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="border-t border-white/10 p-3 text-right">
            <button onClick={onClose} className="bg-white/10 text-white px-4 py-2 rounded-md hover:bg-white/20">Got it</button>
          </div>
        </div>
      </div>
    </div>
  )
}

