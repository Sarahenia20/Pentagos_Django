"use client"

import { useState, useEffect } from "react"
import { Search, Filter, Heart, Download, Share2, Plus, Loader2, Trash2, Check, Folder, FolderPlus, X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserNav } from "@/components/user-nav"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"
import { toast } from "sonner"
import { apiClient, getImageUrl } from "@/lib/api"

interface Artw
ork {
  id: string
  title: string
  prompt: string
  image: string
  cloudinary_url?: string
  ai_provider: string
  generation_type: string
  image_size: string
  created_at: string
  likes_count?: number
  status: string
}

interface Collection {
  id: string
  name: string
  artworkIds: string[]
}

interface AICollectionSuggestion {
  name: string
  description: string
  artworkIds: string[]
  keywords: string[]
}

const oldArtworks = [
  {
    id: 1,
    title: "Neon Cyberpunk City",
    prompt: "A neon-lit cyberpunk cityscape at night with flying cars",
    image: "/neon-cyberpunk-art.jpg",
    ai: "GPT-4o",
    size: "1024x1024",
    date: "Oct 20, 2025",
    likes: 524,
  },
  {
    id: 2,
    title: "Abstract Flow",
    prompt: "Colorful abstract flowing shapes with vibrant gradients",
    image: "/abstract-colorful-flow.jpg",
    ai: "Gemini 2.5",
    size: "1024x1024",
    date: "Oct 19, 2025",
    likes: 391,
  },
  {
    id: 3,
    title: "Digital Sunset",
    prompt: "Digital landscape with sunset over mountains",
    image: "/digital-sunset-landscape.jpg",
    ai: "SDXL",
    size: "1024x1024",
    date: "Oct 18, 2025",
    likes: 287,
  },
  {
    id: 4,
    title: "Cosmic Portal",
    prompt: "A cosmic portal in deep space with swirling galaxies",
    image: "/cosmic-portal-space.jpg",
    ai: "GPT-4o",
    size: "1024x1024",
    date: "Oct 17, 2025",
    likes: 456,
  },
  {
    id: 5,
    title: "Fractal Dreams",
    prompt: "Colorful fractal patterns with mathematical precision",
    image: "/fractal-patterns-colorful.jpg",
    ai: "Gemini 2.5",
    size: "1024x1024",
    date: "Oct 16, 2025",
    likes: 312,
  },
  {
    id: 6,
    title: "Urban Glow",
    prompt: "Urban city at night with glowing lights and reflections",
    image: "/urban-city-glow-night.jpg",
    ai: "SDXL",
    size: "1024x1024",
    date: "Oct 15, 2025",
    likes: 198,
  },
]

export default function GalleryPage() {
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterBy, setFilterBy] = useState("all")
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
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [showDeleteCollectionDialog, setShowDeleteCollectionDialog] = useState(false)
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null)
  
  // AI Collections
  const [isGeneratingAICollections, setIsGeneratingAICollections] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<AICollectionSuggestion[]>([])
  const [showAISuggestionsDialog, setShowAISuggestionsDialog] = useState(false)

  // Fetch user's artworks on mount
  useEffect(() => {
    fetchArtworks()
    loadCollections()
  }, [])

  const fetchArtworks = async () => {
    setIsLoading(true)
    try {
      // Fetch only user's artworks (backend filters by authenticated user when we don't pass user param)
      // But to show ONLY user's artworks (not public ones), we need to get user ID first
      let filters: any = { 
        status: 'completed',
        ordering: '-created_at'  // Most recent first
      }
      
      // Try to get user profile to filter by user ID
      try {
        const userProfile = await apiClient.getUserProfile()
        if (userProfile && userProfile.id) {
          filters.user = userProfile.id  // Only show artworks from logged-in user
        }
      } catch (profileError) {
        console.log("Could not fetch user profile, showing all accessible artworks")
      }
      
      const response = await apiClient.getArtworks(filters)
      
      // Handle both paginated and non-paginated responses
      const artworksData = response.results || response
      setArtworks(artworksData)
      
      if (artworksData.length === 0) {
        toast.info("📷 No artworks yet", {
          description: "Create your first artwork in the Studio!"
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
      artworkIds: []
    }

    saveCollections([...collections, newCollection])
    setNewCollectionName("")
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

  // Remove artwork from collection
  const handleRemoveFromCollection = (collectionId: string, artworkId: string) => {
    const collection = collections.find(c => c.id === collectionId)
    if (!collection) return

    const updatedCollections = collections.map(c => {
      if (c.id === collectionId) {
        return { ...c, artworkIds: c.artworkIds.filter(id => id !== artworkId) }
      }
      return c
    })

    saveCollections(updatedCollections)
    toast.success(`Removed from "${collection.name}"`)
  }

  // Delete collection
  const handleDeleteCollection = async (collectionId: string, deleteArtworks: boolean = false) => {
    const collection = collections.find(c => c.id === collectionId)
    if (!collection) return

    // Remove collection from list
    saveCollections(collections.filter(c => c.id !== collectionId))
    
    if (selectedCollection === collectionId) {
      setSelectedCollection(null)
    }

    // Delete artworks if requested
    if (deleteArtworks && collection.artworkIds.length > 0) {
      setIsLoading(true)
      try {
        const deletePromises = collection.artworkIds.map(id => apiClient.deleteArtwork(id))
        await Promise.all(deletePromises)
        
        // Remove from local state
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

  // Open delete collection dialog
  const openDeleteCollectionDialog = (collectionId: string) => {
    const collection = collections.find(c => c.id === collectionId)
    if (collection) {
      setCollectionToDelete(collection)
      setShowDeleteCollectionDialog(true)
    }
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
      toast.success(`📥 Downloaded "${artwork.title}"`)
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Failed to download artwork')
    }
  }


  // AI: Generate smart collections based on artwork analysis
  const handleGenerateAICollections = async () => {
    if (artworks.length < 3) {
      toast.error("Need at least 3 artworks to generate AI collections")
      return
    }

    setIsGeneratingAICollections(true)
    toast.info("🤖 AI is analyzing your artworks...")

    try {
      // Analyze artworks and group by themes
      const artworkData = artworks.map(a => ({
        id: a.id,
        title: a.title,
        prompt: a.prompt,
        generation_type: a.generation_type,
        ai_provider: a.ai_provider
      }))

      // Call Groq API for intelligent categorization
      const groqApiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY
      if (!groqApiKey) {
        throw new Error('Groq API key not configured. Please add NEXT_PUBLIC_GROQ_API_KEY to your .env.local file.')
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
              content: 'You are an expert art curator and organizer. Analyze artworks and suggest intelligent collections/groups based on themes, styles, subjects, colors, and moods. Return ONLY valid JSON.'
            },
            {
              role: 'user',
              content: `Analyze these artworks and suggest 3-6 smart collections to organize them. Each collection should have 2+ artworks with similar themes/styles.

Artworks:
${JSON.stringify(artworkData, null, 2)}

Return JSON in this exact format:
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

Focus on: themes (nature, urban, space, fantasy), styles (abstract, realistic, cyberpunk), colors (vibrant, dark, pastel), subjects (landscapes, portraits, creatures), moods (calm, energetic, mysterious).`
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      })

      if (!response.ok) {
        throw new Error('AI analysis failed')
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content || '{}'
      
      // Parse AI response
      let aiResponse
      try {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        aiResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : { collections: [] }
      } catch (e) {
        console.error('Failed to parse AI response:', e)
        aiResponse = { collections: [] }
      }

      if (!aiResponse.collections || aiResponse.collections.length === 0) {
        // Fallback: Create basic collections based on generation type
        const suggestions: AICollectionSuggestion[] = []
        
        const aiArtworks = artworks.filter(a => a.generation_type === 'ai_prompt')
        const algoArtworks = artworks.filter(a => a.generation_type === 'algorithmic')
        
        if (aiArtworks.length >= 2) {
          suggestions.push({
            name: 'AI Generated Art',
            description: 'Artworks created using AI image generation',
            artworkIds: aiArtworks.map(a => a.id),
            keywords: ['ai', 'generated', 'prompt-based']
          })
        }
        
        if (algoArtworks.length >= 2) {
          suggestions.push({
            name: 'Algorithmic Creations',
            description: 'Artworks created using algorithmic patterns',
            artworkIds: algoArtworks.map(a => a.id),
            keywords: ['algorithmic', 'patterns', 'mathematical']
          })
        }

        setAiSuggestions(suggestions)
      } else {
        // Filter suggestions to only include those with valid artwork IDs
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
      toast.error('Failed to generate AI collections. Try again later.')
    } finally {
      setIsGeneratingAICollections(false)
    }
  }

  // Accept AI collection suggestion
  const handleAcceptAISuggestion = (suggestion: AICollectionSuggestion) => {
    const newCollection: Collection = {
      id: Date.now().toString(),
      name: suggestion.name,
      artworkIds: suggestion.artworkIds
    }

    saveCollections([...collections, newCollection])
    
    // Remove accepted suggestion
    setAiSuggestions(aiSuggestions.filter(s => s.name !== suggestion.name))
    
    toast.success(`✅ Created collection "${suggestion.name}" with ${suggestion.artworkIds.length} artworks`)
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
      // Delete all selected artworks
      await Promise.all(selectedArtworkIds.map(id => apiClient.deleteArtwork(id)))
      
      // Remove from local state
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
    if (!confirm(`Are you sure you want to delete "${artworkTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      await apiClient.deleteArtwork(artworkId)
      
      // Remove from local state
      setArtworks(artworks.filter(a => a.id !== artworkId))
      
      // Close modal if it was open
      if (selectedArtwork?.id === artworkId) {
        setSelectedArtwork(null)
      }
      
      toast.success("🗑️ Artwork deleted", {
        description: `"${artworkTitle}" has been removed from your gallery`
      })
    } catch (error) {
      console.error("Failed to delete artwork:", error)
      toast.error("Failed to delete artwork", {
        description: "Please try again later"
      })
    }
  }

  // Filter artworks based on search and filter
  const filteredArtworks = artworks.filter((artwork) => {
    const matchesSearch = artwork.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         artwork.prompt?.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Filter by collection
    if (selectedCollection) {
      const collection = collections.find(c => c.id === selectedCollection)
      if (collection && !collection.artworkIds.includes(artwork.id)) {
        return false
      }
    }
    
    if (filterBy === "all") return matchesSearch
    
    // Filter by generation type
    if (filterBy === "ai") return matchesSearch && artwork.generation_type === "ai_prompt"
    if (filterBy === "algorithmic") return matchesSearch && artwork.generation_type === "algorithmic"
    
    // Filter by AI provider
    if (filterBy === "ai-groq") return matchesSearch && artwork.ai_provider === "groq"
    if (filterBy === "ai-openai") return matchesSearch && artwork.ai_provider === "openai"
    if (filterBy === "ai-gemini") return matchesSearch && artwork.ai_provider === "gemini"
    if (filterBy === "ai-huggingface") return matchesSearch && artwork.ai_provider === "huggingface"
    
    return matchesSearch
  })
  
  // Sort filtered artworks
  const sortedArtworks = [...filteredArtworks].sort((a, b) => {
    if (filterBy === "recent") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    if (filterBy === "popular") {
      return (b.likes_count || 0) - (a.likes_count || 0)
    }
    return 0
  })

  return (
    <div className="min-h-screen dark:bg-black light:bg-white dark:text-white light:text-gray-900 overflow-hidden">
      <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-purple-900/20 dark:via-black dark:to-pink-900/20 light:bg-gradient-to-br light:from-purple-100 light:via-white light:to-pink-100" />

      <div className="relative z-10">
        <UserNav />

        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold dark:text-white light:text-gray-900 mb-2">
                My Gallery
                {selectedCollection && (
                  <span className="text-2xl text-purple-500 ml-3">
                    / {collections.find(c => c.id === selectedCollection)?.name}
                  </span>
                )}
              </h1>
              <p className="dark:text-gray-300 light:text-gray-600">Your personal collection of AI-generated masterpieces</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleGenerateAICollections}
                disabled={isGeneratingAICollections || artworks.length < 3}
                className="dark:border-purple-500/30 dark:text-white light:border-purple-300 light:text-gray-900 bg-gradient-to-r from-purple-500/10 to-pink-500/10"
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
                className="dark:border-purple-500/30 dark:text-white light:border-purple-300 light:text-gray-900"
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
                className={isSelectionMode ? "bg-purple-600 hover:bg-purple-700" : "dark:border-purple-500/30 dark:text-white light:border-purple-300 light:text-gray-900"}
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
                All Artworks
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
                      openDeleteCollectionDialog(collection.id)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Selection Mode Actions */}
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
                  Delete Selected
                </Button>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by prompt or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 dark:bg-gray-900/50 dark:border-purple-500/30 dark:text-white light:bg-purple-50 light:border-purple-300 light:text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-full md:w-[200px] dark:bg-gray-900/50 dark:border-purple-500/30 dark:text-white light:bg-purple-50 light:border-purple-300 light:text-gray-900">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Artworks</SelectItem>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="popular">Most Liked</SelectItem>
                <SelectItem value="ai">AI Generated</SelectItem>
                <SelectItem value="algorithmic">Algorithmic Art</SelectItem>
                <SelectItem value="ai-groq">Groq AI</SelectItem>
                <SelectItem value="ai-openai">OpenAI</SelectItem>
                <SelectItem value="ai-gemini">Gemini</SelectItem>
                <SelectItem value="ai-huggingface">HuggingFace</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Masonry Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <span className="ml-3 text-gray-400">Loading your gallery...</span>
            </div>
          ) : sortedArtworks.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg mb-4">No artworks found</p>
              <Button
                onClick={() => window.location.href = '/studio'}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Create Your First Artwork
              </Button>
            </div>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
              {sortedArtworks.map((artwork) => {
                const isSelected = selectedArtworkIds.includes(artwork.id)
                return (
              <div
                key={artwork.id}
                className="break-inside-avoid group cursor-pointer relative mb-4"
              >
                <div 
                  className={`relative overflow-hidden rounded-lg shadow-md hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 border dark:border-purple-500/20 light:border-purple-200 bg-gray-800 ${isSelected ? 'ring-4 ring-purple-500' : ''}`}
                  onClick={() => {
                    if (isSelectionMode) {
                      toggleSelection(artwork.id)
                    } else {
                      setSelectedArtwork(artwork)
                    }
                  }}
                >
                  {/* Selection Checkbox */}
                  {isSelectionMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(artwork.id)}
                        className="bg-white border-2"
                      />
                    </div>
                  )}
                  
                  {/* Action buttons - appears on hover (only when not in selection mode) */}
                  {!isSelectionMode && (
                    <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
                        className="bg-red-600 hover:bg-red-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteArtwork(artwork.id, artwork.title)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  <img
                    src={getImageUrl(artwork.cloudinary_url || artwork.image)}
                    alt={artwork.title}
                    className="w-full h-auto object-cover block"
                    loading="lazy"
                    onError={(e) => {
                      console.error('Image failed to load:', artwork.cloudinary_url || artwork.image)
                      e.currentTarget.src = "/placeholder.svg"
                    }}
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="font-semibold text-lg mb-1 line-clamp-2">{artwork.title}</h3>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {artwork.likes_count || 0}
                        </span>
                        <span>{new Date(artwork.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )})}
          </div>
          )}

          {/* Load More */}
          <div className="mt-12 text-center">
            <Button
              variant="outline"
              size="lg"
              className="dark:border-purple-500/30 dark:text-white dark:hover:bg-purple-500/10 light:border-purple-300 light:text-purple-900 light:hover:bg-purple-100 bg-transparent"
            >
              Load More Artworks
            </Button>
          </div>
        </div>

        {/* Artwork Detail Modal */}
        <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
          <DialogContent className="max-w-4xl dark:bg-gray-900 light:bg-white dark:border-purple-500/30 light:border-purple-200 dark:text-white light:text-gray-900">
            <DialogHeader>
              <DialogTitle className="dark:text-white light:text-gray-900">{selectedArtwork?.title}</DialogTitle>
            </DialogHeader>
            {selectedArtwork && (
              <div className="space-y-4">
                <div className="relative w-full max-h-[60vh] rounded-lg overflow-hidden bg-gray-900/50 flex items-center justify-center">
                  <img
                    src={getImageUrl(selectedArtwork.cloudinary_url || selectedArtwork.image)}
                    alt={selectedArtwork.title}
                    className="object-contain w-full h-full max-h-[60vh]"
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold dark:text-white light:text-gray-900">Prompt:</span>
                    <p className="dark:text-gray-300 light:text-gray-600">{selectedArtwork.prompt}</p>
                  </div>
                  <div className="flex gap-4 text-sm dark:text-gray-300 light:text-gray-600">
                    <span>
                      <strong>Generation:</strong> {selectedArtwork.generation_type}
                    </span>
                    {selectedArtwork.ai_provider && (
                      <span>
                        <strong>AI:</strong> {selectedArtwork.ai_provider}
                      </span>
                    )}
                    <span>
                      <strong>Size:</strong> {selectedArtwork.image_size}
                    </span>
                    <span>
                      <strong>Date:</strong> {new Date(selectedArtwork.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    <Heart className="h-4 w-4 mr-2" />
                    Like ({selectedArtwork.likes_count || 0})
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent border-purple-500/30 dark:text-white light:text-gray-900 hover:bg-purple-500/10"
                    onClick={() => handleDownloadArtwork(selectedArtwork)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent border-purple-500/30 dark:text-white light:text-gray-900 hover:bg-purple-500/10"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent border-purple-500/30 dark:text-white light:text-gray-900 hover:bg-purple-500/10"
                    onClick={() => setShowAddToCollectionDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Collection
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
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
          <DialogContent className="dark:bg-gray-900 light:bg-white dark:border-purple-500/30 light:border-purple-200">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Create New Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Collection name (e.g., Nature, Portraits, Abstract)"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateCollection()}
                className="dark:bg-gray-800 dark:border-purple-500/30"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowCollectionDialog(false)}
                  className="dark:border-purple-500/30"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCollection}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add to Collection Dialog */}
        <Dialog open={showAddToCollectionDialog} onOpenChange={setShowAddToCollectionDialog}>
          <DialogContent className="dark:bg-gray-900 light:bg-white dark:border-purple-500/30 light:border-purple-200">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Add to Collection</DialogTitle>
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
                    className="w-full justify-start dark:border-purple-500/30 hover:bg-purple-500/10"
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

        {/* AI Collection Suggestions Dialog */}
        <Dialog open={showAISuggestionsDialog} onOpenChange={setShowAISuggestionsDialog}>
          <DialogContent className="max-w-3xl dark:bg-gray-900 light:bg-white dark:border-purple-500/30 light:border-purple-200">
            <DialogHeader>
              <DialogTitle className="dark:text-white flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-purple-500" />
                AI Collection Suggestions
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {aiSuggestions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">
                    No collection suggestions found. Your artworks might be too similar or need more variety.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowAISuggestionsDialog(false)}
                    className="dark:border-purple-500/30"
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-400">
                    AI analyzed your {artworks.length} artworks and found {aiSuggestions.length} smart ways to organize them
                  </p>
                  {aiSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-4 border border-purple-500/30 rounded-lg bg-purple-500/5 hover:bg-purple-500/10 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg dark:text-white flex items-center">
                            <Folder className="h-4 w-4 mr-2 text-purple-500" />
                            {suggestion.name}
                          </h3>
                          <p className="text-sm text-gray-400 mt-1">{suggestion.description}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptAISuggestion(suggestion)}
                          className="bg-purple-600 hover:bg-purple-700 ml-4"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Create
                        </Button>
                      </div>
                      
                      {/* Keywords */}
                      {suggestion.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {suggestion.keywords.map((keyword, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-full"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Preview artworks */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">
                          {suggestion.artworkIds.length} artworks:
                        </span>
                        <div className="flex -space-x-2">
                          {suggestion.artworkIds.slice(0, 5).map((artworkId) => {
                            const artwork = artworks.find(a => a.id === artworkId)
                            if (!artwork) return null
                            return (
                              <div
                                key={artworkId}
                                className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-800"
                              >
                                <img
                                  src={getImageUrl(artwork.cloudinary_url || artwork.image)}
                                  alt={artwork.title}
                                  className="w-10 h-10 object-cover"
                                />
                              </div>
                            )
                          })}
                          {suggestion.artworkIds.length > 5 && (
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 border-2 border-gray-800 flex items-center justify-center text-xs text-purple-300">
                              +{suggestion.artworkIds.length - 5}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-end gap-2 pt-4 border-t border-purple-500/20">
                    <Button
                      variant="outline"
                      onClick={() => setShowAISuggestionsDialog(false)}
                      className="dark:border-purple-500/30"
                    >
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
          <DialogContent className="max-w-md dark:bg-gray-900 light:bg-white dark:border-purple-500/30 light:border-purple-200">
            <DialogHeader>
              <DialogTitle className="dark:text-white flex items-center text-red-500">
                <Trash2 className="h-5 w-5 mr-2" />
                Delete Collection
              </DialogTitle>
            </DialogHeader>
            {collectionToDelete && (
              <div className="space-y-4">
                <p className="text-gray-300">
                  What would you like to do with collection <span className="font-semibold text-purple-400">"{collectionToDelete.name}"</span>?
                </p>
                
                {collectionToDelete.artworkIds.length > 0 && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <p className="text-sm text-gray-400">
                      This collection contains <span className="font-semibold text-white">{collectionToDelete.artworkIds.length}</span> artwork(s)
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start dark:border-purple-500/30 hover:bg-purple-500/10"
                    onClick={() => handleDeleteCollection(collectionToDelete.id, false)}
                  >
                    <Folder className="h-4 w-4 mr-2" />
                    Delete collection only
                    <span className="ml-auto text-xs text-gray-400">Keep artworks</span>
                  </Button>
                  
                  {collectionToDelete.artworkIds.length > 0 && (
                    <Button
                      variant="outline"
                      className="w-full justify-start border-red-500/30 hover:bg-red-500/10 text-red-400 hover:text-red-300"
                      onClick={() => handleDeleteCollection(collectionToDelete.id, true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete collection + all artworks
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
