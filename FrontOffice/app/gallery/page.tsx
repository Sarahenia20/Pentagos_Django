"use client"

import { useState, useEffect } from "react"
import { 
  Search, Filter, Heart, Download, Share2, Plus, Loader2, Trash2, Check, 
  Folder, FolderPlus, X, Sparkles, TrendingUp, Star, Flame, Zap,
  Award, Eye, Share, ArrowUpCircle, Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserNav } from "@/components/user-nav"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Image from "next/image"
import { toast } from "sonner"
import { apiClient, getImageUrl } from "@/lib/api"

// Enhanced Artwork interface matching new backend models
interface Artwork {
  id: string
  title: string
  description?: string
  prompt: string
  enhanced_prompt?: string
  negative_prompt?: string
  image: string
  cloudinary_url?: string
  ai_provider: string
  ai_model?: string
  generation_type: string
  generation_seed?: number
  style_preset?: string
  image_size: string
  created_at: string
  updated_at: string
  
  // Social features
  likes_count: number
  views_count: number
  shares_count: number
  downloads_count: number
  
  // Quality metrics
  quality_score: number
  aesthetic_score: number
  
  // Engagement & Analytics
  engagement_score: number
  trending_score: number
  
  // NFT fields
  is_nft: boolean
  nft_blockchain?: string
  nft_contract_address?: string
  nft_token_id?: string
  
  // AI metadata
  ai_tags: string[]
  ai_dominant_colors?: Array<{ hex: string; percentage: number }>
  ai_caption?: string
  
  // Status
  status: string
  is_public: boolean
  is_featured: boolean
  
  // Licensing
  license_type?: string
  is_for_sale: boolean
  sale_price?: number
  sale_currency?: string
}

interface Collection {
  id: string
  name: string
  artworkIds: string[]
  description?: string
  theme_color?: string
}

interface AICollectionSuggestion {
  name: string
  description: string
  artworkIds: string[]
  keywords: string[]
}

// Reaction types matching backend
type ReactionType = 'like' | 'love' | 'fire' | 'mind_blown' | 'star'

const REACTIONS: Record<ReactionType, { icon: string; label: string; color: string }> = {
  like: { icon: '👍', label: 'Like', color: 'text-blue-500' },
  love: { icon: '❤️', label: 'Love', color: 'text-red-500' },
  fire: { icon: '🔥', label: 'Fire', color: 'text-orange-500' },
  mind_blown: { icon: '🤯', label: 'Mind Blown', color: 'text-purple-500' },
  star: { icon: '⭐', label: 'Star', color: 'text-yellow-500' }
}

export default function GalleryPage() {
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterBy, setFilterBy] = useState("all")
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending' | 'quality'>('recent')
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Bulk selection
  const [selectedArtworkIds, setSelectedArtworkIds] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  
  // Collections
  const [collections, setCollections] = useState<Collection[]>([])
  const [showCollectionDialog, setShowCollectionDialog] = useState(false)
  const [showAddToCollectionDialog, setShowAddToCollectionDialog] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState("")
  const [newCollectionDescription, setNewCollectionDescription] = useState("")
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [showDeleteCollectionDialog, setShowDeleteCollectionDialog] = useState(false)
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null)
  
  // AI Collections
  const [isGeneratingAICollections, setIsGeneratingAICollections] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<AICollectionSuggestion[]>([])
  const [showAISuggestionsDialog, setShowAISuggestionsDialog] = useState(false)
  
  // Reactions
  const [showReactionsMenu, setShowReactionsMenu] = useState(false)
  const [selectedReactionArtwork, setSelectedReactionArtwork] = useState<string | null>(null)

  // Fetch user's artworks on mount
  useEffect(() => {
    fetchArtworks()
    loadCollections()
  }, [])

  const fetchArtworks = async () => {
    setIsLoading(true)
    try {
      let filters: any = { 
        status: 'completed',
        ordering: '-created_at'
      }
      
      // Get user profile to filter by user ID
      try {
        const userProfile = await apiClient.getUserProfile()
        if (userProfile && userProfile.id) {
          filters.user = userProfile.id
        }
      } catch (profileError) {
        console.log("Could not fetch user profile, showing all accessible artworks")
      }
      
      const response = await apiClient.getArtworks(filters)
      const artworksData = response.results || response
      setArtworks(artworksData)
      
      if (artworksData.length === 0) {
        toast.info("🎨 No artworks yet", {
          description: "Create your first masterpiece in the Studio!"
        })
      }
    } catch (error) {
      console.error("Failed to fetch artworks:", error)
      toast.error("Failed to load artworks", {
        description: "Please try refreshing the page"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load collections from localStorage
  const loadCollections = () => {
    const saved = localStorage.getItem('pentaart_collections')
    if (saved) {
      setCollections(JSON.parse(saved))
    }
  }

  // Save collections to localStorage
  const saveCollections = (newCollections: Collection[]) => {
    setCollections(newCollections)
    localStorage.setItem('pentaart_collections', JSON.stringify(newCollections))
  }

  // Create new collection
  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) {
      toast.error("Please enter a collection name")
      return
    }

    const newCollection: Collection = {
      id: Date.now().toString(),
      name: newCollectionName.trim(),
      description: newCollectionDescription.trim(),
      artworkIds: []
    }

    saveCollections([...collections, newCollection])
    setNewCollectionName("")
    setNewCollectionDescription("")
    setShowCollectionDialog(false)
    toast.success(`📁 Collection "${newCollection.name}" created`)
  }

  // Add artworks to collection
  const handleAddToCollection = (collectionId: string) => {
    const collection = collections.find(c => c.id === collectionId)
    if (!collection) return

    const artworksToAdd = isSelectionMode && selectedArtworkIds.length > 0 
      ? selectedArtworkIds 
      : selectedArtwork ? [selectedArtwork.id] : []

    if (artworksToAdd.length === 0) {
      toast.error("No artworks selected")
      return
    }

    const updatedCollections = collections.map(c => {
      if (c.id === collectionId) {
        const newArtworkIds = [...new Set([...c.artworkIds, ...artworksToAdd])]
        return { ...c, artworkIds: newArtworkIds }
      }
      return c
    })

    saveCollections(updatedCollections)
    setShowAddToCollectionDialog(false)
    toast.success(`✅ Added ${artworksToAdd.length} artwork(s) to "${collection.name}"`)
  }

  // Delete collection
  const handleDeleteCollection = async (collectionId: string, deleteArtworks: boolean = false) => {
    const collection = collections.find(c => c.id === collectionId)
    if (!collection) return

    saveCollections(collections.filter(c => c.id !== collectionId))
    
    if (selectedCollection === collectionId) {
      setSelectedCollection(null)
    }

    if (deleteArtworks && collection.artworkIds.length > 0) {
      setIsLoading(true)
      try {
        const deletePromises = collection.artworkIds.map(id => apiClient.deleteArtwork(id))
        await Promise.all(deletePromises)
        setArtworks(artworks.filter(a => !collection.artworkIds.includes(a.id)))
        toast.success(`✅ Collection "${collection.name}" and ${collection.artworkIds.length} artwork(s) deleted`)
      } catch (error) {
        console.error("Failed to delete artworks:", error)
        toast.error("Collection deleted but some artworks failed to delete")
      } finally {
        setIsLoading(false)
      }
    } else {
      toast.success(`🗑️ Collection "${collection.name}" deleted`)
    }
    
    setShowDeleteCollectionDialog(false)
    setCollectionToDelete(null)
  }

  // Download artwork
  const handleDownloadArtwork = async (artwork: Artwork) => {
    try {
      const imageUrl = artwork.cloudinary_url || artwork.image
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${artwork.title.replace(/[^a-z0-9]/gi, '_')}_${artwork.id}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      // Increment download count
      artwork.downloads_count = (artwork.downloads_count || 0) + 1
      
      toast.success(`📥 Downloaded "${artwork.title}"`)
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Failed to download artwork')
    }
  }

  // Handle reaction
  const handleReaction = async (artworkId: string, reactionType: ReactionType) => {
    try {
      // Call API to add reaction
      // await apiClient.addReaction(artworkId, reactionType)
      
      // Update local state
      setArtworks(artworks.map(a => 
        a.id === artworkId 
          ? { ...a, likes_count: a.likes_count + 1 }
          : a
      ))
      
      const reaction = REACTIONS[reactionType]
      toast.success(`${reaction.icon} ${reaction.label}!`)
    } catch (error) {
      console.error('Reaction failed:', error)
      toast.error('Failed to add reaction')
    }
  }

  // AI: Generate smart collections
  const handleGenerateAICollections = async () => {
    if (artworks.length < 3) {
      toast.error("Need at least 3 artworks to generate AI collections")
      return
    }

    setIsGeneratingAICollections(true)
    toast.info("🤖 AI is analyzing your artworks...")

    try {
      const artworkData = artworks.map(a => ({
        id: a.id,
        title: a.title,
        prompt: a.prompt,
        generation_type: a.generation_type,
        ai_provider: a.ai_provider,
        style_preset: a.style_preset,
        ai_tags: a.ai_tags,
        quality_score: a.quality_score,
        aesthetic_score: a.aesthetic_score
      }))

      const groqApiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY
      if (!groqApiKey) {
        throw new Error('Groq API key not configured')
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: 'You are an expert art curator. Analyze artworks and suggest intelligent collections based on themes, styles, quality, and aesthetics. Return ONLY valid JSON.'
            },
            {
              role: 'user',
              content: `Analyze these artworks and suggest 3-6 smart collections. Each collection should have 2+ artworks with similar characteristics.

Artworks:
${JSON.stringify(artworkData, null, 2)}

Return JSON format:
{
  "collections": [
    {
      "name": "Collection Name",
      "description": "Brief description",
      "artworkIds": ["id1", "id2"],
      "keywords": ["keyword1", "keyword2"]
    }
  ]
}

Consider: themes, styles, quality scores, aesthetics, AI providers, and moods.`
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      })

      if (!response.ok) throw new Error('AI analysis failed')

      const data = await response.json()
      const content = data.choices[0]?.message?.content || '{}'
      
      let aiResponse
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        aiResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : { collections: [] }
      } catch (e) {
        console.error('Failed to parse AI response:', e)
        aiResponse = { collections: [] }
      }

      if (!aiResponse.collections || aiResponse.collections.length === 0) {
        // Fallback collections
        const suggestions: AICollectionSuggestion[] = []
        
        // By quality
        const highQuality = artworks.filter(a => (a.quality_score || 0) > 0.8)
        if (highQuality.length >= 2) {
          suggestions.push({
            name: 'Premium Quality',
            description: 'High-quality artworks with excellent scores',
            artworkIds: highQuality.map(a => a.id),
            keywords: ['high-quality', 'premium', 'professional']
          })
        }
        
        // By provider
        const providers = [...new Set(artworks.map(a => a.ai_provider))]
        providers.forEach(provider => {
          const providerArtworks = artworks.filter(a => a.ai_provider === provider)
          if (providerArtworks.length >= 2) {
            suggestions.push({
              name: `${provider} Creations`,
              description: `Artworks generated using ${provider}`,
              artworkIds: providerArtworks.map(a => a.id),
              keywords: [provider, 'ai-generated']
            })
          }
        })

        setAiSuggestions(suggestions)
      } else {
        const validSuggestions = aiResponse.collections
          .map((s: any) => ({
            name: s.name,
            description: s.description,
            artworkIds: s.artworkIds.filter((id: string) => artworks.some(a => a.id === id)),
            keywords: s.keywords || []
          }))
          .filter((s: AICollectionSuggestion) => s.artworkIds.length >= 2)

        setAiSuggestions(validSuggestions)
      }

      setShowAISuggestionsDialog(true)
      toast.success(`✨ Found ${aiSuggestions.length || 'some'} smart collection ideas!`)
    } catch (error) {
      console.error('AI collection generation failed:', error)
      toast.error('Failed to generate AI collections')
    } finally {
      setIsGeneratingAICollections(false)
    }
  }

  // Accept AI suggestion
  const handleAcceptAISuggestion = (suggestion: AICollectionSuggestion) => {
    const newCollection: Collection = {
      id: Date.now().toString(),
      name: suggestion.name,
      description: suggestion.description,
      artworkIds: suggestion.artworkIds
    }

    saveCollections([...collections, newCollection])
    setAiSuggestions(aiSuggestions.filter(s => s.name !== suggestion.name))
    toast.success(`✅ Created "${suggestion.name}" with ${suggestion.artworkIds.length} artworks`)
  }

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedArtworkIds.length === 0) {
      toast.error("No artworks selected")
      return
    }

    if (!confirm(`Delete ${selectedArtworkIds.length} artwork(s)? This cannot be undone.`)) {
      return
    }

    try {
      await Promise.all(selectedArtworkIds.map(id => apiClient.deleteArtwork(id)))
      setArtworks(artworks.filter(a => !selectedArtworkIds.includes(a.id)))
      setSelectedArtworkIds([])
      setIsSelectionMode(false)
      toast.success(`🗑️ Deleted ${selectedArtworkIds.length} artwork(s)`)
    } catch (error) {
      console.error("Failed to delete artworks:", error)
      toast.error("Failed to delete some artworks")
    }
  }

  // Toggle selection
  const toggleSelection = (artworkId: string) => {
    setSelectedArtworkIds(prev => 
      prev.includes(artworkId) 
        ? prev.filter(id => id !== artworkId)
        : [...prev, artworkId]
    )
  }

  // Select all
  const handleSelectAll = () => {
    if (selectedArtworkIds.length === sortedArtworks.length) {
      setSelectedArtworkIds([])
    } else {
      setSelectedArtworkIds(sortedArtworks.map(a => a.id))
    }
  }

  // Delete artwork
  const handleDeleteArtwork = async (artworkId: string, artworkTitle: string) => {
    if (!confirm(`Delete "${artworkTitle}"? This cannot be undone.`)) {
      return
    }

    try {
      await apiClient.deleteArtwork(artworkId)
      setArtworks(artworks.filter(a => a.id !== artworkId))
      if (selectedArtwork?.id === artworkId) {
        setSelectedArtwork(null)
      }
      toast.success(`🗑️ "${artworkTitle}" deleted`)
    } catch (error) {
      console.error("Failed to delete artwork:", error)
      toast.error("Failed to delete artwork")
    }
  }

  // Filter and sort artworks
  const filteredArtworks = artworks.filter((artwork) => {
    const matchesSearch = artwork.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         artwork.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         artwork.ai_tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    if (selectedCollection) {
      const collection = collections.find(c => c.id === selectedCollection)
      if (collection && !collection.artworkIds.includes(artwork.id)) {
        return false
      }
    }
    
    if (filterBy === "all") return matchesSearch
    if (filterBy === "ai") return matchesSearch && artwork.generation_type === "ai_prompt"
    if (filterBy === "algorithmic") return matchesSearch && artwork.generation_type === "algorithmic"
    if (filterBy === "nft") return matchesSearch && artwork.is_nft
    if (filterBy === "featured") return matchesSearch && artwork.is_featured
    if (filterBy === "high-quality") return matchesSearch && (artwork.quality_score || 0) > 0.8
    
    // AI provider filters
    if (filterBy.startsWith("ai-")) {
      const provider = filterBy.replace("ai-", "")
      return matchesSearch && artwork.ai_provider === provider
    }
    
    return matchesSearch
  })
  
  // Sort artworks
  const sortedArtworks = [...filteredArtworks].sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    if (sortBy === "popular") {
      return (b.likes_count || 0) - (a.likes_count || 0)
    }
    if (sortBy === "trending") {
      return (b.trending_score || 0) - (a.trending_score || 0)
    }
    if (sortBy === "quality") {
      return (b.quality_score || 0) - (a.quality_score || 0)
    }
    return 0
  })

  // Get quality badge
  const getQualityBadge = (score: number) => {
    if (score >= 0.9) return { label: 'Exceptional', color: 'bg-purple-500' }
    if (score >= 0.8) return { label: 'Excellent', color: 'bg-blue-500' }
    if (score >= 0.7) return { label: 'Good', color: 'bg-green-500' }
    return { label: 'Fair', color: 'bg-gray-500' }
  }

  return (
    <div className="min-h-screen dark:bg-black light:bg-white dark:text-white light:text-gray-900 overflow-hidden">
      <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-purple-900/20 dark:via-black dark:to-pink-900/20 light:bg-gradient-to-br light:from-purple-100 light:via-white light:to-pink-100" />

      <div className="relative z-10">
        <UserNav />

        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold dark:text-white light:text-gray-900 mb-2 flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-purple-500" />
                My Gallery
                {selectedCollection && (
                  <span className="text-2xl text-purple-500">
                    / {collections.find(c => c.id === selectedCollection)?.name}
                  </span>
                )}
              </h1>
              <p className="dark:text-gray-300 light:text-gray-600">
                {artworks.length} masterpieces | {artworks.filter(a => a.is_nft).length} NFTs
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={handleGenerateAICollections}
                disabled={isGeneratingAICollections || artworks.length < 3}
                className="dark:border-purple-500/30 dark:text-white bg-gradient-to-r from-purple-500/10 to-pink-500/10"
              >
                {isGeneratingAICollections ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Collections
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCollectionDialog(true)}
                className="dark:border-purple-500/30 dark:text-white"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                New Collection
              </Button>
              <Button
                variant={isSelectionMode ? "default" : "outline"}
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode)
                  setSelectedArtworkIds([])
                }}
                className={isSelectionMode ? "bg-purple-600" : "dark:border-purple-500/30"}
              >
                <Check className="h-4 w-4 mr-2" />
                {isSelectionMode ? "Done" : "Select"}
              </Button>
            </div>
          </div>

          {/* Collections Tabs */}
          {collections.length > 0 && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <Button
                variant={selectedCollection === null ? "default" : "outline"}
                onClick={() => setSelectedCollection(null)}
                className={selectedCollection === null ? "bg-purple-600" : "dark:border-purple-500/30"}
              >
                <Folder className="h-4 w-4 mr-2" />
                All ({artworks.length})
              </Button>
              {collections.map((collection) => (
                <div key={collection.id} className="relative group">
                  <Button
                    variant={selectedCollection === collection.id ? "default" : "outline"}
                    onClick={() => setSelectedCollection(collection.id)}
                    className={selectedCollection === collection.id ? "bg-purple-600 pr-8" : "dark:border-purple-500/30 pr-8"}
                  >
                    <Folder className="h-4 w-4 mr-2" />
                    {collection.name} ({collection.artworkIds.length})
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-6 opacity-0 group-hover:opacity-100 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation()
                      setCollectionToDelete(collection)
                      setShowDeleteCollectionDialog(true)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Selection Mode */}
          {isSelectionMode && (
            <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedArtworkIds.length === sortedArtworks.length && sortedArtworks.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="dark:text-white">
                  {selectedArtworkIds.length} of {sortedArtworks.length} selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddToCollectionDialog(true)}
                  disabled={selectedArtworkIds.length === 0}
                  className="dark:border-purple-500/30"
                >
                  <Folder className="h-4 w-4 mr-2" />
                  Add to Collection
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={selectedArtworkIds.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by title, prompt, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 dark:bg-gray-900/50 dark:border-purple-500/30"
              />
            </div>
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-full md:w-[200px] dark:bg-gray-900/50 dark:border-purple-500/30">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Artworks</SelectItem>
                <SelectItem value="featured">⭐ Featured</SelectItem>
                <SelectItem value="nft">💎 NFTs</SelectItem>
                <SelectItem value="high-quality">🏆 High Quality</SelectItem>
                <SelectItem value="ai">🤖 AI Generated</SelectItem>
                <SelectItem value="algorithmic">📐 Algorithmic</SelectItem>
                <SelectItem value="ai-gemini">Gemini</SelectItem>
                <SelectItem value="ai-openai">OpenAI</SelectItem>
                <SelectItem value="ai-groq">Groq</SelectItem>
                <SelectItem value="ai-huggingface">HuggingFace</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-full md:w-[180px] dark:bg-gray-900/50 dark:border-purple-500/30">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">📅 Most Recent</SelectItem>
                <SelectItem value="popular">❤️ Most Liked</SelectItem>
                <SelectItem value="trending">🔥 Trending</SelectItem>
                <SelectItem value="quality">⭐ Best Quality</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Gallery Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <span className="ml-3 text-gray-400">Loading gallery...</span>
            </div>
          ) : sortedArtworks.length === 0 ? (
            <div className="text-center py-20">
              <Sparkles className="h-16 w-16 text-purple-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-4">No artworks found</p>
              <Button
                onClick={() => window.location.href = '/studio'}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                Create Your First Artwork
              </Button>
            </div>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
              {sortedArtworks.map((artwork) => {
                const isSelected = selectedArtworkIds.includes(artwork.id)
                const qualityBadge = getQualityBadge(artwork.quality_score || 0)
                
                return (
                  <div
                    key={artwork.id}
                    className="break-inside-avoid group cursor-pointer relative mb-4"
                  >
                    <div 
                      className={`relative overflow-hidden rounded-lg shadow-md hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 border dark:border-purple-500/20 bg-gray-800 ${isSelected ? 'ring-4 ring-purple-500' : ''}`}
                      onClick={() => {
                        if (isSelectionMode) {
                          toggleSelection(artwork.id)
                        } else {
                          setSelectedArtwork(artwork)
                        }
                      }}
                    >
                      {/* Badges */}
                      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                        {isSelectionMode && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(artwork.id)}
                            className="bg-white border-2"
                          />
                        )}
                        {artwork.is_nft && (
                          <Badge className="bg-gradient-to-r from-purple-600 to-pink-600">
                            💎 NFT
                          </Badge>
                        )}
                        {artwork.is_featured && (
                          <Badge className="bg-yellow-500">
                            ⭐ Featured
                          </Badge>
                        )}
                        {(artwork.quality_score || 0) > 0 && (
                          <Badge className={qualityBadge.color}>
                            {qualityBadge.label}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Action buttons */}
                      {!isSelectionMode && (
                        <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownloadArtwork(artwork)
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteArtwork(artwork.id, artwork.title)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      
                      {/* Image */}
                      <img
                        src={getImageUrl(artwork.cloudinary_url || artwork.image)}
                        alt={artwork.title}
                        className="w-full h-auto object-cover block"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg"
                        }}
                      />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                          <h3 className="font-semibold text-lg mb-1 line-clamp-2">{artwork.title}</h3>
                          
                          {/* Stats */}
                          <div className="flex items-center justify-between text-sm mb-2">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <Heart className="h-4 w-4" />
                                {artwork.likes_count || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                {artwork.views_count || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Download className="h-4 w-4" />
                                {artwork.downloads_count || 0}
                              </span>
                            </div>
                            {(artwork.trending_score || 0) > 0 && (
                              <span className="flex items-center gap-1 text-orange-400">
                                <TrendingUp className="h-4 w-4" />
                                Trending
                              </span>
                            )}
                          </div>
                          
                          {/* AI Tags */}
                          {artwork.ai_tags && artwork.ai_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {artwork.ai_tags.slice(0, 3).map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Artwork Detail Modal */}
        <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
          <DialogContent className="max-w-5xl dark:bg-gray-900 dark:border-purple-500/30">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedArtwork?.title}
                {selectedArtwork?.is_nft && (
                  <Badge className="bg-gradient-to-r from-purple-600 to-pink-600">
                    💎 NFT
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedArtwork && (
              <div className="space-y-4">
                {/* Image */}
                <div className="relative w-full max-h-[60vh] rounded-lg overflow-hidden bg-gray-900/50 flex items-center justify-center">
                  <img
                    src={getImageUrl(selectedArtwork.cloudinary_url || selectedArtwork.image)}
                    alt={selectedArtwork.title}
                    className="object-contain w-full h-full max-h-[60vh]"
                  />
                </div>
                
                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Details</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Prompt:</strong> {selectedArtwork.prompt}</p>
                      {selectedArtwork.enhanced_prompt && (
                        <p><strong>Enhanced:</strong> {selectedArtwork.enhanced_prompt}</p>
                      )}
                      <p><strong>AI Provider:</strong> {selectedArtwork.ai_provider}</p>
                      {selectedArtwork.ai_model && (
                        <p><strong>Model:</strong> {selectedArtwork.ai_model}</p>
                      )}
                      <p><strong>Size:</strong> {selectedArtwork.image_size}</p>
                      {selectedArtwork.generation_seed && (
                        <p><strong>Seed:</strong> {selectedArtwork.generation_seed}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Metrics</h4>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Quality Score</span>
                          <span>{((selectedArtwork.quality_score || 0) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={(selectedArtwork.quality_score || 0) * 100} />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Aesthetic Score</span>
                          <span>{(selectedArtwork.aesthetic_score || 0).toFixed(1)}/10</span>
                        </div>
                        <Progress value={(selectedArtwork.aesthetic_score || 0) * 10} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm pt-2">
                        <div className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {selectedArtwork.likes_count || 0}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {selectedArtwork.views_count || 0}
                        </div>
                        <div className="flex items-center gap-1">
                          <Download className="h-4 w-4" />
                          {selectedArtwork.downloads_count || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                    onClick={() => handleReaction(selectedArtwork.id, 'like')}
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    React
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDownloadArtwork(selectedArtwork)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowAddToCollectionDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Collection
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteArtwork(selectedArtwork.id, selectedArtwork.title)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Collection Dialog */}
        <Dialog open={showCollectionDialog} onOpenChange={setShowCollectionDialog}>
          <DialogContent className="dark:bg-gray-900 dark:border-purple-500/30">
            <DialogHeader>
              <DialogTitle>Create New Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Collection name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="dark:bg-gray-800"
              />
              <Input
                placeholder="Description (optional)"
                value={newCollectionDescription}
                onChange={(e) => setNewCollectionDescription(e.target.value)}
                className="dark:bg-gray-800"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCollectionDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCollection} className="bg-purple-600">
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add to Collection Dialog */}
        <Dialog open={showAddToCollectionDialog} onOpenChange={setShowAddToCollectionDialog}>
          <DialogContent className="dark:bg-gray-900 dark:border-purple-500/30">
            <DialogHeader>
              <DialogTitle>Add to Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {collections.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                  No collections yet. Create one first!
                </p>
              ) : (
                collections.map((collection) => (
                  <Button
                    key={collection.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleAddToCollection(collection.id)}
                  >
                    <Folder className="h-4 w-4 mr-2" />
                    {collection.name} ({collection.artworkIds.length})
                  </Button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Suggestions Dialog */}
        <Dialog open={showAISuggestionsDialog} onOpenChange={setShowAISuggestionsDialog}>
          <DialogContent className="max-w-3xl dark:bg-gray-900 dark:border-purple-500/30">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-purple-500" />
                AI Collection Suggestions
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {aiSuggestions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">No suggestions found</p>
                  <Button variant="outline" onClick={() => setShowAISuggestionsDialog(false)}>
                    Close
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-400">
                    AI found {aiSuggestions.length} smart ways to organize your {artworks.length} artworks
                  </p>
                  {aiSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-4 border border-purple-500/30 rounded-lg bg-purple-500/5 hover:bg-purple-500/10"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg flex items-center">
                            <Folder className="h-4 w-4 mr-2 text-purple-500" />
                            {suggestion.name}
                          </h3>
                          <p className="text-sm text-gray-400 mt-1">{suggestion.description}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptAISuggestion(suggestion)}
                          className="bg-purple-600 ml-4"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Create
                        </Button>
                      </div>
                      
                      {suggestion.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {suggestion.keywords.map((keyword, i) => (
                            <Badge key={i} className="bg-purple-500/20 text-purple-300">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">
                          {suggestion.artworkIds.length} artworks
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-end pt-4 border-t border-purple-500/20">
                    <Button variant="outline" onClick={() => setShowAISuggestionsDialog(false)}>
                      Close
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Collection Dialog */}
        <Dialog open={showDeleteCollectionDialog} onOpenChange={setShowDeleteCollectionDialog}>
          <DialogContent className="max-w-md dark:bg-gray-900 dark:border-purple-500/30">
            <DialogHeader>
              <DialogTitle className="flex items-center text-red-500">
                <Trash2 className="h-5 w-5 mr-2" />
                Delete Collection
              </DialogTitle>
            </DialogHeader>
            {collectionToDelete && (
              <div className="space-y-4">
                <p className="text-gray-300">
                  Delete <span className="font-semibold text-purple-400">"{collectionToDelete.name}"</span>?
                </p>
                
                {collectionToDelete.artworkIds.length > 0 && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <p className="text-sm text-gray-400">
                      Contains <span className="font-semibold text-white">{collectionToDelete.artworkIds.length}</span> artwork(s)
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleDeleteCollection(collectionToDelete.id, false)}
                  >
                    <Folder className="h-4 w-4 mr-2" />
                    Delete collection only
                    <span className="ml-auto text-xs text-gray-400">Keep artworks</span>
                  </Button>
                  
                  {collectionToDelete.artworkIds.length > 0 && (
                    <Button
                      variant="outline"
                      className="w-full justify-start border-red-500/30 hover:bg-red-500/10 text-red-400"
                      onClick={() => handleDeleteCollection(collectionToDelete.id, true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete collection + artworks
                      <span className="ml-auto text-xs">⚠️ Permanent</span>
                    </Button>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowDeleteCollectionDialog(false)
                      setCollectionToDelete(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}