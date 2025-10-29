"use client"

import { useEffect, useState } from "react"
import apiClient from '@/lib/api'
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ArrowRight, User, Settings, CreditCard, Palette, Sparkles, Loader2 } from "lucide-react"

export default function ProfilePage() {
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  const [profile, setProfile] = useState<any | null>(null)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [aiBio, setAiBio] = useState('')
  const [aiBioGeneratedAt, setAiBioGeneratedAt] = useState('')
  const [isGeneratingBio, setIsGeneratingBio] = useState(false)
  const [artistPersonality, setArtistPersonality] = useState<{type: string, description: string} | null>(null)
  const [artistPersonalityGeneratedAt, setArtistPersonalityGeneratedAt] = useState('')
  const [isGeneratingPersonality, setIsGeneratingPersonality] = useState(false)
  const [skillAnalysis, setSkillAnalysis] = useState<any>(null)
  const [skillAnalysisUpdatedAt, setSkillAnalysisUpdatedAt] = useState('')
  const [isAnalyzingSkills, setIsAnalyzingSkills] = useState(false)
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
      try {
        const res = await fetch(`${API_BASE}/profiles/me/`, { headers: apiClient.headers() })
        if (!res.ok) {
          // Not authenticated — redirect to login
          router.push('/login')
          return
        }
        const data = await res.json()
        setProfile(data)
        // data contains profile serializer with username/email via source
        setUsername(data.username || '')
        setEmail(data.email || '')
        setBio(data.bio || '')
        setAiBio(data.ai_bio || '')
        setAiBioGeneratedAt(data.ai_bio_generated_at || '')
        // Parse artist_personality JSON
        if (data.artist_personality) {
          try {
            const personality = JSON.parse(data.artist_personality)
            setArtistPersonality(personality)
          } catch (e) {
            console.error('Failed to parse artist_personality', e)
          }
        }
        setArtistPersonalityGeneratedAt(data.artist_personality_generated_at || '')
        // Load skill analysis
        setSkillAnalysis(data.skill_analysis || null)
        setSkillAnalysisUpdatedAt(data.skill_analysis_updated_at || '')
        setLocation(data.location || '')
        setWebsite(data.website || '')
        if (data.avatar) setAvatarPreview(data.avatar)
      } catch (err) {
        console.error('Failed to load profile', err)
      }
    }

    fetchProfile()
  }, [])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setAvatarFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setAvatarPreview(url)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

    try {
      let res
      // If avatar file present, send multipart/form-data
      if (avatarFile) {
        const form = new FormData()
        form.append('username', username)
        form.append('email', email)
        form.append('bio', bio)
        form.append('location', location)
        form.append('website', website)
        form.append('avatar', avatarFile)

        const token = apiClient.getToken()
        const headers: Record<string,string> = {}
        if (token) headers['Authorization'] = `Token ${token}`

        res = await fetch(`${API_BASE}/profiles/update_me/`, {
          method: 'PATCH',
          headers,
          body: form,
        })
      } else {
        const token = apiClient.getToken()
        res = await fetch(`${API_BASE}/profiles/update_me/`, {
          method: 'PATCH',
          headers: apiClient.headers(),
          body: JSON.stringify({ username, email, bio, location, website }),
        })
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.detail || JSON.stringify(data)
        alert('Update failed: ' + msg)
      } else {
        alert('Profile updated')
        // Refresh profile data
        setProfile(data)
      }
    } catch (err) {
      console.error('Failed to update profile', err)
      alert('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const openGenerateDialog = () => {
    setGeneratePrompt('')
    setShowGenerateDialog(true)
  }

  const submitGenerateAvatar = async () => {
    const prompt = generatePrompt.trim()
    if (!prompt) {
      toast.error('Please describe the avatar you want')
      return
    }

    setIsGenerating(true)
    setIsSaving(true)
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

    // declare loadingToast in outer scope so catch/finally can reference it
    let loadingToast: string | number | undefined = undefined

    try {
      const token = apiClient.getToken()
      if (!token) {
        toast.error('You must be logged in to generate an avatar')
        setIsGenerating(false)
        setIsSaving(false)
        setShowGenerateDialog(false)
        return
      }

  const headers = apiClient.headers()
  loadingToast = toast.loading('Starting avatar generation...')

      const res = await fetch(`${API_BASE}/profiles/generate_avatar/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt }),
      })

      if (res.status === 202) {
        // Replace loading toast with queued state
        toast.success('Avatar generation queued', { id: loadingToast })
        const start = Date.now()
        const timeoutMs = 1000 * 60 * 3 // 3 minutes
        const initialAvatar = avatarPreview

        await new Promise<void>((resolve) => {
          const interval = setInterval(async () => {
            try {
              const pRes = await fetch(`${API_BASE}/profiles/me/`, { headers: apiClient.headers() })
              if (pRes.ok) {
                const pData = await pRes.json()
                if (pData.avatar && pData.avatar !== initialAvatar) {
                  // Before showing, verify the avatar resource is reachable (avoid showing broken image)
                  const candidate = `${pData.avatar}?v=${Date.now()}`
                  try {
                    const r = await fetch(candidate, { method: 'HEAD' })
                    if (r.ok) {
                      setAvatarPreview(candidate)
                      // notify navbar and other listeners
                      try { window.dispatchEvent(new CustomEvent('profile-updated', { detail: { avatar: candidate } })) } catch (e) {}
                      clearInterval(interval)
                      // update loading toast to success
                      toast.success('Avatar applied to your profile', { id: loadingToast })
                      resolve()
                    } else {
                      // If HEAD returns 404, keep polling until file is available (worker may be finishing upload)
                      console.debug('Avatar exists in profile but resource not yet reachable, will retry', r.status)
                    }
                  } catch (e) {
                    console.debug('Avatar HEAD check failed, will retry', e)
                  }
                }
              }
            } catch (err) {
              console.warn('Polling profile failed', err)
            }
            if (Date.now() - start > timeoutMs) {
              clearInterval(interval)
              resolve()
            }
          }, 3000)
        })

        // If we reach here without finding a reachable avatar, update the user
        toast.success('Avatar generation finished (if completed)', { id: loadingToast })
        setShowGenerateDialog(false)
      } else {
        const data = await res.json().catch(() => ({}))
        const msg = data.detail || JSON.stringify(data)
        toast.error('Avatar generation failed: ' + msg, { id: loadingToast })
      }
    } catch (err) {
      console.error('Avatar generation failed', err)
      const message = (err && (err as any).message) ? (err as any).message : String(err)
      toast.error('Avatar generation failed: ' + message, { id: loadingToast })
    } finally {
      setIsGenerating(false)
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen dark:bg-black light:bg-white dark:text-white light:text-gray-900 overflow-hidden">
      {/* Background gradient - matching landing page */}
      <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-purple-900/20 dark:via-black dark:to-pink-900/20 light:bg-gradient-to-br light:from-purple-100 light:via-white light:to-pink-100" />

      <div className="relative z-10">

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
                        {avatarPreview ? (
                          <AvatarImage src={avatarPreview} />
                        ) : (
                          <AvatarFallback className="dark:bg-purple-600 light:bg-purple-200 dark:text-white light:text-gray-900 text-2xl">
                            {username?.slice(0,2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <div className="flex gap-2">
                          <label className="inline-flex items-center">
                            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                            <Button
                              variant="outline"
                              className="dark:border-gray-300 light:border-gray-200 hover:dark:bg-gray-50 hover:light:bg-gray-50 bg-transparent"
                            >
                              Change Avatar
                            </Button>
                          </label>

                          <Button
                            onClick={() => setShowGenerateDialog(true)}
                            disabled={isSaving || isGenerating}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                          >
                            {isGenerating ? 'Generating…' : 'AI Generate Avatar'}
                          </Button>

                          {/* Generate Dialog */}
                          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>AI Generate Avatar</DialogTitle>
                                <DialogDescription>
                                  Describe the avatar you want (e.g. "stylized portrait, warm tones, smiling")
                                </DialogDescription>
                              </DialogHeader>

                              <div className="mt-2">
                                <Textarea
                                  value={generatePrompt}
                                  onChange={(e) => setGeneratePrompt(e.target.value)}
                                  placeholder='e.g. "stylized portrait, warm tones, smiling"'
                                  className="min-h-[120px]"
                                />
                              </div>

                              <DialogFooter>
                                <div className="flex gap-2 w-full">
                                  <Button variant="outline" onClick={() => setShowGenerateDialog(false)} className="flex-1">Cancel</Button>
                                  <Button onClick={submitGenerateAvatar} disabled={isGenerating} className="flex-1">
                                    {isGenerating ? 'Generating…' : 'Generate'}
                                  </Button>
                                </div>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
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
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
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
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
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
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                        />
                      </div>

                      {/* AI-Generated Bio Section */}
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <Label className="dark:text-gray-200 light:text-gray-700">
                            AI Artist Bio
                          </Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              setIsGeneratingBio(true)
                              const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
                              try {
                                const res = await fetch(`${API_BASE}/profiles/generate_bio/`, {
                                  method: 'POST',
                                  headers: apiClient.headers()
                                })
                                if (!res.ok) {
                                  const error = await res.json()
                                  throw new Error(error.detail || 'Failed to generate bio')
                                }
                                toast.success('Bio generation started! Refresh in a few moments.')
                                
                                // Poll for updated profile after a few seconds
                                setTimeout(async () => {
                                  const profileRes = await fetch(`${API_BASE}/profiles/me/`, { headers: apiClient.headers() })
                                  if (profileRes.ok) {
                                    const profileData = await profileRes.json()
                                    setAiBio(profileData.ai_bio || '')
                                    setAiBioGeneratedAt(profileData.ai_bio_generated_at || '')
                                    if (profileData.ai_bio) {
                                      toast.success('AI bio generated successfully!')
                                    }
                                  }
                                }, 5000)
                              } catch (err: any) {
                                toast.error(err.message || 'Failed to generate bio')
                              } finally {
                                setIsGeneratingBio(false)
                              }
                            }}
                            disabled={isGeneratingBio}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
                          >
                            {isGeneratingBio ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate AI Bio
                              </>
                            )}
                          </Button>
                        </div>
                        {aiBio ? (
                          <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30">
                            <p className="text-sm dark:text-gray-200 light:text-gray-800 italic">
                              "{aiBio}"
                            </p>
                            {aiBioGeneratedAt && (
                              <p className="text-xs text-gray-500 mt-2">
                                Generated {new Date(aiBioGeneratedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">
                            No AI bio generated yet. Create some artworks and click "Generate AI Bio" to analyze your artistic style!
                          </p>
                        )}
                      </div>

                      {/* AI Artist Personality Section */}
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <Label className="dark:text-gray-200 light:text-gray-700">
                            🎭 Artist Personality
                          </Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              setIsGeneratingPersonality(true)
                              const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
                              try {
                                const res = await fetch(`${API_BASE}/profiles/generate_personality/`, {
                                  method: 'POST',
                                  headers: apiClient.headers()
                                })
                                if (!res.ok) {
                                  const error = await res.json()
                                  throw new Error(error.detail || 'Failed to generate personality')
                                }
                                toast.success('Personality generation started! Refresh in a few moments.')
                                
                                // Poll for updated profile after a few seconds
                                setTimeout(async () => {
                                  const profileRes = await fetch(`${API_BASE}/profiles/me/`, { headers: apiClient.headers() })
                                  if (profileRes.ok) {
                                    const profileData = await profileRes.json()
                                    if (profileData.artist_personality) {
                                      try {
                                        const personality = JSON.parse(profileData.artist_personality)
                                        setArtistPersonality(personality)
                                        setArtistPersonalityGeneratedAt(profileData.artist_personality_generated_at || '')
                                        toast.success('Artist personality generated successfully!')
                                      } catch (e) {
                                        console.error('Failed to parse personality', e)
                                      }
                                    }
                                  }
                                }, 5000)
                              } catch (err: any) {
                                toast.error(err.message || 'Failed to generate personality')
                              } finally {
                                setIsGeneratingPersonality(false)
                              }
                            }}
                            disabled={isGeneratingPersonality}
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0"
                          >
                            {isGeneratingPersonality ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate Personality
                              </>
                            )}
                          </Button>
                        </div>
                        {artistPersonality ? (
                          <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30">
                            <h4 className="text-lg font-semibold dark:text-white light:text-gray-900 mb-2">
                              {artistPersonality.type}
                            </h4>
                            <p className="text-sm dark:text-gray-300 light:text-gray-700">
                              {artistPersonality.description}
                            </p>
                            {artistPersonalityGeneratedAt && (
                              <p className="text-xs text-gray-500 mt-2">
                                Generated {new Date(artistPersonalityGeneratedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">
                            No personality generated yet. Create some artworks and discover your unique artist archetype!
                          </p>
                        )}
                      </div>

                      {/* AI Skill Analysis Section */}
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <Label className="dark:text-gray-200 light:text-gray-700">
                            📊 Skill Analysis
                          </Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              setIsAnalyzingSkills(true)
                              const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
                              try {
                                const res = await fetch(`${API_BASE}/profiles/analyze_skills/`, {
                                  method: 'POST',
                                  headers: apiClient.headers()
                                })
                                if (!res.ok) {
                                  const error = await res.json()
                                  throw new Error(error.detail || 'Failed to analyze skills')
                                }
                                toast.success('Skill analysis started! Refresh in a few moments.')
                                
                                // Poll for updated profile after a few seconds
                                setTimeout(async () => {
                                  const profileRes = await fetch(`${API_BASE}/profiles/me/`, { headers: apiClient.headers() })
                                  if (profileRes.ok) {
                                    const profileData = await profileRes.json()
                                    setSkillAnalysis(profileData.skill_analysis || null)
                                    setSkillAnalysisUpdatedAt(profileData.skill_analysis_updated_at || '')
                                    if (profileData.skill_analysis) {
                                      toast.success('Skill analysis completed!')
                                    }
                                  }
                                }, 6000)
                              } catch (err: any) {
                                toast.error(err.message || 'Failed to analyze skills')
                              } finally {
                                setIsAnalyzingSkills(false)
                              }
                            }}
                            disabled={isAnalyzingSkills}
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
                          >
                            {isAnalyzingSkills ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Analyze Skills
                              </>
                            )}
                          </Button>
                        </div>
                        {skillAnalysis && skillAnalysis.composition ? (
                          <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 space-y-4">
                            {/* Overall Score */}
                            <div className="text-center pb-3 border-b border-blue-500/20">
                              <div className="text-3xl font-bold dark:text-white light:text-gray-900">
                                {skillAnalysis.overall_score}/100
                              </div>
                              <p className="text-xs text-gray-500">Overall Skill Level</p>
                            </div>
                            
                            {/* Individual Skills */}
                            <div className="space-y-3">
                              {/* Composition */}
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm font-medium dark:text-gray-200 light:text-gray-700">
                                    Composition
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                                      {skillAnalysis.composition.level}
                                    </span>
                                    <span className="text-xs font-bold dark:text-white light:text-gray-900">
                                      {skillAnalysis.composition.score}/100
                                    </span>
                                    {skillAnalysis.composition.growth !== 0 && (
                                      <span className={`text-xs ${skillAnalysis.composition.growth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {skillAnalysis.composition.growth > 0 ? '+' : ''}{skillAnalysis.composition.growth}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Progress value={skillAnalysis.composition.score} className="h-2" />
                              </div>

                              {/* Color Theory */}
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm font-medium dark:text-gray-200 light:text-gray-700">
                                    Color Theory
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                                      {skillAnalysis.color_theory.level}
                                    </span>
                                    <span className="text-xs font-bold dark:text-white light:text-gray-900">
                                      {skillAnalysis.color_theory.score}/100
                                    </span>
                                    {skillAnalysis.color_theory.growth !== 0 && (
                                      <span className={`text-xs ${skillAnalysis.color_theory.growth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {skillAnalysis.color_theory.growth > 0 ? '+' : ''}{skillAnalysis.color_theory.growth}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Progress value={skillAnalysis.color_theory.score} className="h-2" />
                              </div>

                              {/* Creativity */}
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm font-medium dark:text-gray-200 light:text-gray-700">
                                    Creativity
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                                      {skillAnalysis.creativity.level}
                                    </span>
                                    <span className="text-xs font-bold dark:text-white light:text-gray-900">
                                      {skillAnalysis.creativity.score}/100
                                    </span>
                                    {skillAnalysis.creativity.growth !== 0 && (
                                      <span className={`text-xs ${skillAnalysis.creativity.growth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {skillAnalysis.creativity.growth > 0 ? '+' : ''}{skillAnalysis.creativity.growth}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Progress value={skillAnalysis.creativity.score} className="h-2" />
                              </div>

                              {/* Complexity */}
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm font-medium dark:text-gray-200 light:text-gray-700">
                                    Complexity
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                                      {skillAnalysis.complexity.level}
                                    </span>
                                    <span className="text-xs font-bold dark:text-white light:text-gray-900">
                                      {skillAnalysis.complexity.score}/100
                                    </span>
                                    {skillAnalysis.complexity.growth !== 0 && (
                                      <span className={`text-xs ${skillAnalysis.complexity.growth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {skillAnalysis.complexity.growth > 0 ? '+' : ''}{skillAnalysis.complexity.growth}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Progress value={skillAnalysis.complexity.score} className="h-2" />
                              </div>

                              {/* Technical Skill */}
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm font-medium dark:text-gray-200 light:text-gray-700">
                                    Technical Skill
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                                      {skillAnalysis.technical_skill.level}
                                    </span>
                                    <span className="text-xs font-bold dark:text-white light:text-gray-900">
                                      {skillAnalysis.technical_skill.score}/100
                                    </span>
                                    {skillAnalysis.technical_skill.growth !== 0 && (
                                      <span className={`text-xs ${skillAnalysis.technical_skill.growth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {skillAnalysis.technical_skill.growth > 0 ? '+' : ''}{skillAnalysis.technical_skill.growth}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Progress value={skillAnalysis.technical_skill.score} className="h-2" />
                              </div>
                            </div>

                            {skillAnalysisUpdatedAt && (
                              <p className="text-xs text-gray-500 pt-2 border-t border-blue-500/20">
                                Last analyzed {new Date(skillAnalysisUpdatedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">
                            No skill analysis yet. Create artworks and click "Analyze Skills" to see your progression!
                          </p>
                        )}
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
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
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
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
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
