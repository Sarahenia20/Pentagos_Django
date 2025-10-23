"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowRight, TrendingUp, Star, Sparkles, Heart, MessageCircle, Share2 } from "lucide-react"
import { UserNav } from "@/components/user-nav"

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState("trending")

  // Mock data for trending artworks
  const trendingArtworks = [
    { id: 1, title: "Neon Dreams", likes: 524, artist: "@neonartist", image: "/neon-cyberpunk-art.jpg" },
    { id: 2, title: "Abstract Flow", likes: 391, artist: "@flowmaster", image: "/abstract-colorful-flow.jpg" },
    { id: 3, title: "Digital Sunset", likes: 287, artist: "@sunsetlover", image: "/digital-sunset-landscape.jpg" },
    { id: 4, title: "Cosmic Portal", likes: 156, artist: "@cosmicart", image: "/cosmic-portal-space.jpg" },
    { id: 5, title: "Fractal Mind", likes: 423, artist: "@fractalist", image: "/fractal-patterns-colorful.jpg" },
    { id: 6, title: "Urban Glow", likes: 312, artist: "@urbanartist", image: "/urban-city-glow-night.jpg" },
  ]

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
        <UserNav />

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
                              <p className="dark:text-gray-300 light:text-gray-600 text-sm">{artwork.artist}</p>
                            </div>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm dark:text-gray-300 light:text-gray-600">
                              <button className="flex items-center gap-1 hover:dark:text-pink-400 hover:light:text-purple-400 transition-colors">
                                <Heart className="h-4 w-4" />
                                {artwork.likes}
                              </button>
                              <button className="flex items-center gap-1 hover:dark:text-purple-400 hover:light:text-pink-400 transition-colors">
                                <MessageCircle className="h-4 w-4" />
                                {Math.floor(artwork.likes / 10)}
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
