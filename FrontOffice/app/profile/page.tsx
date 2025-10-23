"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowRight, User, Settings, CreditCard, Palette } from "lucide-react"
import { UserNav } from "@/components/user-nav"

export default function ProfilePage() {
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
  }

  return (
    <div className="min-h-screen dark:bg-black light:bg-white dark:text-white light:text-gray-900 overflow-hidden">
      {/* Background gradient - matching landing page */}
      <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-purple-900/20 dark:via-black dark:to-pink-900/20 light:bg-gradient-to-br light:from-purple-100 light:via-white light:to-pink-100" />

      <div className="relative z-10">
        <UserNav />

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-4xl font-bold dark:text-white light:text-gray-900">Your Profile</h1>
              <Link href="/community">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
                  Continue to Feed
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="dark:bg-gray-900/50 light:bg-purple-50 dark:border-purple-500/20 light:border-purple-200 border backdrop-blur-xl">
                <TabsTrigger
                  value="profile"
                  className="data-[state=active]:bg-purple-500 data-[state=active]:text-white"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="data-[state=active]:bg-purple-500 data-[state=active]:text-white"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </TabsTrigger>
                <TabsTrigger
                  value="billing"
                  className="data-[state=active]:bg-purple-500 data-[state=active]:text-white"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile">
                <Card className="dark:bg-gray-900/50 light:bg-white dark:border-purple-500/20 light:border-purple-200 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="dark:text-white light:text-gray-900">Profile Information</CardTitle>
                    <CardDescription className="dark:text-gray-300 light:text-gray-600">
                      Update your profile details and public information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-6">
                      <Avatar className="h-24 w-24 border-4 dark:border-purple-500 light:border-purple-200">
                        <AvatarImage src="/placeholder.svg?height=96&width=96" />
                        <AvatarFallback className="dark:bg-purple-600 light:bg-purple-200 dark:text-white light:text-gray-900 text-2xl">
                          SH
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Button
                          variant="outline"
                          className="dark:border-gray-300 light:border-gray-200 hover:dark:bg-gray-50 hover:light:bg-gray-50 bg-transparent"
                        >
                          Change Avatar
                        </Button>
                        <p className="text-sm dark:text-gray-500 light:text-gray-400 mt-2">JPG, PNG or GIF. Max 2MB.</p>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="username" className="dark:text-gray-200 light:text-gray-700">
                          Username
                        </Label>
                        <Input
                          id="username"
                          defaultValue="@artcreator"
                          className="dark:bg-gray-800/50 light:bg-purple-50 dark:border-purple-500/30 light:border-purple-300 dark:text-white light:text-gray-900"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="email" className="dark:text-gray-200 light:text-gray-700">
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          defaultValue="sarah.henia@esprit.tn"
                          className="dark:bg-gray-800/50 light:bg-purple-50 dark:border-purple-500/30 light:border-purple-300 dark:text-white light:text-gray-900"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="bio" className="dark:text-gray-200 light:text-gray-700">
                          Bio
                        </Label>
                        <Textarea
                          id="bio"
                          placeholder="Tell us about yourself..."
                          className="dark:bg-gray-800/50 light:bg-purple-50 dark:border-purple-500/30 light:border-purple-300 dark:text-white light:text-gray-900 min-h-[100px]"
                          defaultValue="Digital artist exploring the intersection of AI and creativity."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="location" className="dark:text-gray-200 light:text-gray-700">
                            Location
                          </Label>
                          <Input
                            id="location"
                            placeholder="City, Country"
                            className="dark:bg-gray-800/50 light:bg-purple-50 dark:border-purple-500/30 light:border-purple-300 dark:text-white light:text-gray-900"
                            defaultValue="Tunis, Tunisia"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="website" className="dark:text-gray-200 light:text-gray-700">
                            Website
                          </Label>
                          <Input
                            id="website"
                            placeholder="https://..."
                            className="dark:bg-gray-800/50 light:bg-purple-50 dark:border-purple-500/30 light:border-purple-300 dark:text-white light:text-gray-900"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings">
                <Card className="dark:bg-gray-900/50 light:bg-white dark:border-purple-500/20 light:border-purple-200 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="dark:text-white light:text-gray-900 flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Generation Preferences
                    </CardTitle>
                    <CardDescription className="dark:text-gray-300 light:text-gray-600">
                      Set your default art generation settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="default-ai" className="dark:text-gray-200 light:text-gray-700">
                          Default AI Provider
                        </Label>
                        <Select defaultValue="gemini">
                          <SelectTrigger className="dark:bg-gray-800/50 light:bg-purple-50 dark:border-purple-500/30 light:border-purple-300 dark:text-white light:text-gray-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gemini">Gemini 2.5 Flash</SelectItem>
                            <SelectItem value="gpt4o">GPT-4o</SelectItem>
                            <SelectItem value="sdxl">Stable Diffusion XL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="default-size" className="dark:text-gray-200 light:text-gray-700">
                          Default Image Size
                        </Label>
                        <Select defaultValue="1024">
                          <SelectTrigger className="dark:bg-gray-800/50 light:bg-purple-50 dark:border-purple-500/30 light:border-purple-300 dark:text-white light:text-gray-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="512">512x512</SelectItem>
                            <SelectItem value="1024">1024x1024</SelectItem>
                            <SelectItem value="1536">1536x1536</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="default-quality" className="dark:text-gray-200 light:text-gray-700">
                          Default Quality
                        </Label>
                        <Select defaultValue="standard">
                          <SelectTrigger className="dark:bg-gray-800/50 light:bg-purple-50 dark:border-purple-500/30 light:border-purple-300 dark:text-white light:text-gray-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="hd">HD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      {isSaving ? "Saving..." : "Save Preferences"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Billing Tab */}
              <TabsContent value="billing">
                <Card className="dark:bg-gray-900/50 light:bg-white dark:border-purple-500/20 light:border-purple-200 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="dark:text-white light:text-gray-900">Subscription & Billing</CardTitle>
                    <CardDescription className="dark:text-gray-300 light:text-gray-600">
                      Manage your subscription and payment methods
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Current Plan */}
                    <div className="p-6 rounded-lg dark:bg-gradient-to-r dark:from-purple-500/10 dark:to-pink-500/10 light:bg-gradient-to-r light:from-purple-100/10 light:to-pink-100/10 dark:border dark:border-purple-500/30 light:border light:border-purple-200">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold dark:text-white light:text-gray-900">Free Plan</h3>
                          <p className="dark:text-gray-300 light:text-gray-600">50 generations per month</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold dark:text-white light:text-gray-900">$0</p>
                          <p className="dark:text-gray-300 light:text-gray-600 text-sm">/month</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm dark:text-gray-300 light:text-gray-600">
                        <p>✓ Hugging Face models</p>
                        <p>✓ Standard quality</p>
                        <p>✓ Community access</p>
                      </div>
                    </div>

                    {/* Upgrade Options */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg dark:bg-gray-800/50 light:bg-white dark:border dark:border-purple-500/20 light:border light:border-purple-200">
                        <h4 className="font-bold dark:text-white light:text-gray-900 mb-2">Premium</h4>
                        <p className="text-2xl font-bold dark:text-purple-400 light:text-pink-400 mb-2">$19/mo</p>
                        <ul className="text-sm dark:text-gray-300 light:text-gray-600 space-y-1 mb-4">
                          <li>✓ Unlimited generations</li>
                          <li>✓ GPT-4o access</li>
                          <li>✓ HD quality</li>
                          <li>✓ No watermarks</li>
                        </ul>
                        <Button className="w-full dark:bg-purple-500 light:bg-pink-400 hover:dark:bg-purple-600 hover:light:bg-pink-500">
                          Upgrade to Premium
                        </Button>
                      </div>

                      <div className="p-4 rounded-lg dark:bg-gray-800/50 light:bg-white dark:border dark:border-purple-500/20 light:border light:border-purple-200">
                        <h4 className="font-bold dark:text-white light:text-gray-900 mb-2">Enterprise</h4>
                        <p className="text-2xl font-bold dark:text-purple-400 light:text-pink-400 mb-2">Custom</p>
                        <ul className="text-sm dark:text-gray-300 light:text-gray-600 space-y-1 mb-4">
                          <li>✓ Everything in Premium</li>
                          <li>✓ API access</li>
                          <li>✓ Priority support</li>
                          <li>✓ Custom models</li>
                        </ul>
                        <Button
                          variant="outline"
                          className="w-full dark:border-pink-500 light:border-pink-400 dark:text-pink-400 light:text-pink-400 hover:dark:bg-pink-500/10 hover:light:bg-pink-400/10 bg-transparent"
                        >
                          Contact Sales
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
