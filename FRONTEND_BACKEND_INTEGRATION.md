# Frontend-Backend Integration Guide

## 🔄 Complete Flow: How Front Office Connects to Back Office

### Current Setup Overview

**Backend (Django):** `localhost:8000/api/`
- Handles ALL art generation logic
- AI providers (Gemini, GPT-4o, Stable Diffusion)
- Celery tasks for async generation
- Image storage (Cloudinary or local)
- Admin panel for monitoring

**Frontend (Next.js):** `localhost:3000`
- User interface for art creation
- Displays generated images
- Polls backend for generation status
- **Does NOT generate images** - only displays them

---

## 📸 Image Generation & Display Flow

### How It Works (Step by Step)

```
1. USER CREATES ARTWORK IN FRONTEND
   ↓
   Frontend (Studio page) → POST /api/artworks/
   {
     "title": "My Art",
     "generation_type": "ai_prompt",
     "ai_provider": "gemini",
     "prompt": "Beautiful sunset",
     "image_size": "1024x1024"
   }

2. BACKEND RECEIVES REQUEST
   ↓
   Django creates Artwork record with status="queued"
   Triggers Celery task: generate_artwork.delay(artwork_id)
   Returns artwork ID to frontend
   Response: { "id": "abc-123", "status": "queued" }

3. CELERY WORKER PROCESSES TASK
   ↓
   Worker calls AI provider (Gemini/GPT-4o/etc)
   AI generates image (5-15 seconds)
   Image saved to Cloudinary (or local media folder)
   Artwork status → "completed"
   Image URL stored in artwork.image field

4. FRONTEND POLLS FOR STATUS
   ↓
   Every 2 seconds: GET /api/artworks/{id}/status/
   Backend returns: { "status": "completed", "image_url": "https://..." }

5. FRONTEND DISPLAYS IMAGE
   ↓
   <img src={artwork.image_url} />
   User sees generated image!
```

---

## 🖼️ Where Images Are Stored

### Option 1: Cloudinary (Recommended for Production)

**Setup in .env:**
```bash
USE_CLOUDINARY=True
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
```

**Image URLs:**
```
https://res.cloudinary.com/your-cloud/image/upload/v1/artworks/abc-123.jpg
```

**Benefits:**
- ✅ CDN delivery (fast worldwide)
- ✅ Automatic image optimization
- ✅ Transformations (resize, crop, filters)
- ✅ Free tier: 25GB storage, 25GB/month bandwidth
- ✅ No server storage needed

### Option 2: Local Storage (Development)

**Setup in .env:**
```bash
USE_CLOUDINARY=False
```

**Image URLs:**
```
http://localhost:8000/media/artworks/2025/10/22/abc-123.jpg
```

**Benefits:**
- ✅ No external dependencies
- ✅ Free
- ✅ Good for development/testing

**Drawbacks:**
- ❌ No CDN
- ❌ Server disk space usage
- ❌ Slower for global users

---

## 🎨 Frontend Integration (Next.js)

### Step 1: Create API Client

Create `FrontOffice/lib/api.ts`:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const apiClient = {
  // Get token from localStorage/cookies
  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pentaart_token');
    }
    return null;
  },

  // Set auth headers
  headers: () => {
    const token = apiClient.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Token ${token}` })
    };
  },

  // Login
  login: async (username: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username, password})
    });
    const data = await response.json();
    if (data.token) {
      localStorage.setItem('pentaart_token', data.token);
    }
    return data;
  },

  // Generate artwork
  generateArtwork: async (artworkData: {
    title: string;
    generation_type: string;
    ai_provider: string;
    prompt: string;
    image_size: string;
    is_public?: boolean;
  }) => {
    const response = await fetch(`${API_BASE_URL}/artworks/`, {
      method: 'POST',
      headers: apiClient.headers(),
      body: JSON.stringify(artworkData)
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  },

  // Poll for status
  getArtworkStatus: async (artworkId: string) => {
    const response = await fetch(
      `${API_BASE_URL}/artworks/${artworkId}/status/`,
      {headers: apiClient.headers()}
    );
    return response.json();
  },

  // Get artwork details
  getArtwork: async (artworkId: string) => {
    const response = await fetch(
      `${API_BASE_URL}/artworks/${artworkId}/`,
      {headers: apiClient.headers()}
    );
    return response.json();
  },

  // List artworks with filters
  getArtworks: async (filters?: {
    status?: string;
    ai_provider?: string;
    ordering?: string;
    page?: number;
  }) => {
    const params = new URLSearchParams(filters as any);
    const response = await fetch(
      `${API_BASE_URL}/artworks/?${params}`,
      {headers: apiClient.headers()}
    );
    return response.json();
  }
};
```

### Step 2: Update Studio Page

Replace `FrontOffice/app/studio/page.tsx` with real API calls:

```typescript
"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api"
import { Sparkles, Download, Save, Share2, Shuffle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import Image from "next/image"

export default function StudioPage() {
  const [prompt, setPrompt] = useState("")
  const [aiProvider, setAiProvider] = useState("gemini")
  const [imageSize, setImageSize] = useState("1024x1024")
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [artworkId, setArtworkId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setProgress(0)
    setError(null)
    setGeneratedImage(null)

    try {
      // Call backend API to create artwork
      const artwork = await apiClient.generateArtwork({
        title: prompt.substring(0, 50) || "Untitled",
        generation_type: "ai_prompt",
        ai_provider: aiProvider,
        prompt: prompt,
        image_size: imageSize,
        is_public: true
      });

      setArtworkId(artwork.id);

      // Start polling for status
      pollArtworkStatus(artwork.id);

    } catch (err: any) {
      setError(err.message || "Failed to generate artwork");
      setIsGenerating(false);
    }
  };

  const pollArtworkStatus = async (id: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await apiClient.getArtworkStatus(id);

        // Update progress based on status
        if (status.status === 'queued') {
          setProgress(20);
        } else if (status.status === 'processing') {
          setProgress(60);
        } else if (status.status === 'completed') {
          setProgress(100);
          setGeneratedImage(status.image_url);
          setIsGenerating(false);
          clearInterval(pollInterval);
        } else if (status.status === 'failed') {
          setError(status.error_message || "Generation failed");
          setIsGenerating(false);
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 2 minutes (timeout)
    setTimeout(() => {
      clearInterval(pollInterval);
      if (isGenerating) {
        setError("Generation timeout - please try again");
        setIsGenerating(false);
      }
    }, 120000);
  };

  const handleDownload = async () => {
    if (generatedImage) {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pentaart-${artworkId}.jpg`;
      a.click();
    }
  };

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Generation Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Generate Art with AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Describe your artwork
                </label>
                <Textarea
                  placeholder="A serene landscape with mountains at sunset, vibrant colors..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    AI Provider
                  </label>
                  <Select value={aiProvider} onValueChange={setAiProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini">Gemini 2.5 Flash (FREE)</SelectItem>
                      <SelectItem value="gpt4o">GPT-4o ($0.04/image)</SelectItem>
                      <SelectItem value="huggingface">Stable Diffusion XL (FREE)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Image Size
                  </label>
                  <Select value={imageSize} onValueChange={setImageSize}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="512x512">512 × 512</SelectItem>
                      <SelectItem value="1024x1024">1024 × 1024</SelectItem>
                      <SelectItem value="1024x1792">1024 × 1792 (Portrait)</SelectItem>
                      <SelectItem value="1792x1024">1792 × 1024 (Landscape)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!prompt || isGenerating}
                className="w-full"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                {isGenerating ? "Generating..." : "Generate Art"}
              </Button>

              {isGenerating && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-center">
                    {progress < 30 ? "Queuing generation..." :
                     progress < 70 ? "AI is creating your artwork..." :
                     progress < 100 ? "Finalizing image..." :
                     "Complete!"}
                  </p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
                  Error: {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview Area */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                {generatedImage ? (
                  <Image
                    src={generatedImage}
                    alt="Generated artwork"
                    width={1024}
                    height={1024}
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p>Creating your artwork...</p>
                      </>
                    ) : (
                      <p>Your generated artwork will appear here</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDownload}
                  disabled={!generatedImage}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={!generatedImage}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save to Gallery
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={!generatedImage}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
```

### Step 3: Add Environment Variables

Create `FrontOffice/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

For production:
```bash
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

---

## 🔧 Admin Back Office Control

### What Admin Can Do:

**Access Admin:** `http://localhost:8000/admin/`

1. **Monitor All Generations**
   - View all artworks (queued, processing, completed, failed)
   - See generation times and errors
   - Filter by AI provider, user, date

2. **Manage Users**
   - View user profiles and statistics
   - Track total artworks per user
   - Manage permissions

3. **View Activity Logs**
   - Track all user actions
   - See when artworks were created
   - Monitor system usage

4. **Collection Management**
   - View user collections
   - Manage artwork organization

5. **Debug Issues**
   - Check Celery task IDs
   - View error messages
   - See generation timing

**Admin CANNOT generate images directly** - generation happens via:
- Frontend API calls
- Direct API requests (cURL, Postman)
- Celery tasks (triggered programmatically)

---

## 🌐 Useful Public APIs to Integrate

### From the GitHub Lists You Shared

#### 🎨 **Art & Design APIs**

1. **Rijksmuseum API** (Free)
   ```
   https://data.rijksmuseum.nl/object-metadata/api/
   ```
   **Use Case:** Get famous artwork images for style reference
   **Integration:** Add "Generate in style of..." feature
   ```typescript
   // Example: Generate art inspired by Van Gogh paintings
   const inspiration = await fetch('https://www.rijksmuseum.nl/api/...');
   const prompt = `${userPrompt}, in the style of ${artwork.artist}`;
   ```

2. **Metropolitan Museum of Art API** (Free)
   ```
   https://metmuseum.github.io/
   ```
   **Use Case:** Browse art history for inspiration
   **Integration:** "Art History Explorer" section in frontend

3. **Color API** (Free)
   ```
   https://www.thecolorapi.com/
   ```
   **Use Case:** Generate color palettes from user input
   **Integration:** Color scheme suggestions for prompts
   ```typescript
   // Get complementary colors for artwork
   const palette = await fetch('https://www.thecolorapi.com/scheme?hex=FF0000');
   // Suggest: "Try these colors in your prompt: ..."
   ```

4. **Harvard Art Museums API** (Free, requires key)
   ```
   https://github.com/harvardartmuseums/api-docs
   ```
   **Use Case:** High-quality art references
   **Integration:** "Inspired by masterpieces" feature

#### 🖼️ **Image Processing APIs**

5. **imgbb API** (Free tier)
   ```
   https://api.imgbb.com/
   ```
   **Use Case:** Temporary image hosting for sharing
   **Integration:** Share button uploads to imgbb and gives shareable link

6. **Remove.bg API** (Free: 50/month)
   ```
   https://www.remove.bg/api
   ```
   **Use Case:** Remove backgrounds from generated art
   **Integration:** "Remove background" button in editor

7. **DeepAI APIs** (Free tier)
   ```
   https://deepai.org/machine-learning-model
   ```
   **Options:**
   - Image colorization
   - Image upscaling
   - Style transfer
   - Image similarity

   **Use Case:** Post-processing effects
   **Integration:** Effects panel in studio

#### 🌈 **Color & Design Tools**

8. **Colormind API** (Free)
   ```
   http://colormind.io/api-access/
   ```
   **Use Case:** AI-generated color palettes
   **Integration:** Auto-suggest colors for prompts

9. **Coolors API** (Free)
   ```
   https://coolors.co/api
   ```
   **Use Case:** Palette generation and management
   **Integration:** Color scheme library

#### 📊 **Analytics & Tracking**

10. **Umami Analytics** (Open source, self-hosted)
    ```
    https://umami.is/docs/api
    ```
    **Use Case:** Track generation statistics
    **Integration:** Analytics dashboard

#### 🔤 **Text & NLP**

11. **OpenAI GPT-4 API** (Already have key!)
    ```
    https://platform.openai.com/docs/api-reference
    ```
    **Use Case:** Improve user prompts automatically
    **Integration:** "Enhance my prompt" button
    ```typescript
    const enhancedPrompt = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: "Enhance this art generation prompt with more details"
      }, {
        role: "user",
        content: userPrompt
      }]
    });
    ```

12. **Dictionary API** (Free)
    ```
    https://dictionaryapi.dev/
    ```
    **Use Case:** Define art terms for users
    **Integration:** Hover tooltips on style presets

#### 🎭 **Fun Additions**

13. **Unsplash API** (Free)
    ```
    https://unsplash.com/developers
    ```
    **Use Case:** Reference photos for "image-to-image" generation
    **Integration:** "Start from photo" feature

14. **Lorem Picsum** (Free)
    ```
    https://picsum.photos/
    ```
    **Use Case:** Placeholder images during development
    **Integration:** Already useful for testing!

15. **Random User Generator** (Free)
    ```
    https://randomuser.me/
    ```
    **Use Case:** Generate test user data
    **Integration:** Development/demo accounts

---

## 🚀 Recommended Integration Plan

### Phase 1: Core Image Generation (Current)
- ✅ Backend generates images
- ✅ Cloudinary storage
- ✅ Frontend polls status
- ✅ Display generated images

### Phase 2: Enhanced Features (Next)

**Add to Frontend:**
```typescript
// lib/apis/color.ts
export const getColorPalette = async (hex: string) => {
  const response = await fetch(`https://www.thecolorapi.com/scheme?hex=${hex}&mode=analogic&count=5`);
  return response.json();
};

// lib/apis/art-reference.ts
export const getMetArtwork = async (objectID: number) => {
  const response = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectID}`);
  return response.json();
};

// lib/apis/prompt-enhancement.ts
export const enhancePrompt = async (prompt: string, openaiKey: string) => {
  // Use your existing OpenAI key from backend
  // Or call a new backend endpoint: POST /api/enhance-prompt/
  const response = await fetch('http://localhost:8000/api/enhance-prompt/', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({prompt})
  });
  return response.json();
};
```

**Add to Studio Page:**
```tsx
// Color palette picker
<ColorPalettePicker onSelect={(colors) => {
  setPrompt(prev => `${prev}, color palette: ${colors.join(', ')}`);
}} />

// Prompt enhancer button
<Button onClick={async () => {
  const enhanced = await enhancePrompt(prompt);
  setPrompt(enhanced.prompt);
}}>
  ✨ Enhance Prompt
</Button>

// Art style reference
<ArtStyleSelector onSelect={(style) => {
  setPrompt(prev => `${prev}, in the style of ${style.artist}`);
}} />
```

---

## 📋 Integration Checklist

### Backend (Django) ✅ DONE
- [x] Celery task queue setup
- [x] AI provider integrations
- [x] Cloudinary configuration
- [x] Admin back office
- [x] REST API endpoints
- [x] Image storage handling

### Frontend (Next.js) 🚧 TO DO
- [ ] Create `lib/api.ts` API client
- [ ] Update Studio page with real API calls
- [ ] Add status polling logic
- [ ] Handle image display from Cloudinary
- [ ] Add error handling
- [ ] Implement authentication flow
- [ ] Add download functionality
- [ ] Integrate public APIs (optional)

### Testing 🧪 TO DO
- [ ] Test full generation flow
- [ ] Test with all AI providers
- [ ] Test Cloudinary image display
- [ ] Test error scenarios
- [ ] Test on mobile devices

---

## 🎯 Quick Start Commands

### Terminal 1: Start Backend
```bash
cd django-platform
venv\Scripts\activate
python manage.py runserver
```

### Terminal 2: Start Celery
```bash
cd django-platform
venv\Scripts\activate
celery -A platform_core worker -l info -P solo
```

### Terminal 3: Start Redis
```bash
redis-server
```

### Terminal 4: Start Frontend
```bash
cd FrontOffice
npm run dev
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/
- Admin: http://localhost:8000/admin/

---

## 🤔 Common Questions

**Q: Does the admin panel generate images?**
A: No - admin is for MONITORING only. Generation happens via API calls from frontend or direct HTTP requests.

**Q: Where are images stored in production?**
A: Cloudinary (recommended) or your server's media folder. Cloudinary URLs are returned to frontend.

**Q: Can I test generation without frontend?**
A: Yes! Use cURL or Postman to call the API directly (see API_DOCUMENTATION.md).

**Q: How do I see generated images in admin?**
A: Go to http://localhost:8000/admin/media_processing/artwork/ - you can preview images inline.

**Q: What if Celery isn't running?**
A: Artworks will stay in "queued" status forever. Always run Celery worker!

**Q: Can I use your algorithmic art generators?**
A: Yes! Place your Python art generation code in `media_processing/algorithms/` and the tasks will use it.

---

**Next Step:** Update your Studio page to make real API calls instead of fake progress bars! 🚀
