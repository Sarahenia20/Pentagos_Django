# PentaArt 🎨

**A Next-Generation Generative Art Platform**

PentaArt is a full-stack generative art platform combining AI image generation (Gemini 2.5 Flash Image, GPT-4o) with algorithmic/procedural art creation. Built with Django REST Framework backend + Next.js frontend for modern, interactive art generation experiences.

## ✨ Core Features

- 🤖 **AI Art Generation** - Powered by Google Gemini 2.5 Flash & OpenAI GPT-4o
- 🎲 **Algorithmic Art** - Procedural patterns, fractals, geometric designs
- 🔀 **Hybrid Mode** - Combine AI prompts with algorithmic techniques
- 🖼️ **Smart Galleries** - Organize creations in personal collections
- 🌍 **Discovery Hub** - Explore community art (curated, not social media chaos)
- 📊 **Analytics & Insights** - Track your creative journey and style evolution
- 🧠 **Smart Profiles** - Learn and adapt to your unique art style

---

## 🏗️ Architecture

**Backend:** Django 5.2 + Django REST Framework
**Frontend:** Next.js (separate repo/folder)
**Database:** PostgreSQL (SQLite fallback for dev)
**Queue:** Celery + Redis (async art generation)
**AI Providers:** Gemini 2.5 Flash Image ($0.039/image, FREE tier), GPT-4o ($0.035/image)

---

## 📦 The 5 PentaArt Modules

### **1️⃣ User & Profile Module (Identity)**
Personalized user experience and art style learning
- User authentication & registration (JWT tokens)
- Profile management (bio, avatar, location)
- Art style preferences (learns from your generations)
- Activity history & personalization

**Tech:** Django User model + UserProfile, REST API authentication

---

### **2️⃣ Art Generation Engine (Creation)**
Core generative capabilities - the heart of PentaArt
- **AI Generation:** Text-to-image via Gemini 2.5 Flash or GPT-4o
- **Algorithmic Art:** Fractals, flow fields, geometric patterns, L-systems
- **Hybrid Mode:** Combine AI prompts with procedural overlays
- **Queue System:** Celery tasks for async generation with status tracking

**Tech:** Celery workers, OpenAI SDK, Google Generative AI SDK, Pillow + Cairo

---

### **3️⃣ Gallery & Collection Module (Organization)**
Manage and organize your artistic creations
- Personal gallery (private/public artworks)
- Custom collections (theme-based grouping)
- Smart tagging system
- Advanced search & filters (style, type, AI provider, date)

**Tech:** Artwork, Collection, Tag models with DRF viewsets

---

### **4️⃣ Community & Discovery Module (Social)**
Curated art sharing without social media noise
- Public gallery (explore featured art)
- Trending & popular artworks
- Like & reaction system
- Discover artists with similar styles
- **NOT** a full social network - focus on art, not engagement metrics

**Tech:** Public artwork filtering, recommendation algorithms

---

### **5️⃣ Analytics & Insights Module (Intelligence)**
Track your creative journey and understand your art evolution
- **Generation Statistics:** Total artworks, AI vs algorithmic breakdown
- **Style Analysis:** Most used prompts, preferred AI providers, favorite algorithms
- **Timeline View:** Visual timeline of your art evolution
- **Export Manager:** Batch download, PDF portfolios, high-res exports
- **Performance Metrics:** Generation times, success rates, popular pieces

**Tech:** Aggregation queries, data visualization, export utilities

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 17+ (or use SQLite for testing)
- Redis (for Celery)
- Node.js 18+ (for Next.js frontend, later)

### Backend Setup

```powershell
# 1. Clone and navigate
cd django-platform

# 2. Create virtual environment
python -m venv venv
& .\venv\Scripts\Activate.ps1

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env:
#   - Add PostgreSQL credentials (or set USE_POSTGRESQL=False for SQLite)
#   - Add OPENAI_API_KEY
#   - Add GEMINI_API_KEY

# 5. Run migrations
python manage.py makemigrations
python manage.py migrate

# 6. Create superuser
python manage.py createsuperuser

# 7. Start development server
python manage.py runserver
```

Visit:
- **API Root:** http://127.0.0.1:8000/api/
- **Admin Panel:** http://127.0.0.1:8000/admin/
- **API Docs:** http://127.0.0.1:8000/api/ (DRF browsable API)

### Start Celery Worker (for art generation)

```powershell
# In a separate terminal
celery -A platform_core worker --loglevel=info
```

---

## 📁 Project Structure

```
pentaart/
├── backend/                      # Django REST API
│   ├── platform_core/            # Main settings & URLs
│   ├── accounts/                 # Module 1: User & Profile
│   │   ├── models.py             # UserProfile, ActivityLog
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   ├── media_processing/         # Modules 2, 3: Generation, Gallery
│   │   ├── models.py             # Artwork, Collection, Tag
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── tasks.py              # Celery tasks for generation
│   │   ├── ai_providers/         # AI integration
│   │   │   ├── gemini.py
│   │   │   └── gpt4o.py
│   │   └── algorithms/           # Procedural art generators
│   │       ├── fractals.py
│   │       ├── geometric.py
│   │       └── flow_fields.py
│   ├── api/                      # Module 4: Community endpoints
│   ├── dashboard/                # Module 5: Analytics & Insights
│   ├── media/                    # Generated artworks storage
│   ├── static/                   # Static files
│   └── manage.py
│
└── frontend/                     # Next.js app (to be created)
    ├── app/
    ├── components/
    ├── lib/
    └── public/
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register/         Register new user
POST   /api/auth/login/            Login (returns JWT token)
POST   /api/auth/logout/           Logout
GET    /api/auth/me/               Current user details
```

### Artworks (Module 2 & 3)
```
GET    /api/artworks/              List public artworks
POST   /api/artworks/              Create new artwork (starts generation)
GET    /api/artworks/{id}/         Artwork details
GET    /api/artworks/{id}/status/  Check generation status
POST   /api/artworks/{id}/like/    Like artwork
GET    /api/artworks/my_artworks/  User's own artworks
```

### Collections (Module 3)
```
GET    /api/collections/           List collections
POST   /api/collections/           Create collection
POST   /api/collections/{id}/add_artwork/     Add to collection
POST   /api/collections/{id}/remove_artwork/  Remove from collection
```

### Tags (Module 3)
```
GET    /api/tags/                  List all tags
POST   /api/tags/                  Create tag
```

### Profiles (Module 1)
```
GET    /api/profiles/              List public profiles
GET    /api/profiles/me/           Current user profile
PATCH  /api/profiles/update_me/    Update profile
```

### Analytics (Module 5)
```
GET    /api/analytics/stats/       User's generation statistics
GET    /api/analytics/timeline/    Art creation timeline
GET    /api/analytics/styles/      Style breakdown and analysis
```

---

## 🎨 Art Generation Types

### 1. AI Generation (Gemini or GPT-4o)
```json
POST /api/artworks/
{
  "title": "Cyberpunk Cityscape",
  "generation_type": "ai_prompt",
  "ai_provider": "gemini",
  "prompt": "A neon-lit cyberpunk city at night with flying cars",
  "image_size": "1024x1024",
  "is_public": true
}
```

### 2. Algorithmic Generation
```json
POST /api/artworks/
{
  "title": "Mandelbrot Fractal",
  "generation_type": "algorithmic",
  "algorithm_name": "mandelbrot",
  "algorithm_params": {
    "iterations": 100,
    "zoom": 2.5,
    "color_scheme": "fire"
  },
  "image_size": "1024x1024"
}
```

### 3. Hybrid Generation (AI + Algorithm)
```json
POST /api/artworks/
{
  "title": "Fractal Dreams",
  "generation_type": "hybrid",
  "ai_provider": "gpt4o",
  "prompt": "Abstract dreamscape",
  "algorithm_name": "fractal_overlay",
  "algorithm_params": {
    "opacity": 0.6,
    "blend_mode": "multiply"
  }
}
```

---

## 🧪 Technology Stack

**Backend:**
- Django 5.2.6
- Django REST Framework 3.16.1
- PostgreSQL / SQLite
- Celery 5.3.4 + Redis 5.0.1
- OpenAI Python SDK 1.12.0
- Google Generative AI 0.3.2
- Pillow 11.3.0 (image processing)
- Cairo (vector graphics)

**Frontend (Next.js - coming soon):**
- Next.js 14
- React 18
- TailwindCSS
- Axios (API calls)
- Zustand (state management)

**Infrastructure:**
- Gunicorn (production server)
- Nginx (reverse proxy)
- Redis (queue + cache)
- PostgreSQL (database)

---

## 🔑 Environment Variables

```env
# Django
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
USE_POSTGRESQL=True
DB_NAME=pentaart_db
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432

# AI Providers
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=your-gemini-key

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# CORS (for Next.js)
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

---

## 🛠️ Development

**Run tests:**
```bash
python manage.py test
```

**Create new migrations:**
```bash
python manage.py makemigrations
```

**Check API with curl:**
```bash
# Register user
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"artist1","email":"artist@pentaart.com","password":"securepass123","password_confirm":"securepass123"}'

# Generate art
curl -X POST http://localhost:8000/api/artworks/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Art","generation_type":"ai_prompt","ai_provider":"gemini","prompt":"Beautiful sunset over mountains"}'
```

---

## 🚢 Production Deployment

1. Set `DEBUG=False` in `.env`
2. Use PostgreSQL (not SQLite)
3. Configure Redis for Celery
4. Set up static file serving (`python manage.py collectstatic`)
5. Use Gunicorn: `gunicorn platform_core.wsgi:application`
6. Configure Nginx reverse proxy
7. Set up SSL certificates (Let's Encrypt)
8. Deploy Next.js frontend separately (Vercel recommended)

---

## 🎯 Roadmap

- [x] Backend API structure
- [x] Database models
- [x] Authentication system
- [ ] AI provider integration (Gemini + GPT-4o)
- [ ] Algorithmic art generators
- [ ] Celery task queue
- [ ] Analytics dashboard
- [ ] Next.js frontend
- [ ] Real-time generation status (WebSockets)
- [ ] Recommendation engine

---

## 📄 License

MIT License - feel free to use for personal or commercial projects.

---

## 🙏 Credits & Resources

### AI Models & APIs
- **OpenAI GPT-4o / DALL-E 3:** [OpenAI Platform](https://platform.openai.com/)
- **Google Gemini:** [Google AI](https://ai.google.dev/)
- **Hugging Face Stable Diffusion:** [Hugging Face](https://huggingface.co/stabilityai)
  - [Stable Diffusion XL](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0)
  - [FLUX.1-schnell](https://huggingface.co/black-forest-labs/FLUX.1-schnell)
  - [Playground v2.5](https://huggingface.co/playgroundai/playground-v2.5-1024px-aesthetic)

### Algorithmic Art References
- [erdavids/Generative-Art](https://github.com/erdavids/Generative-Art) - Processing & Python procedural art
- [Generative Art Resources](https://github.com/kosmos/awesome-generative-art)
- [Creative Coding](https://github.com/terkelg/awesome-creative-coding)

### AI Generation Examples & Inspiration
- [awesome-nano-banana](https://github.com/JimmyLv/awesome-nano-banana) - Gemini 2.5 Flash examples
- [awesome-gpt4o-images](https://github.com/jamez-bondos/awesome-gpt4o-images) - GPT-4o generation showcase
- [Stable Diffusion Prompts](https://github.com/Dalabad/stable-diffusion-prompt-templates)

### Frontend Design Inspiration (for Next.js)
- [Midjourney](https://www.midjourney.com/) - UI/UX reference
- [Lexica Art](https://lexica.art/) - Gallery layout inspiration
- [PlaygroundAI](https://playgroundai.com/) - Generation interface
- [Dribbble - AI Art](https://dribbble.com/tags/ai-art) - Design patterns

---

**Built with ❤️ for artists, by artists**
