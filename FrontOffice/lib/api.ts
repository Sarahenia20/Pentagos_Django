const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

type ArtworkData = Record<string, any>

type ArtworkStatus = {
  id?: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  image_url?: string
  error_message?: string
}

// Helper function to get proper image URL
export const getImageUrl = (imageUrl?: string) => {
  if (!imageUrl) return '/placeholder.svg'
  // If it's already a full URL (http/https), return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  // If it's a relative path, prepend backend URL
  return `${BACKEND_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
}

export const apiClient = {
  // Get token from localStorage/cookies
  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pentaart_token')
    }
    return null
  },

  // Set auth headers
  headers: () => {
    const token = apiClient.getToken()
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Token ${token}` } : {})
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!apiClient.getToken()
  },

  // Create artwork record and queue generation
  generateArtwork: async (artworkData: ArtworkData) => {
    const response = await fetch(`${API_BASE_URL}/artworks/`, {
      method: 'POST',
      headers: apiClient.headers(),
      body: JSON.stringify(artworkData)
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || response.statusText || 'API Error')
    }
    return response.json()
  },

  // Get status for an artwork
  getArtworkStatus: async (artworkId: string): Promise<ArtworkStatus> => {
    const response = await fetch(`${API_BASE_URL}/artworks/${artworkId}/status/`, {
      headers: apiClient.headers()
    })
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    return response.json()
  },

  // Get artwork details
  getArtwork: async (artworkId: string) => {
    const response = await fetch(`${API_BASE_URL}/artworks/${artworkId}/`, {
      headers: apiClient.headers()
    })
    if (!response.ok) throw new Error(response.statusText)
    return response.json()
  },

  // List artworks
  getArtworks: async (filters?: Record<string, any>) => {
    const params = new URLSearchParams(filters as any)
    const response = await fetch(`${API_BASE_URL}/artworks/?${params.toString()}`, {
      headers: apiClient.headers()
    })
    if (!response.ok) throw new Error(response.statusText)
    return response.json()
  },

  // Get current user profile
  getUserProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me/`, {
      headers: apiClient.headers()
    })
    if (!response.ok) throw new Error(response.statusText)
    return response.json()
  },

  // Delete artwork
  deleteArtwork: async (artworkId: string) => {
    const response = await fetch(`${API_BASE_URL}/artworks/${artworkId}/`, {
      method: 'DELETE',
      headers: apiClient.headers()
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || response.statusText || 'Delete failed')
    }
    return true
  },

  // Poll artwork status and call callback on each update. Returns a cleanup function.
  pollArtworkStatus: (
    artworkId: string,
    onUpdate: (status: ArtworkStatus) => void,
    intervalMs = 2000,
    timeoutMs = 120000
  ) => {
    let stopped = false
    const poll = async () => {
      try {
        const status = await apiClient.getArtworkStatus(artworkId)
        onUpdate(status)
        if (status.status === 'completed' || status.status === 'failed') {
          stopped = true
        }
      } catch (err) {
        console.error('pollArtworkStatus error:', err)
      }
    }

    const interval = setInterval(() => {
      if (stopped) return
      poll()
    }, intervalMs)

    // Fire first poll immediately
    poll()

    const timeout = setTimeout(() => {
      stopped = true
      clearInterval(interval)
    }, timeoutMs)

    // Return cleanup function
    return () => {
      stopped = true
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }
}

export default apiClient
