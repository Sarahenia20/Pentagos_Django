"use client"

import { useState, useEffect } from "react"
import { Sparkles, Download, AlertCircle, Loader2, Save, Cloud } from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import Image from "next/image"

export default function StudioPage() {
  // Form state
  const [prompt, setPrompt] = useState("")
  const [aiProvider, setAiProvider] = useState("gpt4o")  // DALL-E only for now
  const [imageSize, setImageSize] = useState("1024x1024")

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState("")
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [artworkId, setArtworkId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  /**
   * Load persisted artwork from localStorage on mount
   */
  useEffect(() => {
    // Debug: Test if toast is working
    console.log("Studio page mounted - testing toast");
    
    const savedArtwork = localStorage.getItem('pendingArtwork');
    if (savedArtwork) {
      try {
        const { imageUrl, id } = JSON.parse(savedArtwork);
        setGeneratedImage(imageUrl);
        setArtworkId(id);
        console.log("Restored artwork from localStorage:", id);
        toast.info(" Restored previous artwork", {
          description: "Your artwork was restored from the last session"
        });
      } catch (err) {
        console.error("Failed to restore artwork:", err);
        localStorage.removeItem('pendingArtwork');
      }
    }
  }, []);

  /**
   * Handle artwork generation
   */
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      toast.error("Prompt required", {
        description: "Please enter a prompt to generate artwork"
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setError(null);
    setGeneratedImage(null);
    setProgressMessage("Starting generation...");
    
    // Show loading toast
    toast.info(" Starting generation...", {
      description: "Your artwork is being created"
    });

    try {
      // Step 1: Create artwork via API
      setProgress(10);
      setProgressMessage("Sending request to backend...");

      const artwork = await apiClient.generateArtwork({
        title: prompt.substring(0, 50) || "Untitled Artwork",
        generation_type: "ai_prompt",
        ai_provider: aiProvider as any,
        prompt: prompt,
        image_size: imageSize,
        is_public: true
      });

      console.log("Artwork created:", artwork);
      setArtworkId(artwork.id);
      setProgress(20);
      setProgressMessage("Artwork queued for generation...");

      // Step 2: Poll for status
      let pollCount = 0;
      const maxPolls = 60; // 2 minutes max (60 * 2 seconds)

      const cleanup = apiClient.pollArtworkStatus(
        artwork.id,
        (status) => {
          pollCount++;
          console.log(`Poll ${pollCount}: Status =`, status.status);

          if (status.status === 'queued') {
            setProgress(30);
            setProgressMessage("Waiting in queue...");
          } else if (status.status === 'processing') {
            setProgress(60);
            setProgressMessage("AI is creating your artwork...");
          } else if (status.status === 'completed') {
            setProgress(100);
            setProgressMessage("Complete!");
            setGeneratedImage(status.image_url || null);
            setIsGenerating(false);
            console.log("Image URL:", status.image_url);
            
            // Show success toast
            toast.success(" Artwork created successfully!", {
              description: "Your artwork is ready to download or save to gallery"
            });
            
            // Persist to localStorage using the ID from status response
            if (status.image_url && status.id) {
              localStorage.setItem('pendingArtwork', JSON.stringify({
                imageUrl: status.image_url,
                id: status.id
              }));
              console.log("Saved artwork to localStorage:", status.id);
            }
          } else if (status.status === 'failed') {
            setError(status.error_message || "Generation failed");
            setIsGenerating(false);
            console.error("Generation failed:", status.error_message);
            toast.error(" Generation failed", {
              description: status.error_message || "Please try again"
            });
          }

          // Timeout check
          if (pollCount >= maxPolls && status.status !== 'completed') {
            setError("Generation timeout - taking too long");
            setIsGenerating(false);
            toast.error(" Generation timeout", {
              description: "The generation is taking too long, please try again"
            });
          }
        },
        2000, // Poll every 2 seconds
        120000 // 2 minute timeout
      );

    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "Failed to generate artwork");
      setIsGenerating(false);
      toast.error(" Generation error", {
        description: err.message || "Failed to generate artwork"
      });
    }
  };

  /**
   * Download generated image
   */
  const handleDownload = async () => {
    if (!generatedImage) return;

    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pentaart-${artworkId || 'artwork'}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      setError("Failed to download image");
    }
  };

  /**
   * Discard generated artwork
   */
  const handleDiscard = async () => {
    if (!artworkId) return;
    
    try {
      // Delete artwork from backend
      await apiClient.deleteArtwork(artworkId);
      console.log("Deleted artwork from backend:", artworkId);
      
      // Clear UI state
      setGeneratedImage(null);
      setArtworkId(null);
      setProgress(0);
      setProgressMessage("");
      setError(null);
      
      // Clear localStorage
      localStorage.removeItem('pendingArtwork');
      console.log("Discarded artwork and cleared localStorage");
      
      // Show success toast
      toast.success(" Artwork discarded", {
        description: "The artwork has been deleted from the system"
      });
    } catch (err) {
      console.error("Failed to delete artwork:", err);
      setError("Failed to discard artwork");
      toast.error("Failed to discard artwork", {
        description: "Please try again"
      });
    }
  };

  /**
   * Save to Gallery
   */
  const handleSaveToCloudinary = async () => {
    if (!artworkId) return;

    setIsSaving(true);

    try {
      const response = await fetch(`http://localhost:8000/api/artworks/${artworkId}/save_to_cloudinary/`, {
        method: 'POST',
        headers: apiClient.headers(),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Cloudinary URL:", data.cloudinary_url);
        
        // Clear localStorage after successful save
        localStorage.removeItem('pendingArtwork');
        console.log("Cleared artwork from localStorage");
        
        // Show success toast
        toast.success("✨ Saved to Gallery!", {
          description: "Your artwork has been saved to your gallery"
        });
        
        // Clear the UI state
        setGeneratedImage(null);
        setArtworkId(null);
        setProgress(0);
        setProgressMessage("");
        
        // Redirect to gallery after 1 second
        setTimeout(() => {
          window.location.href = '/gallery';
        }, 1000);
      } else {
        console.error("Save error:", data.error);
        toast.error("Failed to save to gallery", {
          description: data.error || "Please try again"
        });
      }
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Failed to save to gallery", {
        description: "Network error, please try again"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen dark:bg-black light:bg-white dark:text-white light:text-gray-900">
      <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-purple-900/20 dark:via-black dark:to-pink-900/20 light:bg-gradient-to-br light:from-purple-100 light:via-white light:to-pink-100" />

      <div className="relative z-10">

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Generation Panel */}
            <Card className="dark:border-purple-500/20 dark:bg-gray-900/50 light:border-purple-200 light:bg-white backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-purple-100 light:text-purple-900">
                  <Sparkles className="h-5 w-5 dark:text-purple-400 light:text-purple-600" />
                  Generate Art with AI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Prompt Input */}
                <div>
                  <label className="text-sm font-medium mb-2 block dark:text-purple-200 light:text-purple-800">
                    Describe your artwork
                  </label>
                  <Textarea
                    placeholder="A serene landscape with mountains at sunset, vibrant colors, digital art style..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    disabled={isGenerating}
                    className="resize-none dark:bg-indigo-900/50 dark:border-purple-500/30 dark:text-white dark:placeholder:text-purple-300/50 light:bg-purple-50 light:border-purple-300 light:text-gray-900"
                  />
                </div>

                {/* Settings Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* AI Provider - DALL-E ONLY */}
                  <div>
                    <label className="text-sm font-medium mb-2 block dark:text-purple-200 light:text-purple-800">
                      AI Provider (DALL-E 3)
                    </label>
                    <Select value={aiProvider} onValueChange={setAiProvider} disabled={true}>
                      <SelectTrigger className="dark:bg-indigo-900/50 dark:border-purple-500/30 dark:text-white light:bg-purple-50 light:border-purple-300 light:text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt4o">DALL-E 3 (via GPT-4o)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Image Size */}
                  <div>
                    <label className="text-sm font-medium mb-2 block dark:text-purple-200 light:text-purple-800">
                      Image Size
                    </label>
                    <Select value={imageSize} onValueChange={setImageSize} disabled={isGenerating}>
                      <SelectTrigger className="dark:bg-indigo-900/50 dark:border-purple-500/30 dark:text-white light:bg-purple-50 light:border-purple-300 light:text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="512x512">512  512</SelectItem>
                        <SelectItem value="1024x1024">1024  1024 (Recommended)</SelectItem>
                        <SelectItem value="1024x1792">1024  1792 (Portrait)</SelectItem>
                        <SelectItem value="1792x1024">1792  1024 (Landscape)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate Art
                    </>
                  )}
                </Button>

                {/* Progress Bar */}
                {isGenerating && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-center dark:text-purple-200 light:text-purple-700">
                      {progressMessage} ({progress}%)
                    </p>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-200">Generation Error</p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preview Area */}
            <Card className="dark:border-purple-500/20 dark:bg-gray-900/50 light:border-purple-200 light:bg-white backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="dark:text-purple-100 light:text-purple-900">Generated Artwork</CardTitle>
              </CardHeader>
              <CardContent>

                {/* Image Display */}
                <div className="aspect-square dark:bg-indigo-900/30 light:bg-purple-50 rounded-lg flex items-center justify-center dark:border-purple-500/20 light:border-purple-200 border overflow-hidden">
                  {generatedImage ? (
                    <Image
                      src={generatedImage}
                      alt="Generated artwork"
                      width={1024}
                      height={1024}
                      className="w-full h-full object-contain"
                      unoptimized
                    />
                  ) : isGenerating ? (
                    <div className="text-center">
                      <Loader2 className="h-16 w-16 animate-spin dark:text-purple-400 light:text-purple-600 mx-auto mb-4" />
                      <p className="dark:text-purple-200 light:text-purple-700 font-medium">
                        {progressMessage}
                      </p>
                      <p className="dark:text-purple-300/70 light:text-purple-500 text-sm mt-2">
                        This usually takes 5-15 seconds
                      </p>
                    </div>
                  ) : (
                    <div className="text-center dark:text-purple-300/70 light:text-purple-400">
                      <Sparkles className="h-16 w-16 mx-auto mb-4" />
                      <p className="font-medium">Your generated artwork will appear here</p>
                      <p className="text-sm mt-2">Enter a prompt above and click Generate Art</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="outline"
                    onClick={handleDownload}
                    disabled={!generatedImage}
                    className="flex-1 bg-blue-500/10 border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDiscard}
                    disabled={!generatedImage}
                    className="flex-1 bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-500/20 hover:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Discard
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSaveToCloudinary}
                    disabled={!generatedImage || isSaving}
                    className="flex-1 bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400 hover:bg-green-500/20 hover:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Cloud className="h-4 w-4 mr-2" />
                    )}
                    {isSaving ? "Saving..." : "Save to Gallery"}
                  </Button>
                </div>

                {/* Artwork Info */}
                {artworkId && (
                  <div className="mt-4 p-3 rounded-lg dark:bg-indigo-900/30 light:bg-purple-50 border dark:border-purple-500/20 light:border-purple-200">
                    <p className="text-xs dark:text-purple-300 light:text-purple-700">
                      <span className="font-medium">Artwork ID:</span> {artworkId}
                    </p>
                    <p className="text-xs dark:text-purple-300 light:text-purple-700 mt-1">
                      <span className="font-medium">Provider:</span> {aiProvider} | <span className="font-medium">Size:</span> {imageSize}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Help Card */}
            <Card className="dark:border-purple-500/20 dark:bg-gray-900/50 light:border-purple-200 light:bg-white backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-base dark:text-purple-100 light:text-purple-900"> Tips for Better Results</CardTitle>
              </CardHeader>
              <CardContent className="text-sm dark:text-purple-200 light:text-purple-800 space-y-2">
                <p> <strong>Be specific:</strong> Include details about style, colors, mood, and composition</p>
                <p> <strong>Use descriptive language:</strong> "vibrant", "serene", "dramatic", "minimalist"</p>
                <p> <strong>Gemini is FREE</strong> and great for most use cases</p>
                <p> <strong>GPT-4o costs $0.04</strong> per image but offers higher quality</p>
                <p> <strong>Generation takes 5-15 seconds</strong> - please be patient!</p>
              </CardContent>
            </Card>

          </div>
        </main>
      </div>
    </div>
  )
}
