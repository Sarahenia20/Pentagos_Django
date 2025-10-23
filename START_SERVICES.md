# START ALL SERVICES

## Prerequisites Check
✅ **All connections tested and working!**
- Redis: Connected with password `sentinelhub123`
- OpenAI API: Configured
- Gemini API: Configured
- Cloudinary: Configured (dtn7sr0k5)

---

## START NOW (3 Terminals)

### Terminal 1: Celery Worker
```bash
cd "c:\Users\R I B\Desktop\5TWIN3\django-platform"
celery -A platform_core worker -l info -P solo
```

**What this does:**
- Connects to Redis (with your password)
- Picks up artwork generation tasks
- Calls DALL-E/Gemini APIs
- Saves images locally

---

### Terminal 2: Django Backend
```bash
cd "c:\Users\R I B\Desktop\5TWIN3\django-platform"
python manage.py runserver
```

**What this does:**
- Starts API server on http://localhost:8000
- CORS configured for any frontend port
- Handles artwork creation requests
- Queues tasks to Celery

---

### Terminal 3: Next.js Frontend
```bash
cd "c:\Users\R I B\Desktop\5TWIN3\django-platform\FrontOffice"
npm run dev
```

**What this does:**
- Starts frontend (usually port 3000 or 3002)
- Studio page for art generation
- Connects to Django API

---

## TEST IT

**Go to:** http://localhost:3000/studio (or whatever port Next.js shows)

**Try this prompt:**
```
A beautiful cyberpunk city at night with neon lights reflecting on wet streets, vibrant purple and pink colors, highly detailed digital art
```

**Select:** GPT-4o (uses DALL-E)

**Click:** Generate Art

**Wait:** 10-15 seconds

**Result:** Image appears! ✨

**Then click:** "Save to Cloudinary" (optional - only if you want cloud storage)

---

## What Happens When You Generate

```
YOU ENTER PROMPT
    ↓
FRONTEND → POST /api/artworks/
    ↓
DJANGO creates Artwork (status: queued)
    ↓
CELERY picks up task from Redis
    ↓
CALLS DALL-E API
    ↓
SAVES IMAGE → media/artworks/2025/10/23/
    ↓
FRONTEND polls /api/artworks/{id}/status/ every 2 seconds
    ↓
IMAGE SHOWS (from local file)
    ↓
[OPTIONAL] User clicks "Save to Cloudinary"
    ↓
UPLOADS to Cloudinary ☁️
```

---

## If Something Goes Wrong

### Celery can't connect to Redis
```bash
# Check if Redis Docker is running
docker ps | findstr redis

# If not, start it:
docker start <redis-container-id>
```

### Frontend can't connect to backend
```bash
# Check Django is running
curl http://localhost:8000/api/
```

### Image generation fails
- Check Celery terminal for errors
- Look for API errors (OpenAI/Gemini)
- Check media/artworks/ folder was created

---

## Ready to Start!

Run the 3 commands above in separate terminals and you're LIVE! 🚀
