# PentaArt API Documentation

Complete REST API documentation for frontend integration.

**Base URL:** `http://localhost:8000/api/`

**Production URL:** `https://your-domain.com/api/`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Artworks](#artworks)
3. [Collections](#collections)
4. [Tags](#tags)
5. [User Profiles](#user-profiles)
6. [Activity Logs](#activity-logs)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [WebSocket Support](#websocket-support-future)

---

## Authentication

PentaArt uses Token-based authentication. All authenticated endpoints require an `Authorization` header.

### Register New User

```http
POST /api/auth/register/
Content-Type: application/json

{
  "username": "john_artist",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "password2": "SecurePass123!"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": 1,
    "username": "john_artist",
    "email": "john@example.com"
  },
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "message": "User registered successfully"
}
```

### Login

```http
POST /api/auth/login/
Content-Type: application/json

{
  "username": "john_artist",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "user": {
    "id": 1,
    "username": "john_artist",
    "email": "john@example.com"
  }
}
```

### Logout

```http
POST /api/auth/logout/
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
```

**Response (200 OK):**
```json
{
  "message": "Successfully logged out"
}
```

### Get Current User

```http
GET /api/auth/me/
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
```

**Response (200 OK):**
```json
{
  "id": 1,
  "username": "john_artist",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "profile": {
    "bio": "Digital artist exploring AI art",
    "location": "San Francisco, CA",
    "website": "https://john.art",
    "avatar": "/media/avatars/john.jpg",
    "total_artworks": 42,
    "total_likes_received": 1337,
    "followers_count": 89,
    "following_count": 156
  }
}
```

---

## Artworks

### List Artworks

Get paginated list of public artworks + authenticated user's private artworks.

```http
GET /api/artworks/
Authorization: Token YOUR_TOKEN (optional)
```

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `status` (string): Filter by status (`queued`, `processing`, `completed`, `failed`)
- `generation_type` (string): Filter by type (`ai_prompt`, `algorithmic`, `hybrid`)
- `ai_provider` (string): Filter by provider (`gpt4o`, `gemini`, `huggingface`)
- `is_public` (boolean): Filter by visibility
- `user` (integer): Filter by user ID
- `search` (string): Search in title and prompt
- `ordering` (string): Order by field (`-created_at`, `likes_count`, `-views_count`)

**Example:**
```http
GET /api/artworks/?status=completed&ai_provider=gemini&ordering=-likes_count&page=2
```

**Response (200 OK):**
```json
{
  "count": 156,
  "next": "http://localhost:8000/api/artworks/?page=3",
  "previous": "http://localhost:8000/api/artworks/?page=1",
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user": {
        "id": 1,
        "username": "john_artist"
      },
      "title": "Cyberpunk Cityscape",
      "prompt": "A neon-lit cyberpunk city at night with flying cars",
      "generation_type": "ai_prompt",
      "ai_provider": "gemini",
      "status": "completed",
      "image": "https://res.cloudinary.com/pentaart/image/upload/v1/artworks/2025/10/22/550e8400.jpg",
      "image_size": "1024x1024",
      "is_public": true,
      "likes_count": 47,
      "views_count": 892,
      "tags": [
        {"id": 1, "name": "cyberpunk", "slug": "cyberpunk"},
        {"id": 5, "name": "cityscape", "slug": "cityscape"}
      ],
      "created_at": "2025-10-22T10:30:00Z",
      "generation_duration": "8.3 seconds"
    }
  ]
}
```

### Create Artwork (Trigger Generation)

```http
POST /api/artworks/
Authorization: Token YOUR_TOKEN
Content-Type: application/json
```

**AI Prompt Generation:**
```json
{
  "title": "Mountain Sunset",
  "generation_type": "ai_prompt",
  "ai_provider": "gemini",
  "prompt": "A beautiful sunset over mountains with vibrant orange and purple colors",
  "image_size": "1024x1024",
  "is_public": true,
  "ai_params": {
    "quality": "standard"
  }
}
```

**Algorithmic Generation:**
```json
{
  "title": "Fractal Art",
  "generation_type": "algorithmic",
  "algorithm_name": "fractals",
  "image_size": "1024x1024",
  "algorithm_params": {
    "type": "mandelbrot",
    "iterations": 100,
    "color_scheme": "rainbow"
  },
  "is_public": true
}
```

**Hybrid Generation:**
```json
{
  "title": "AI + Algorithmic Blend",
  "generation_type": "hybrid",
  "ai_provider": "gpt4o",
  "prompt": "Abstract landscape with geometric patterns",
  "algorithm_name": "geometric",
  "blend_mode": "overlay",
  "blend_alpha": 0.6,
  "image_size": "1024x1024",
  "is_public": true
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user": {
    "id": 1,
    "username": "john_artist"
  },
  "title": "Mountain Sunset",
  "status": "queued",
  "celery_task_id": "abc-123-def-456",
  "generation_type": "ai_prompt",
  "ai_provider": "gemini",
  "prompt": "A beautiful sunset over mountains...",
  "created_at": "2025-10-22T11:00:00Z",
  "image": null
}
```

**Important:** After creation, poll the `/status/` endpoint to check generation progress.

### Get Artwork Details

```http
GET /api/artworks/{artwork_id}/
Authorization: Token YOUR_TOKEN (if private)
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user": {
    "id": 1,
    "username": "john_artist"
  },
  "title": "Mountain Sunset",
  "prompt": "A beautiful sunset over mountains...",
  "generation_type": "ai_prompt",
  "ai_provider": "gemini",
  "status": "completed",
  "image": "https://res.cloudinary.com/pentaart/image/upload/v1/artworks/550e8400.jpg",
  "image_size": "1024x1024",
  "is_public": true,
  "likes_count": 12,
  "views_count": 234,
  "tags": [],
  "created_at": "2025-10-22T11:00:00Z",
  "generation_started_at": "2025-10-22T11:00:05Z",
  "generation_completed_at": "2025-10-22T11:00:13Z",
  "generation_duration": "8.2 seconds"
}
```

### Get Artwork Generation Status

**Used for polling during generation.**

```http
GET /api/artworks/{artwork_id}/status/
Authorization: Token YOUR_TOKEN
```

**Response (200 OK):**

**Status: Queued**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "generation_started_at": null,
  "generation_completed_at": null,
  "generation_duration": null,
  "error_message": null,
  "image_url": null
}
```

**Status: Processing**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "generation_started_at": "2025-10-22T11:00:05Z",
  "generation_completed_at": null,
  "generation_duration": null,
  "error_message": null,
  "image_url": null
}
```

**Status: Completed**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "generation_started_at": "2025-10-22T11:00:05Z",
  "generation_completed_at": "2025-10-22T11:00:13Z",
  "generation_duration": "8.2 seconds",
  "error_message": null,
  "image_url": "https://res.cloudinary.com/pentaart/image/upload/v1/artworks/550e8400.jpg"
}
```

**Status: Failed**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "generation_started_at": "2025-10-22T11:00:05Z",
  "generation_completed_at": "2025-10-22T11:00:08Z",
  "generation_duration": "3.1 seconds",
  "error_message": "OpenAI API Error: Invalid API key provided",
  "image_url": null
}
```

### Like Artwork

```http
POST /api/artworks/{artwork_id}/like/
Authorization: Token YOUR_TOKEN
```

**Response (200 OK):**
```json
{
  "status": "liked",
  "likes_count": 48
}
```

### Get My Artworks

Get all artworks created by authenticated user.

```http
GET /api/artworks/my_artworks/
Authorization: Token YOUR_TOKEN
```

**Response:** Same as list artworks, but filtered to user's artworks.

### Update Artwork

```http
PATCH /api/artworks/{artwork_id}/
Authorization: Token YOUR_TOKEN
Content-Type: application/json

{
  "title": "Updated Title",
  "is_public": false
}
```

### Delete Artwork

```http
DELETE /api/artworks/{artwork_id}/
Authorization: Token YOUR_TOKEN
```

**Response (204 No Content)**

---

## Collections

### List Collections

```http
GET /api/collections/
Authorization: Token YOUR_TOKEN (optional)
```

**Query Parameters:**
- `is_public` (boolean): Filter by visibility
- `user` (integer): Filter by user ID
- `search` (string): Search in name and description

**Response (200 OK):**
```json
{
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "user": {
        "id": 1,
        "username": "john_artist"
      },
      "name": "Abstract Collection",
      "description": "My favorite abstract artworks",
      "is_public": true,
      "artworks": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "title": "Abstract Waves",
          "image": "https://...",
          "likes_count": 23
        }
      ],
      "created_at": "2025-10-15T10:00:00Z"
    }
  ]
}
```

### Create Collection

```http
POST /api/collections/
Authorization: Token YOUR_TOKEN
Content-Type: application/json

{
  "name": "Landscapes",
  "description": "Beautiful landscape artworks",
  "is_public": true,
  "artwork_ids": ["550e8400-e29b-41d4-a716-446655440000"]
}
```

**Response (201 Created):**
```json
{
  "id": 2,
  "user": {
    "id": 1,
    "username": "john_artist"
  },
  "name": "Landscapes",
  "description": "Beautiful landscape artworks",
  "is_public": true,
  "artworks": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Mountain Sunset",
      "image": "https://...",
      "likes_count": 12
    }
  ],
  "created_at": "2025-10-22T11:30:00Z"
}
```

### Add Artwork to Collection

```http
POST /api/collections/{collection_id}/add_artwork/
Authorization: Token YOUR_TOKEN
Content-Type: application/json

{
  "artwork_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200 OK):**
```json
{
  "status": "artwork added"
}
```

### Remove Artwork from Collection

```http
POST /api/collections/{collection_id}/remove_artwork/
Authorization: Token YOUR_TOKEN
Content-Type: application/json

{
  "artwork_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200 OK):**
```json
{
  "status": "artwork removed"
}
```

### Update Collection

```http
PATCH /api/collections/{collection_id}/
Authorization: Token YOUR_TOKEN
Content-Type: application/json

{
  "name": "Updated Collection Name",
  "is_public": false
}
```

### Delete Collection

```http
DELETE /api/collections/{collection_id}/
Authorization: Token YOUR_TOKEN
```

**Response (204 No Content)**

---

## Tags

### List Tags

```http
GET /api/tags/
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "cyberpunk",
    "slug": "cyberpunk"
  },
  {
    "id": 2,
    "name": "landscape",
    "slug": "landscape"
  }
]
```

### Create Tag

```http
POST /api/tags/
Authorization: Token YOUR_TOKEN
Content-Type: application/json

{
  "name": "Sci-Fi"
}
```

**Response (201 Created):**
```json
{
  "id": 3,
  "name": "Sci-Fi",
  "slug": "sci-fi"
}
```

---

## User Profiles

### List Public Profiles

```http
GET /api/profiles/
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "user": {
      "id": 1,
      "username": "john_artist"
    },
    "bio": "Digital artist exploring AI",
    "location": "San Francisco, CA",
    "website": "https://john.art",
    "avatar": "/media/avatars/john.jpg",
    "total_artworks": 42,
    "total_likes_received": 1337,
    "followers_count": 89,
    "following_count": 156,
    "is_public_profile": true
  }
]
```

### Get My Profile

```http
GET /api/profiles/me/
Authorization: Token YOUR_TOKEN
```

**Response (200 OK):**
```json
{
  "id": 1,
  "user": {
    "id": 1,
    "username": "john_artist",
    "email": "john@example.com"
  },
  "bio": "Digital artist exploring AI",
  "location": "San Francisco, CA",
  "website": "https://john.art",
  "avatar": "/media/avatars/john.jpg",
  "total_artworks": 42,
  "total_likes_received": 1337,
  "followers_count": 89,
  "following_count": 156,
  "default_ai_provider": "gemini",
  "default_image_size": "1024x1024",
  "is_public_profile": true
}
```

### Update My Profile

```http
PATCH /api/profiles/update_me/
Authorization: Token YOUR_TOKEN
Content-Type: application/json

{
  "bio": "Updated bio text",
  "location": "New York, NY",
  "website": "https://newsite.com",
  "default_ai_provider": "gpt4o",
  "is_public_profile": false
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "bio": "Updated bio text",
  "location": "New York, NY",
  ...
}
```

---

## Activity Logs

### Get My Activity

```http
GET /api/activities/
Authorization: Token YOUR_TOKEN
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "user": {
      "id": 1,
      "username": "john_artist"
    },
    "activity_type": "artwork_created",
    "description": "Created artwork: Mountain Sunset",
    "created_at": "2025-10-22T11:00:00Z"
  },
  {
    "id": 2,
    "activity_type": "artwork_liked",
    "description": "Liked artwork: Cyberpunk City",
    "created_at": "2025-10-22T10:45:00Z"
  }
]
```

**Activity Types:**
- `artwork_created`
- `artwork_liked`
- `collection_created`
- `profile_updated`

---

## Error Handling

### Standard Error Response

```json
{
  "detail": "Error message describing what went wrong"
}
```

### HTTP Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `204 No Content` - Resource deleted successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Authenticated but not authorized
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Common Errors

**Invalid Token:**
```json
{
  "detail": "Invalid token."
}
```

**Missing Required Field:**
```json
{
  "prompt": ["This field is required."]
}
```

**Permission Denied:**
```json
{
  "detail": "You do not have permission to perform this action."
}
```

**Validation Error:**
```json
{
  "ai_provider": ["Invalid AI provider. Choose from: gpt4o, gemini, huggingface"]
}
```

---

## Rate Limiting

**Current Limits:**
- Anonymous: 100 requests/hour
- Authenticated: 1000 requests/hour
- Art Generation: 50 generations/hour per user

**Rate Limit Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1698234567
```

---

## WebSocket Support (Future)

**Coming Soon:** Real-time generation status updates via WebSocket.

**Planned URL:** `ws://localhost:8000/ws/artwork/{artwork_id}/`

**Message Format:**
```json
{
  "type": "status_update",
  "status": "processing",
  "progress": 45,
  "message": "Generating image..."
}
```

---

## Frontend Integration Examples

### React / Next.js Example

```javascript
// API Client
const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = {
  // Get auth token from localStorage
  getToken: () => localStorage.getItem('pentaart_token'),

  // Set auth headers
  headers: () => ({
    'Content-Type': 'application/json',
    'Authorization': `Token ${apiClient.getToken()}`
  }),

  // Login
  login: async (username, password) => {
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
  generateArtwork: async (artworkData) => {
    const response = await fetch(`${API_BASE_URL}/artworks/`, {
      method: 'POST',
      headers: apiClient.headers(),
      body: JSON.stringify(artworkData)
    });
    return response.json();
  },

  // Poll for status
  pollArtworkStatus: async (artworkId, onUpdate) => {
    const interval = setInterval(async () => {
      const response = await fetch(
        `${API_BASE_URL}/artworks/${artworkId}/status/`,
        {headers: apiClient.headers()}
      );
      const data = await response.json();
      onUpdate(data);

      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(interval);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval); // Cleanup function
  },

  // Get artworks
  getArtworks: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(
      `${API_BASE_URL}/artworks/?${params}`,
      {headers: apiClient.headers()}
    );
    return response.json();
  }
};

// Usage in React component
const ArtworkGenerator = () => {
  const [artwork, setArtwork] = useState(null);
  const [status, setStatus] = useState(null);

  const handleGenerate = async () => {
    // Create artwork
    const newArtwork = await apiClient.generateArtwork({
      title: 'My Artwork',
      generation_type: 'ai_prompt',
      ai_provider: 'gemini',
      prompt: 'A beautiful sunset',
      image_size: '1024x1024',
      is_public: true
    });

    setArtwork(newArtwork);

    // Start polling for status
    const cleanup = await apiClient.pollArtworkStatus(
      newArtwork.id,
      (statusData) => {
        setStatus(statusData);
        if (statusData.status === 'completed') {
          console.log('Image ready:', statusData.image_url);
        }
      }
    );

    // Cleanup on unmount
    return cleanup;
  };

  return (
    <div>
      <button onClick={handleGenerate}>Generate</button>
      {status && <p>Status: {status.status}</p>}
      {status?.image_url && <img src={status.image_url} alt="Generated" />}
    </div>
  );
};
```

---

## Best Practices

1. **Always use HTTPS in production**
2. **Store tokens securely** (httpOnly cookies recommended over localStorage)
3. **Handle 401 errors** by redirecting to login
4. **Implement exponential backoff** for status polling
5. **Show loading states** during generation (5-15 seconds typical)
6. **Display error messages** from API responses to users
7. **Implement offline support** where possible
8. **Cache artwork lists** using SWR or React Query

---

**PentaArt API v1.0** - Build Amazing AI Art Experiences
