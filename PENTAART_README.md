# 🎨 PentaArt - Generative Art Platform

**A modern full-stack platform for AI and algorithmic art generation**

Built with Django REST Framework + Next.js 14 + Celery + Redis

---

## 🌟 Features

### **Dual Art Generation**
- **AI-Powered Generation**: DALL-E 3 (via GPT-4o) integration for prompt-based art
- **Algorithmic Patterns**: 10+ mathematical art generators (fractals, geometric, generative)
  
### **Frontend (Next.js 14)**
- 🎨 Studio page for art generation
- 🖼️ Gallery browsing (public artworks)
- 🌓 Dark/Light theme support
- 🔔 Toast notifications (sonner library)
- 💾 localStorage persistence for artworks
- ⚡ Hot reload with instant preview

### **Backend (Django + DRF)**
- 🔐 User authentication & profiles
- 📦 RESTful API with proper serialization
- ⚙️ Async task processing with Celery
- 🗃️ PostgreSQL-ready (currently SQLite for dev)
- ☁️ Cloudinary integration for gallery storage
- 📊 Activity logging & statistics

---

## 🚀 Quick Start

### **Prerequisites**
- Python 3.10+
- Node.js 18+
- Redis server
- OpenAI API key (for AI generation)

### **Backend Setup**

```bash
# 1. Clone and navigate
cd django-platform

# 2. Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Unix/Mac

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set environment variables
# Create .env file with:
OPENAI_API_KEY=your_openai_api_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# 5. Run migrations
python manage.py makemigrations
python manage.py migrate

# 6. Start Django server
python manage.py runserver  # Port 8000

# 7. Start Celery worker (NEW TERMINAL)
celery -A platform_core worker -l info -P solo  # Windows
# celery -A platform_core worker -l info  # Unix/Mac
```

### **Frontend Setup**

```bash
# 1. Navigate to frontend
cd FrontOffice

# 2. Install dependencies
npm install

# 3. Start Next.js dev server
npm run dev  # Port 3000 (or 3001/3002 if occupied)
```

### **Access the Platform**
- Frontend: http://localhost:3000/studio
- Backend API: http://localhost:8000/api/
- Admin Panel: http://localhost:8000/admin/

---

## 📚 API Documentation

### **Base URL**: `http://localhost:8000/api/`

### **Artwork Endpoints**

#### **Create AI Artwork**
```http
POST /api/artworks/
Content-Type: application/json

{
  "title": "Sunset Mountains",
  "generation_type": "ai_prompt",
  "prompt": "A serene mountain landscape at sunset with vibrant colors",
  "ai_provider": "gpt4o",
  "image_size": "1024x1024",
  "is_public": true
}
```

#### **Create Algorithmic Artwork**
```http
POST /api/artworks/
Content-Type: application/json

{
  "title": "Sierpinski Triangle",
  "generation_type": "algorithmic",
  "algorithm_name": "sierpinski_triangle",
  "algorithm_params": {
    "depth": 7
  },
  "image_size": "1024x1024",
  "is_public": true
}
```

#### **Check Artwork Status**
```http
GET /api/artworks/{id}/status/
```

Response:
```json
{
  "id": "uuid",
  "status": "completed",
  "image_url": "http://localhost:8000/media/artworks/2025/10/23/artwork.jpg",
  "generation_duration": 0.012
}
```

#### **Save to Cloudinary**
```http
POST /api/artworks/{id}/save_to_cloudinary/
```

#### **Discard Artwork**
```http
DELETE /api/artworks/{id}/
```

### **Algorithmic Patterns**

#### **List Available Patterns**
```http
GET /api/algorithmic-patterns/
```

Response:
```json
{
  "patterns": {
    "concentric_circles": {
      "name": "Concentric Circles",
      "description": "Nested circles with gradient colors",
      "category": "geometric",
      "params": {
        "num_circles": {"type": "int", "min": 5, "max": 50, "default": 20},
        "color_scheme": {"type": "choice", "options": ["rainbow", "monochrome", "blue"]}
      }
    }
  },
  "patterns_by_category": {
    "geometric": [...],
    "fractal": [...],
    "generative": [...],
    "spirograph": [...]
  },
  "total_patterns": 10
}
```

---

## 🎨 Available Algorithmic Patterns

### **Geometric** (3 patterns)
1. **Concentric Circles** - Nested circles with gradient colors
2. **Spiral Circles** - Logarithmic spiral of colored circles
3. **Hexagonal Grid** - Tessellation of colored hexagons

### **Fractals** (3 patterns)
4. **Sierpinski Triangle** - Classic chaos game fractal
5. **Mandelbrot Set** - Famous fractal visualization
6. **Recursive Tree** - Branching tree fractal

### **Generative** (3 patterns)
7. **Random Walk** - Multiple particles wandering randomly
8. **Voronoi Diagram** - Space partitioning pattern
9. **Wave Interference** - Multiple wave sources creating patterns

### **Spirograph** (1 pattern)
10. **Spirograph** - Mathematical drawing toy simulation

---

## 🏗️ Project Structure

```
django-platform/
├── platform_core/          # Django settings, URLs, Celery config
├── accounts/               # User auth, profiles, activity logging
├── media_processing/       # Core artwork generation logic
│   ├── models.py          # Artwork, Tag, Collection models
│   ├── views.py           # DRF ViewSets
│   ├── serializers.py     # API serializers
│   ├── tasks.py           # Celery tasks for generation
│   ├── ai_providers/      # AI generation integrations
│   │   ├── gpt4o.py      # DALL-E 3 integration
│   │   ├── gemini.py     # Gemini (planned)
│   │   └── huggingface.py # Stable Diffusion (planned)
│   └── utils/             # Helper modules
│       ├── algorithmic_art.py  # Pattern generators
│       └── cloudinary_helper.py # Cloud storage
├── FrontOffice/            # Next.js 14 frontend
│   ├── app/
│   │   ├── studio/        # Art generation interface
│   │   ├── gallery/       # Browse public artworks
│   │   ├── community/     # Social features
│   │   └── profile/       # User profile
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # shadcn/ui components
│   │   └── toaster.tsx   # Toast notification wrapper
│   └── lib/
│       ├── api.ts        # API client with polling
│       └── utils.ts      # Helper functions
├── media/                 # User-generated artwork storage
├── static/                # Django static files
└── requirements.txt       # Python dependencies
```

---

## 🔧 Technology Stack

### **Backend**
- **Django 5.2** - Web framework
- **Django REST Framework** - API framework
- **Celery** - Async task queue
- **Redis** - Task broker & caching
- **Pillow** - Image processing
- **OpenAI SDK** - DALL-E 3 integration
- **Cloudinary** - Cloud image storage

### **Frontend**
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **shadcn/ui** - Component library
- **Sonner** - Toast notifications
- **Lucide React** - Icons

---

## 📝 Key Implementation Notes

### **1. Authentication Status**
⚠️ **IMPORTANT**: Currently set to `AllowAny` for testing
- Anonymous users can generate artworks
- Remove this before production deployment
- File: `media_processing/views.py` line 26

```python
# CURRENT (Testing):
permission_classes = [AllowAny]

# PRODUCTION (Recommended):
permission_classes = [IsAuthenticatedOrReadOnly]
```

### **2. File Save Issue Workaround**
During development, VS Code sometimes held file changes in memory without persisting to disk. If you encounter this:
- Use `Out-File` PowerShell command for direct writes
- Restart VS Code if hot reload stops working
- Check file content with `Get-Content` to verify saves

### **3. Artwork Lifecycle**
1. **Create** → Status: `queued`
2. **Celery picks up** → Status: `processing`
3. **Generation completes** → Status: `completed`
4. **If error occurs** → Status: `failed`

Generation times:
- AI (DALL-E 3): ~5-15 seconds
- Algorithmic: ~0.01-0.05 seconds (instant!)

### **4. LocalStorage Persistence**
Frontend stores pending artwork in `localStorage` as:
```javascript
{
  imageUrl: "http://localhost:8000/media/artworks/...",
  id: "artwork-uuid"
}
```
This allows recovery after page refresh.

---

## 🧪 Testing

### **Backend Tests**
```bash
python manage.py test
```

### **Frontend Tests**
```bash
cd FrontOffice
npm test
```

### **Manual Testing Workflow**
1. Start all services (Django, Celery, Next.js)
2. Visit http://localhost:3000/studio
3. Generate AI artwork with prompt
4. Generate algorithmic artwork (instant)
5. Check toast notifications appear
6. Click "Download" to save locally
7. Click "Save to Gallery" for Cloudinary
8. Click "Discard" to delete
9. Refresh page - artwork should restore from localStorage

---

## 🚢 Production Deployment

### **Environment Variables**
```bash
# Django
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=your-domain.com
DATABASE_URL=postgresql://...

# AI Providers
OPENAI_API_KEY=sk-...

# Storage
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Celery
CELERY_BROKER_URL=redis://...
CELERY_RESULT_BACKEND=redis://...
```

### **Pre-Deployment Checklist**
- [ ] Set `DEBUG=False`
- [ ] Configure PostgreSQL database
- [ ] Set up Redis for production
- [ ] Configure static file serving (S3/CloudFront)
- [ ] Enable authentication (`IsAuthenticatedOrReadOnly`)
- [ ] Add rate limiting
- [ ] Set up monitoring (Sentry)
- [ ] Configure CORS properly
- [ ] Add HTTPS/SSL certificates
- [ ] Set up backup strategy

---

## 🎯 Future Enhancements

### **Immediate (Next Sprint)**
- [ ] Gallery page UI implementation
- [ ] Community features (likes, comments)
- [ ] User profile with artwork history
- [ ] Artwork sharing & social features

### **Short Term**
- [ ] Additional AI providers (Gemini, Stable Diffusion)
- [ ] More algorithmic patterns (L-systems, cellular automata)
- [ ] Hybrid generation (AI + algorithmic blending)
- [ ] Batch generation
- [ ] Style transfer

### **Long Term**
- [ ] Video generation support
- [ ] 3D model generation
- [ ] Collaborative artworks
- [ ] NFT minting integration
- [ ] Marketplace features

---

## 🤝 Team Responsibilities

### **Backend Developer** ✅ (Current)
- ✅ Core artwork generation pipeline
- ✅ AI provider integration (DALL-E 3)
- ✅ Algorithmic art generators (10 patterns)
- ✅ Celery task processing
- ✅ API endpoints & serializers
- ⏳ Gallery backend logic
- ⏳ Social features API

### **Frontend Developer** (Next)
- ✅ Studio page with generation UI
- ✅ Toast notifications & state management
- ⏳ Gallery browsing interface
- ⏳ Algorithmic pattern selector UI
- ⏳ Community features UI
- ⏳ User profile page

### **User Management Module Owner** ⚠️
**ACTION REQUIRED**: Review authentication implementation
- Current: `AllowAny` permission for testing
- Decision needed: Keep anonymous generation or require auth?
- Files to review:
  - `media_processing/views.py` (line 26)
  - `accounts/views.py` (user profile logic)

---

## 📖 API Examples

### **PowerShell**
```powershell
# List patterns
Invoke-RestMethod -Uri http://localhost:8000/api/algorithmic-patterns/

# Create artwork
$body = @{
    title = "My Artwork"
    generation_type = "algorithmic"
    algorithm_name = "mandelbrot_set"
    algorithm_params = @{ max_iter = 150 }
    image_size = "1024x1024"
    is_public = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:8000/api/artworks/ `
    -Method POST -Body $body -ContentType "application/json"
```

### **cURL**
```bash
# List patterns
curl http://localhost:8000/api/algorithmic-patterns/

# Create artwork
curl -X POST http://localhost:8000/api/artworks/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Artwork",
    "generation_type": "algorithmic",
    "algorithm_name": "voronoi_diagram",
    "algorithm_params": {"num_points": 30},
    "image_size": "1024x1024",
    "is_public": true
  }'
```

---

## 🐛 Troubleshooting

### **Celery not processing tasks**
```bash
# Check if Redis is running
redis-cli ping  # Should return "PONG"

# Restart Celery worker
celery -A platform_core worker -l info -P solo
```

### **Frontend not showing updates**
```bash
# Clear Next.js cache
cd FrontOffice
rm -rf .next
npm run dev
```

### **Image not accessible**
- Check `MEDIA_ROOT` and `MEDIA_URL` in settings
- Verify file permissions
- Check Django static file serving is enabled in dev

### **CORS errors**
- Install `django-cors-headers`
- Add to `INSTALLED_APPS`
- Configure `CORS_ALLOWED_ORIGINS`

---

## 📄 License

MIT License - Feel free to use for personal or commercial projects

---

## 👨‍💻 Contributors

- Backend & AI Integration: [Current Developer]
- Frontend Development: [Pending]
- User Management: [Pending - See Auth Note Above ⚠️]

---

## 📞 Support

For issues or questions:
1. Check this README first
2. Review API documentation
3. Check terminal logs (Django, Celery, Next.js)
4. Open issue on GitHub (if applicable)

---

**Last Updated**: October 23, 2025  
**Version**: 1.0.0  
**Status**: ✅ Core features complete, Frontend Gallery pending
