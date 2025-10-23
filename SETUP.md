# PentaArt Platform - Setup & Deployment Guide

Complete guide for setting up and running the PentaArt AI Art Generation Platform.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Redis & Celery Setup](#redis--celery-setup)
6. [Cloudinary Setup (Optional)](#cloudinary-setup-optional)
7. [AI Provider API Keys](#ai-provider-api-keys)
8. [Running the Application](#running-the-application)
9. [Testing Art Generation](#testing-art-generation)
10. [Admin Back Office](#admin-back-office)
11. [Frontend Integration](#frontend-integration)
12. [Production Deployment](#production-deployment)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Python 3.10+** (Tested on Python 3.11/3.12/3.13)
- **Redis 6.0+** (For Celery task queue)
- **PostgreSQL 14+** (Recommended) OR SQLite (Development only)
- **Node.js 18+** (For Next.js frontend)
- **Git**

### System Requirements

- **Minimum:** 4GB RAM, 2 CPU cores, 10GB storage
- **Recommended:** 8GB RAM, 4 CPU cores, 50GB storage
- **For GPU acceleration (Optional):** CUDA-capable GPU with 8GB+ VRAM

---

## Quick Start

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd django-platform

# 2. Create virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy environment file
cp .env.example .env

# Edit .env with your configuration
# At minimum, set: SECRET_KEY, OPENAI_API_KEY or GEMINI_API_KEY

# 5. Run migrations
python manage.py makemigrations
python manage.py migrate

# 6. Create superuser
python manage.py createsuperuser

# 7. Start Redis (in separate terminal)
redis-server

# 8. Start Celery worker (in separate terminal)
celery -A platform_core worker -l info -P solo

# 9. Start Django development server
python manage.py runserver

# 10. Access the application
# Web: http://localhost:8000/api/
# Admin: http://localhost:8000/admin/
```

---

## Environment Configuration

### .env File Setup

Copy `.env.example` to `.env` and configure:

```bash
# Django Configuration
SECRET_KEY=your-django-secret-key-here-generate-with-django
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (Choose one)
# Option 1: PostgreSQL (Recommended)
USE_POSTGRESQL=True
DB_NAME=pentaart_db
DB_USER=postgres
DB_PASSWORD=your-strong-password
DB_HOST=localhost
DB_PORT=5432

# Option 2: SQLite (Development only - set USE_POSTGRESQL=False)
USE_POSTGRESQL=False

# Redis & Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# AI Provider API Keys (Get from providers)
OPENAI_API_KEY=sk-proj-...  # From https://platform.openai.com/api-keys
GEMINI_API_KEY=AIza...      # From https://makersuite.google.com/app/apikey

# Cloudinary (Optional - for cloud storage)
USE_CLOUDINARY=False  # Set to True to use Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# CORS (Frontend URL)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Generate SECRET_KEY

```python
# Run in Python shell
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

---

## Database Setup

### Option 1: PostgreSQL (Recommended)

**Install PostgreSQL:**

```bash
# Windows: Download installer from postgresql.org
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql
```

**Create Database:**

```bash
# Connect to PostgreSQL
psql -U postgres

# In psql shell:
CREATE DATABASE pentaart_db;
CREATE USER pentaart_user WITH PASSWORD 'your-password';
ALTER ROLE pentaart_user SET client_encoding TO 'utf8';
ALTER ROLE pentaart_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE pentaart_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE pentaart_db TO pentaart_user;

# Exit psql
\q
```

**Update .env:**

```
USE_POSTGRESQL=True
DB_NAME=pentaart_db
DB_USER=pentaart_user
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432
```

### Option 2: SQLite (Development Only)

```
USE_POSTGRESQL=False
```

SQLite database (`db.sqlite3`) will be created automatically.

### Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

---

## Redis & Celery Setup

### Install Redis

**Windows:**
```bash
# Download from: https://github.com/microsoftarchive/redis/releases
# OR use WSL2 and install Linux version
```

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Verify Redis:**
```bash
redis-cli ping
# Should return: PONG
```

### Start Celery Worker

**Development (Single Process):**

```bash
# Windows
celery -A platform_core worker -l info -P solo

# Linux/Mac
celery -A platform_core worker -l info
```

**Production (Multiple Workers):**

```bash
celery -A platform_core worker -l info --concurrency=4
```

**Optional: Start Celery Beat (Scheduled Tasks):**

```bash
celery -A platform_core beat -l info
```

### Monitor Celery

**Using Flower (Web-based Monitoring):**

```bash
pip install flower
celery -A platform_core flower
# Access at: http://localhost:5555
```

---

## Cloudinary Setup (Optional)

Cloudinary provides free cloud storage for images with CDN delivery.

### 1. Create Free Account

- Visit: https://cloudinary.com/users/register_free
- Free tier includes: 25 GB storage, 25 GB/month bandwidth

### 2. Get API Credentials

- Dashboard → Account Details → API Keys
- Copy: Cloud Name, API Key, API Secret

### 3. Configure .env

```bash
USE_CLOUDINARY=True
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abc123def456ghi789
```

### 4. Install Dependencies

```bash
pip install cloudinary django-cloudinary-storage
```

**Note:** If `USE_CLOUDINARY=False`, images will be stored locally in `media/` directory.

---

## AI Provider API Keys

### 1. OpenAI (GPT-4o / DALL-E 3)

**Cost:** ~$0.04 per image (1024x1024 standard quality)

**Get API Key:**
1. Visit: https://platform.openai.com/signup
2. Add payment method (pay-as-you-go)
3. Create API key: https://platform.openai.com/api-keys
4. Copy key starting with `sk-proj-...`

**Add to .env:**
```
OPENAI_API_KEY=sk-proj-your-key-here
```

**Test:**
```bash
python test_gpt4o.py
```

### 2. Google Gemini (Gemini 2.5 Flash)

**Cost:** FREE tier available (60 images/minute)

**Get API Key:**
1. Visit: https://makersuite.google.com/app/apikey
2. Create API key
3. Copy key starting with `AIza...`

**Add to .env:**
```
GEMINI_API_KEY=AIzaYourKeyHere
```

**Test:**
```bash
python test_gemini.py
```

### 3. Hugging Face (Stable Diffusion)

**Cost:** FREE (using Inference API or local models)

**Get API Token (Optional):**
1. Visit: https://huggingface.co/settings/tokens
2. Create token with "Read" access
3. No configuration needed for local generation

**Supported Models:**
- SDXL (stabilityai/stable-diffusion-xl-base-1.0)
- SD 1.5 (runwayml/stable-diffusion-v1-5)
- FLUX (black-forest-labs/FLUX.1-schnell)

---

## Running the Application

### Development Mode

**Terminal 1 - Redis:**
```bash
redis-server
```

**Terminal 2 - Celery Worker:**
```bash
celery -A platform_core worker -l info -P solo
```

**Terminal 3 - Django Server:**
```bash
python manage.py runserver
```

**Access:**
- API Root: http://localhost:8000/api/
- Admin Panel: http://localhost:8000/admin/
- Browsable API: http://localhost:8000/api/artworks/

---

## Testing Art Generation

### 1. Create Admin User

```bash
python manage.py createsuperuser
# Username: admin
# Email: admin@pentaart.com
# Password: (your secure password)
```

### 2. Get Authentication Token

**Option A: Django Admin**
1. Go to http://localhost:8000/admin/
2. Login with superuser credentials
3. Navigate to: Authentication and Authorization → Tokens
4. Create token for your user

**Option B: API Endpoint**

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-password"}'

# Response: {"token": "abc123def456..."}
```

### 3. Generate Artwork via API

**Using cURL:**

```bash
# AI Prompt Generation (Gemini)
curl -X POST http://localhost:8000/api/artworks/ \
  -H "Authorization: Token YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sunset Mountains",
    "generation_type": "ai_prompt",
    "ai_provider": "gemini",
    "prompt": "A beautiful sunset over mountains with vibrant colors",
    "image_size": "1024x1024",
    "is_public": true
  }'
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Sunset Mountains",
  "status": "queued",
  "celery_task_id": "abc-123-def-456",
  "created_at": "2025-10-22T10:30:00Z"
}
```

### 4. Check Generation Status

```bash
curl http://localhost:8000/api/artworks/{artwork_id}/status/ \
  -H "Authorization: Token YOUR_TOKEN_HERE"
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "generation_started_at": "2025-10-22T10:30:05Z",
  "generation_completed_at": "2025-10-22T10:30:12Z",
  "generation_duration": "7.2 seconds",
  "image_url": "/media/artworks/2025/10/22/550e8400-e29b-41d4-a716-446655440000.jpg"
}
```

### 5. View Generated Image

Open in browser:
```
http://localhost:8000/media/artworks/2025/10/22/550e8400-e29b-41d4-a716-446655440000.jpg
```

---

## Admin Back Office

### Access Admin Panel

**URL:** http://localhost:8000/admin/

**Login:** Use superuser credentials

### Features

**User Management:**
- View/edit users and profiles
- Inline profile editor
- Track user statistics (artworks, likes, followers)

**Artwork Management:**
- Browse all generated artworks
- Filter by: Status, Generation Type, AI Provider, Date
- View generation details and errors
- Preview images
- Monitor Celery task IDs

**Collections:**
- Create/manage user collections
- Drag-and-drop artwork management
- Privacy controls

**Activity Logs:**
- Complete audit trail
- Filter by activity type and date
- Calendar date hierarchy

**Tags:**
- Manage artwork tags and categories
- Auto-generate slugs

---

## Frontend Integration

### API Endpoints for Frontend

**Authentication:**
```
POST /api/auth/register/          - Register new user
POST /api/auth/login/             - Login and get token
POST /api/auth/logout/            - Logout (delete token)
GET  /api/auth/me/                - Get current user details
```

**Artworks:**
```
GET    /api/artworks/             - List public + user's artworks
POST   /api/artworks/             - Create new artwork (triggers generation)
GET    /api/artworks/{id}/        - Artwork details
GET    /api/artworks/{id}/status/ - Generation status (for polling)
POST   /api/artworks/{id}/like/   - Like artwork
GET    /api/artworks/my_artworks/ - Current user's artworks
```

**Collections:**
```
GET    /api/collections/                      - List collections
POST   /api/collections/                      - Create collection
GET    /api/collections/{id}/                 - Collection details
PATCH  /api/collections/{id}/                 - Update collection
DELETE /api/collections/{id}/                 - Delete collection
POST   /api/collections/{id}/add_artwork/    - Add artwork
POST   /api/collections/{id}/remove_artwork/ - Remove artwork
```

**Tags:**
```
GET    /api/tags/                 - List all tags
POST   /api/tags/                 - Create tag
```

**Profiles:**
```
GET    /api/profiles/             - List public profiles
GET    /api/profiles/me/          - Current user profile
PATCH  /api/profiles/update_me/   - Update profile
```

**Activity:**
```
GET    /api/activities/           - User's activity log
```

### Frontend Polling Example

```javascript
// React example - Poll for generation status
const pollStatus = async (artworkId, token) => {
  const interval = setInterval(async () => {
    const response = await fetch(
      `http://localhost:8000/api/artworks/${artworkId}/status/`,
      {
        headers: { 'Authorization': `Token ${token}` }
      }
    );
    const data = await response.json();

    if (data.status === 'completed') {
      clearInterval(interval);
      console.log('Image ready:', data.image_url);
      // Display image
    } else if (data.status === 'failed') {
      clearInterval(interval);
      console.error('Generation failed:', data.error_message);
    }
  }, 2000); // Poll every 2 seconds
};
```

### CORS Configuration

Frontend must be added to `CORS_ALLOWED_ORIGINS` in `.env`:

```
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

---

## Production Deployment

### 1. Environment Configuration

```bash
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
SECRET_KEY=your-very-secure-secret-key
USE_POSTGRESQL=True
USE_CLOUDINARY=True
```

### 2. Database Configuration

Use PostgreSQL in production (never SQLite).

### 3. Static Files

```bash
python manage.py collectstatic --noinput
```

### 4. Gunicorn (WSGI Server)

```bash
pip install gunicorn
gunicorn platform_core.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

### 5. Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /static/ {
        alias /path/to/django-platform/staticfiles/;
    }

    location /media/ {
        alias /path/to/django-platform/media/;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 6. Celery as System Service

**Create `/etc/systemd/system/celery.service`:**

```ini
[Unit]
Description=Celery Worker for PentaArt
After=network.target redis.service

[Service]
Type=forking
User=www-data
Group=www-data
WorkingDirectory=/path/to/django-platform
ExecStart=/path/to/venv/bin/celery -A platform_core worker --detach --loglevel=info
Restart=always

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl enable celery
sudo systemctl start celery
sudo systemctl status celery
```

---

## Troubleshooting

### Celery Worker Not Starting

**Error:** `ModuleNotFoundError: No module named 'platform_core.celery'`

**Solution:**
```bash
# Make sure you're in the project root directory
cd django-platform
celery -A platform_core worker -l info -P solo
```

### Redis Connection Error

**Error:** `Error 10061: No connection could be made`

**Solution:**
```bash
# Start Redis server
redis-server

# Verify Redis is running
redis-cli ping
```

### AI Provider Errors

**OpenAI Error:** `Invalid API key`
- Check `.env` has correct `OPENAI_API_KEY`
- Verify billing is set up: https://platform.openai.com/settings/organization/billing

**Gemini Error:** `API key not found`
- Check `.env` has correct `GEMINI_API_KEY`
- Get key from: https://makersuite.google.com/app/apikey

### Image Not Saving

**Error:** `FileNotFoundError` or `Permission denied`

**Solution:**
```bash
# Create media directory
mkdir -p media/artworks

# Set permissions (Linux/Mac)
chmod -R 755 media/
```

### Database Migration Errors

**Error:** `No changes detected`

**Solution:**
```bash
# Delete migration files (except __init__.py)
# Then regenerate
python manage.py makemigrations
python manage.py migrate
```

### Import Errors in Tasks

**Error:** `Cannot import name 'generate_artwork'`

**Solution:**
- Make sure `media_processing/tasks.py` exists
- Restart Celery worker after code changes

---

## Useful Commands

```bash
# Create superuser
python manage.py createsuperuser

# Shell with Django context
python manage.py shell

# Check Celery tasks
celery -A platform_core inspect active

# Purge all Celery tasks
celery -A platform_core purge

# View migrations
python manage.py showmigrations

# Create custom migration
python manage.py makemigrations --empty media_processing

# Test API endpoint
python manage.py test

# Database shell
python manage.py dbshell
```

---

## Next Steps

1. ✅ Backend is ready for art generation
2. 🚀 Deploy to production server
3. 🎨 Build Next.js frontend (see [FRONTEND_DESIGN.md](FRONTEND_DESIGN.md))
4. 📊 Implement analytics dashboard
5. 🎯 Add WebSocket support for real-time updates
6. 🔄 Implement algorithmic art generators

---

## Support & Documentation

- **Django Docs:** https://docs.djangoproject.com/
- **DRF Docs:** https://www.django-rest-framework.org/
- **Celery Docs:** https://docs.celeryq.dev/
- **Cloudinary Docs:** https://cloudinary.com/documentation/django_integration

---

**PentaArt Platform v1.0** - Built with Django, Celery, and AI Magic ✨
