"use client"

import { useState } from "react"
import { Search, Filter, Heart, Download, Share2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"

const artworks = [
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
  const [selectedArtwork, setSelectedArtwork] = useState<(typeof artworks)[0] | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterBy, setFilterBy] = useState("all")

  return (
    <div className="min-h-screen dark:bg-black light:bg-white dark:text-white light:text-gray-900 overflow-hidden">
      <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-purple-900/20 dark:via-black dark:to-pink-900/20 light:bg-gradient-to-br light:from-purple-100 light:via-white light:to-pink-100" />

      <div className="relative z-10">

        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold dark:text-white light:text-gray-900 mb-2">My Gallery</h1>
            <p className="dark:text-gray-300 light:text-gray-600">Your collection of AI-generated masterpieces</p>
          </div>

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
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="popular">Most Liked</SelectItem>
                <SelectItem value="ai-gpt">GPT-4o</SelectItem>
                <SelectItem value="ai-gemini">Gemini 2.5</SelectItem>
                <SelectItem value="ai-sdxl">SDXL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Masonry Grid */}
          <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
            {artworks.map((artwork) => (
              <div
                key={artwork.id}
                className="break-inside-avoid group cursor-pointer"
                onClick={() => setSelectedArtwork(artwork)}
              >
                <div className="relative overflow-hidden rounded-lg shadow-md hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 dark:border-purple-500/20 light:border-purple-200 border">
                  <Image
                    src={artwork.image || "/placeholder.svg"}
                    alt={artwork.title}
                    width={400}
                    height={400}
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="font-semibold text-lg mb-1">{artwork.title}</h3>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {artwork.likes}
                        </span>
                        <span>{artwork.date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

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
                <div className="relative aspect-square rounded-lg overflow-hidden">
                  <Image
                    src={selectedArtwork.image || "/placeholder.svg"}
                    alt={selectedArtwork.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold dark:text-white light:text-gray-900">Prompt:</span>
                    <p className="dark:text-gray-300 light:text-gray-600">{selectedArtwork.prompt}</p>
                  </div>
                  <div className="flex gap-4 text-sm dark:text-gray-300 light:text-gray-600">
                    <span>
                      <strong>AI:</strong> {selectedArtwork.ai}
                    </span>
                    <span>
                      <strong>Size:</strong> {selectedArtwork.size}
                    </span>
                    <span>
                      <strong>Date:</strong> {selectedArtwork.date}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    <Heart className="h-4 w-4 mr-2" />
                    Like ({selectedArtwork.likes})
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent border-purple-500/30 dark:text-white light:text-gray-900 hover:bg-purple-500/10"
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
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Collection
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
