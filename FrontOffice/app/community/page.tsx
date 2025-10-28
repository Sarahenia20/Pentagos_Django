"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowRight, TrendingUp, Star, Sparkles, Heart, MessageCircle, Share2, Pencil, Trash2, X, Check } from "lucide-react"
import { UserNav } from "@/components/user-nav"
import { toast } from 'sonner'
import apiClient from '@/lib/api'
import { useEffect } from 'react'

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState("trending")

  // Load trending artworks from backend
  const [trendingArtworks, setTrendingArtworks] = useState<any[]>([])
  const [loadingArtworks, setLoadingArtworks] = useState(false)

  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const [likesCount, setLikesCount] = useState<number | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentContent, setEditingCommentContent] = useState('')

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

  useEffect(() => {
    const loadArtworks = async () => {
      setLoadingArtworks(true)
      try {
        const res = await fetch(`${API_BASE}/artworks/?ordering=-likes_count&is_public=true&page_size=12`, {
          headers: apiClient.headers()
        })
        if (!res.ok) {
          console.error('Failed to fetch artworks', res.status)
          setTrendingArtworks([])
          return
        }
        const data = await res.json()
        // If API returns paginated results, handle 'results'
        const items = data.results || data
        setTrendingArtworks(items)
      } catch (err) {
        console.error('Error loading artworks', err)
        setTrendingArtworks([])
      } finally {
        setLoadingArtworks(false)
      }
    }

    loadArtworks()
  }, [])

  // Check if URL has artwork parameter and auto-open it
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const artworkId = params.get('artwork')
    
    if (artworkId && trendingArtworks.length > 0) {
      // Find artwork in loaded artworks or fetch it directly
      const artwork = trendingArtworks.find(a => a.id === artworkId)
      if (artwork) {
        openArtwork(artwork)
      } else {
        // Fetch artwork directly if not in list
        fetch(`${API_BASE}/artworks/${artworkId}/`, { headers: apiClient.headers() })
          .then(res => res.json())
          .then(data => openArtwork(data))
          .catch(err => {
            console.error('Failed to load shared artwork', err)
            toast.error('Artwork not found')
          })
      }
    }
  }, [trendingArtworks])

  const openArtwork = async (artwork: any) => {
    // Try to fetch artwork details from backend
    try {
      const res = await fetch(`${API_BASE}/artworks/${artwork.id}/` , { headers: apiClient.headers() })
      if (!res.ok) {
        // Fallback to mock data
        setSelectedArtwork(artwork)
        setLikesCount(artwork.likes)
        setComments([])
        return
      }
      const data = await res.json()
      setSelectedArtwork(data)
      setLikesCount(data.likes_count)

      // Load comments
      const cRes = await fetch(`${API_BASE}/artworks/${artwork.id}/comments/` , { headers: apiClient.headers() })
      if (cRes.ok) {
        const cData = await cRes.json()
        setComments(cData)
      } else {
        // If unauthenticated or other error, read message
        const errBody = await cRes.json().catch(() => ({}))
        console.warn('Comments fetch failed', cRes.status, errBody)
        setComments([])
      }

      // Determine if current user liked the artwork by checking own likes endpoint (optional)
      // For now we infer from ArtworkLike existence by attempting a GET of comments; UI will optimistically toggle
      setIsLiked(false)
    } catch (err) {
      console.error('Failed to load artwork', err)
      setSelectedArtwork(artwork)
      setLikesCount(artwork.likes)
      setComments([])
    }
  }

  const closeArtwork = () => {
    setSelectedArtwork(null)
    setComments([])
    setNewComment('')
    setLikesCount(null)
    setIsLiked(false)
  }

  const toggleLike = async () => {
    if (!selectedArtwork) return
    try {
      const token = apiClient.getToken()
  if (!token) { toast.error('Please log in to like'); return }

      const res = await fetch(`${API_BASE}/artworks/${selectedArtwork.id}/like/`, {
        method: 'POST',
        headers: apiClient.headers(),
      })

      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = body.detail || body.error || JSON.stringify(body)
        toast.error('Like failed: ' + msg)
        return
      }

      setLikesCount(body.likes_count)
      setIsLiked(body.status === 'liked')
    } catch (err) {
      console.error(err)
      alert('Like failed: ' + (err as any).message)
    }
  }

  const postComment = async () => {
    if (!selectedArtwork || !newComment.trim()) return
    try {
      const token = apiClient.getToken()
  if (!token) { toast.error('Please log in to comment'); return }

      // Pre-check moderation to improve UX (server still enforces moderation)
      try {
        const modRes = await fetch(`${API_BASE}/moderate/`, {
          method: 'POST',
          headers: apiClient.headers(),
          body: JSON.stringify({ content: newComment })
        })
        if (modRes.ok) {
          const modBody = await modRes.json().catch(() => ({}))
          if (modBody && modBody.blocked) {
            const reasons: string[] = modBody.reasons || []
            const friendly = reasons.map((r) => {
              if (r.includes('profan') || r === 'profanity') return 'Contains disallowed words'
              if (r.includes('link') || r === 'contains_link') return 'Contains link or URL'
              if (r.includes('spam') || r === 'suspicious_content') return 'Looks like spam or gibberish'
              if (r.includes('violence')) return 'Contains violent or harmful content'
              if (r.includes('self_harm')) return 'Contains self-harm content'
              return r
            })

            const message = `Comment blocked by precheck: ${friendly.join(', ')}`
            toast.error(message)
            setCommentError(message)
            setTimeout(() => setCommentError(null), 6000)
            return
          }
        }
      } catch (mErr) {
        // If moderation pre-check fails, allow the request to continue to the server
        console.warn('Moderation pre-check failed, continuing to post:', mErr)
      }

      // Debugging: log request payload and headers
      console.debug('Posting comment', { artworkId: selectedArtwork.id, content: newComment })

      const res = await fetch(`${API_BASE}/artworks/${selectedArtwork.id}/comments/`, {
        method: 'POST',
        headers: apiClient.headers(),
        body: JSON.stringify({ content: newComment })
      })

      const body = await res.json().catch(() => ({}))
      console.debug('Comment response', res.status, body)

      if (!res.ok) {
        // If backend returned moderation reasons, map them to friendly messages
        if (body && body.reasons) {
          const reasons: string[] = body.reasons
          const friendly = reasons.map((r) => {
            if (r.includes('profan') || r === 'profanity') return 'Contains disallowed words'
            if (r.includes('link') || r === 'contains_link') return 'Contains link or URL'
            if (r.includes('spam') || r === 'suspicious_content') return 'Looks like spam or gibberish'
            if (r.includes('violence')) return 'Contains violent or harmful content'
            if (r.includes('self_harm')) return 'Contains self-harm content'
            return r
          })

          const message = `Comment blocked: ${friendly.join(', ')}`
          // show toast and inline error
          toast.error(message)
          setCommentError(message)
          // auto-clear inline error after 6s
          setTimeout(() => setCommentError(null), 6000)
          return
        }

        const msg = body.detail || body.error || JSON.stringify(body)
        toast.error('Comment failed: ' + msg)
        setCommentError(msg)
        setTimeout(() => setCommentError(null), 6000)
        return
      }

      setComments((c) => [...c, body])
      setNewComment('')
      setCommentError(null)
    } catch (err) {
      console.error(err)
      toast.error('Comment failed: ' + (err as any).message)
      setCommentError((err as any).message)
      setTimeout(() => setCommentError(null), 6000)
    }
  }

  const featuredArtists = [
    { username: "@neonartist", artworks: 127, followers: "2.3k" },
    { username: "@flowmaster", artworks: 89, followers: "1.8k" },
    { username: "@cosmicart", artworks: 156, followers: "3.1k" },
  ]

  return (
    <div className="min-h-screen dark:bg-black light:bg-white dark:text-white light:text-gray-900 overflow-hidden">
      {/* Background gradient - matching landing page */}
      <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-purple-900/20 dark:via-black dark:to-pink-900/20 light:bg-gradient-to-br light:from-purple-100 light:via-white light:to-pink-100" />

      <div className="relative z-10">

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold dark:text-white light:text-gray-900 mb-2">Community Discovery</h1>
                <p className="dark:text-gray-300 light:text-gray-600">
                  Explore trending artworks and discover talented artists
                </p>
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
                <TabsTrigger
                  value="trending"
                  className="data-[state=active]:dark:bg-purple-500 data-[state=active]:light:bg-pink-500 data-[state=active]:dark:text-white data-[state=active]:light:text-gray-900"
                >
                  <TrendingUp className="mr-2 h-4 w-4 dark:text-purple-400 light:text-purple-600" />
                  Trending
                </TabsTrigger>
                <TabsTrigger
                  value="featured"
                  className="data-[state=active]:dark:bg-purple-500 data-[state=active]:light:bg-pink-500 data-[state=active]:dark:text-white data-[state=active]:light:text-gray-900"
                >
                  <Star className="mr-2 h-4 w-4" />
                  Featured
                </TabsTrigger>
                <TabsTrigger
                  value="new"
                  className="data-[state=active]:dark:bg-purple-500 data-[state=active]:light:bg-pink-500 data-[state=active]:dark:text-white data-[state=active]:light:text-gray-900"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  New
                </TabsTrigger>
              </TabsList>

              {/* Trending Tab */}
              <TabsContent value="trending" className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold dark:text-white light:text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 dark:text-purple-400 light:text-purple-600" />
                    Trending Today
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trendingArtworks.map((artwork) => (
                      <Card
                        key={artwork.id}
                        onClick={() => openArtwork(artwork)}
                        className="dark:bg-gray-900/50 light:bg-white dark:border-purple-500/20 light:border-purple-200 backdrop-blur-xl overflow-hidden group cursor-pointer hover:scale-105 transition-transform hover:shadow-lg hover:shadow-purple-500/20"
                      >
                        <div className="relative aspect-square">
                          <Image
                            src={artwork.image || "/placeholder.svg"}
                            alt={artwork.title}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                              <h3 className="dark:text-white light:text-gray-900 font-bold text-lg">{artwork.title}</h3>
                              <p className="dark:text-gray-300 light:text-gray-600 text-sm">{artwork.user?.username || 'Anonymous'}</p>
                            </div>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm dark:text-gray-300 light:text-gray-600">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openArtwork(artwork)
                                }} 
                                className="flex items-center gap-1 hover:dark:text-pink-400 hover:light:text-purple-400 transition-colors"
                              >
                                <Heart className="h-4 w-4" />
                                {artwork.likes_count || artwork.likes || 0}
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openArtwork(artwork)
                                }} 
                                className="flex items-center gap-1 hover:dark:text-purple-400 hover:light:text-pink-400 transition-colors"
                              >
                                <MessageCircle className="h-4 w-4" />
                                {artwork.comments_count || 0}
                              </button>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                const url = `${window.location.origin}/community?artwork=${artwork.id}`
                                navigator.clipboard.writeText(url)
                                toast.success('Link copied to clipboard!')
                              }}
                              className="dark:text-gray-300 light:text-gray-600 hover:dark:text-purple-400 hover:light:text-pink-400 transition-colors"
                            >
                              <Share2 className="h-4 w-4" />
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
            {/* Artwork modal */}
            {selectedArtwork && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="bg-white dark:bg-gray-900 rounded-lg w-11/12 md:w-4/5 lg:w-4/5 max-h-[92vh] overflow-hidden flex">
                  {/* Left: Big image */}
                  <div className="w-2/3 bg-black flex items-center justify-center">
                    {selectedArtwork.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedArtwork.image_url} alt={selectedArtwork.title} className="w-full h-full object-cover" />
                    ) : (
                      <img src={selectedArtwork.image || '/placeholder.svg'} alt={selectedArtwork.title} className="w-full h-full object-cover" />
                    )}
                  </div>

                  {/* Right: Info panel */}
                  <div className="w-1/3 bg-[#0f1724] dark:bg-[#0f1724] text-white p-6 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>{selectedArtwork.user?.username?.slice(0,2).toUpperCase() || 'AN'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{selectedArtwork.user?.first_name || selectedArtwork.user?.username || 'Anonymous'}</p>
                          <p className="text-xs text-gray-300">{selectedArtwork.user?.email || 'Seeded from ' + (selectedArtwork.title || '')}</p>
                        </div>
                      </div>
                      <button onClick={closeArtwork} className="text-sm text-gray-300">✕</button>
                    </div>

                    <div className="mb-4">
                      <h4 className="text-sm uppercase text-gray-400 mb-2">Prompt</h4>
                      <p className="text-sm text-gray-200">{selectedArtwork.prompt || selectedArtwork.title}</p>
                    </div>

                    {/* AI Caption Section */}
                    {selectedArtwork.ai_caption && (
                      <div className="mb-4 p-3 rounded bg-purple-900/20 border border-purple-500/30">
                        <h4 className="text-sm uppercase text-purple-300 mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          AI Caption
                        </h4>
                        <p className="text-sm text-gray-200 mb-2">{selectedArtwork.ai_caption}</p>
                        {selectedArtwork.ai_tags && selectedArtwork.ai_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {selectedArtwork.ai_tags.map((tag: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs bg-purple-500/10 text-purple-300 border-purple-500/30">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {selectedArtwork.ai_caption_generated_at && (
                          <p className="text-xs text-gray-400 mt-2">
                            Generated {new Date(selectedArtwork.ai_caption_generated_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Generate Caption Button */}
                    {!selectedArtwork.ai_caption && (
                      <div className="mb-4">
                        <Button
                          onClick={async () => {
                            const token = apiClient.getToken()
                            if (!token) { toast.error('Please log in to generate caption'); return }

                            toast.info('Generating AI caption...')
                            try {
                              const res = await fetch(`${API_BASE}/artworks/${selectedArtwork.id}/generate_caption/`, {
                                method: 'POST',
                                headers: apiClient.headers()
                              })
                              const body = await res.json()
                              if (!res.ok) {
                                toast.error(body.error || 'Failed to generate caption')
                                return
                              }
                              toast.success('Caption generation started! Refresh in a few moments.')
                            } catch (err) {
                              toast.error('Failed to generate caption: ' + (err as any).message)
                            }
                          }}
                          size="sm"
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate AI Caption
                        </Button>
                      </div>
                    )}

                    <div className="mb-4 text-xs text-gray-400 space-y-1">
                      <div><strong className="text-gray-200">AI:</strong> {selectedArtwork.ai_provider || 'N/A'}</div>
                      <div><strong className="text-gray-200">Size:</strong> {selectedArtwork.image_size || 'N/A'}</div>
                      <div><strong className="text-gray-200">Date:</strong> {selectedArtwork.created_at ? new Date(selectedArtwork.created_at).toLocaleString() : ''}</div>
                    </div>

                    <div className="flex-1 overflow-y-auto mb-4">
                      <h5 className="text-sm font-semibold mb-3">Comments</h5>
                      <div className="space-y-3">
                        {comments.length ? comments.map((c) => (
                          <div key={c.id} className="flex items-start gap-3 group">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{c.user?.username?.slice(0,2).toUpperCase() || 'GU'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-xs mb-1">
                                <strong className="text-gray-200">{c.user?.username || 'Guest'}</strong>{' '}
                                <span className="text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                                {c.updated_at !== c.created_at && (
                                  <span className="text-gray-500 text-xs ml-1">(edited)</span>
                                )}
                              </p>
                              
                              {editingCommentId === c.id ? (
                                <div className="flex flex-col gap-2">
                                  <textarea
                                    value={editingCommentContent}
                                    onChange={(e) => setEditingCommentContent(e.target.value)}
                                    className="w-full px-2 py-1 rounded bg-gray-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    rows={2}
                                  />
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={async () => {
                                        try {
                                          const res = await fetch(`${API_BASE}/comments/${c.id}/`, {
                                            method: 'PATCH',
                                            headers: apiClient.headers(),
                                            body: JSON.stringify({ content: editingCommentContent })
                                          })
                                          if (!res.ok) throw new Error('Failed to update comment')
                                          
                                          const updated = await res.json()
                                          setComments(comments.map(comment => comment.id === c.id ? updated : comment))
                                          setEditingCommentId(null)
                                          toast.success('Comment updated')
                                        } catch (err) {
                                          toast.error('Failed to update comment')
                                        }
                                      }}
                                      className="h-7 px-2"
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={() => setEditingCommentId(null)}
                                      className="h-7 px-2"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between">
                                  <p className="text-sm text-gray-200 flex-1">{c.content}</p>
                                  
                                  {c.is_author && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingCommentId(c.id)
                                          setEditingCommentContent(c.content)
                                        }}
                                        className="h-6 w-6 p-0 text-gray-400 hover:text-blue-400"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={async () => {
                                          if (!confirm('Delete this comment?')) return
                                          try {
                                            const res = await fetch(`${API_BASE}/comments/${c.id}/`, {
                                              method: 'DELETE',
                                              headers: apiClient.headers()
                                            })
                                            if (!res.ok) throw new Error('Failed to delete comment')
                                            
                                            setComments(comments.filter(comment => comment.id !== c.id))
                                            toast.success('Comment deleted')
                                          } catch (err) {
                                            toast.error('Failed to delete comment')
                                          }
                                        }}
                                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )) : (
                          <p className="text-sm text-gray-400">No comments yet</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-800">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4 text-sm">
                          <button onClick={toggleLike} className="flex items-center gap-2 text-pink-400">
                            <Heart className="h-5 w-5" />
                            <span>{likesCount ?? selectedArtwork.likes ?? selectedArtwork.likes_count ?? 0}</span>
                          </button>
                          <div className="flex items-center gap-1 text-gray-300">
                            <MessageCircle className="h-5 w-5" />
                            <span>{comments.length}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">{selectedArtwork.created_at ? new Date(selectedArtwork.created_at).toLocaleDateString() : ''}</div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <input
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            className={`flex-1 px-3 py-2 rounded bg-gray-800 text-white focus:outline-none ${commentError ? 'ring-2 ring-red-500' : ''}`}
                          />
                          <Button onClick={postComment} className="bg-white text-black">Post</Button>
                        </div>
                        {commentError && (
                          <p className="text-sm text-red-400">{commentError}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
                  </div>
                </div>

                {/* Featured Artists */}
                <div>
                  <h2 className="text-2xl font-bold dark:text-white light:text-gray-900 mb-4 flex items-center gap-2">
                    <Star className="h-6 w-6 text-amber-400" />
                    Featured Artists
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {featuredArtists.map((artist) => (
                      <Card
                        key={artist.username}
                        className="dark:bg-gray-900/50 light:bg-white dark:border-purple-500/20 light:border-purple-200 backdrop-blur-xl hover:border-purple-500/50 transition-colors cursor-pointer hover:shadow-md"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4 mb-4">
                            <Avatar className="h-16 w-16 border-2 dark:border-purple-500 light:border-purple-200">
                              <AvatarImage src={`/placeholder_64px.png?height=64&width=64`} />
                              <AvatarFallback className="dark:bg-purple-600 light:bg-pink-500 text-white">
                                {artist.username.slice(1, 3).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="dark:text-white light:text-gray-900 font-bold">{artist.username}</h3>
                              <p className="dark:text-gray-400 light:text-gray-600 text-sm">
                                {artist.followers} followers
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge
                              variant="secondary"
                              className="dark:bg-purple-500/20 light:bg-pink-500/20 dark:text-purple-300 light:text-pink-300 dark:border-purple-500/30 light:border-pink-500/30"
                            >
                              {artist.artworks} artworks
                            </Badge>
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                            >
                              Follow
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Featured Tab */}
              <TabsContent value="featured">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trendingArtworks.slice(0, 3).map((artwork) => (
                    <Card
                      key={artwork.id}
                      className="dark:bg-gray-900/50 light:bg-white dark:border-purple-500/20 light:border-purple-200 backdrop-blur-xl overflow-hidden group cursor-pointer hover:scale-105 transition-transform hover:shadow-lg"
                    >
                      <div className="relative aspect-square">
                        <Image
                          src={artwork.image || "/placeholder.svg"}
                          alt={artwork.title}
                          fill
                          className="object-cover"
                        />
                        <Badge className="absolute top-4 right-4 bg-amber-500 text-white">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="dark:text-white light:text-gray-900 font-bold mb-1">{artwork.title}</h3>
                        <p className="dark:text-gray-400 light:text-gray-600 text-sm mb-3">{artwork.artist}</p>
                        <div className="flex items-center gap-4 text-sm dark:text-gray-400 light:text-gray-600">
                          <span className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            {artwork.likes}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* New Tab */}
              <TabsContent value="new">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...trendingArtworks].reverse().map((artwork) => (
                    <Card
                      key={artwork.id}
                      className="dark:bg-gray-900/50 light:bg-white dark:border-purple-500/20 light:border-purple-200 backdrop-blur-xl overflow-hidden group cursor-pointer hover:scale-105 transition-transform hover:shadow-lg"
                    >
                      <div className="relative aspect-square">
                        <Image
                          src={artwork.image || "/placeholder.svg"}
                          alt={artwork.title}
                          fill
                          className="object-cover"
                        />
                        <Badge className="absolute top-4 right-4 bg-green-500 text-white">
                          <Sparkles className="h-3 w-3 mr-1" />
                          New
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="dark:text-white light:text-gray-900 font-bold mb-1">{artwork.title}</h3>
                        <p className="dark:text-gray-400 light:text-gray-600 text-sm mb-3">{artwork.artist}</p>
                        <div className="flex items-center gap-4 text-sm dark:text-gray-400 light:text-gray-600">
                          <span className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            {artwork.likes}
                          </span>
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
    </div>
  )
}
