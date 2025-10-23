# 🔧 Troubleshooting Guide

## Common Issues & Quick Fixes

### 1. "Cannot connect to API" or "Network Error"

**Cause:** Django backend not running

**Fix:**
```bash
# Terminal 3
cd "c:\Users\R I B\Desktop\5TWIN3\django-platform"
python manage.py runserver
```

**Verify:** Open http://localhost:8000/api/ - should see API root

---

### 2. "Artwork stuck in 'queued' status forever"

**Cause:** Celery worker not running

**Fix:**
```bash
# Terminal 2
cd "c:\Users\R I B\Desktop\5TWIN3\django-platform"
celery -A platform_core worker -l info -P solo
```

**Verify:** Should see "celery@YOUR-PC ready" message

---

### 3. "Redis connection refused" or "Connection Error"

**Cause:** Redis not running

**Fix:**
```bash
# Terminal 1
redis-server
```

**Verify:**
```bash
redis-cli ping
# Should return: PONG
```

**If Redis not installed:**
Download from: https://github.com/microsoftarchive/redis/releases

---

### 4. "Invalid API key" or "Authentication failed"

**Cause:** Wrong or missing API key

**Fix:**
1. Check `.env` file has correct key:
   ```
   OPENAI_API_KEY=sk-svcacct-...
   GEMINI_API_KEY=AIza...
   ```

2. Restart Django server after changing .env

**Verify:**
- OpenAI: https://platform.openai.com/api-keys
- Gemini: https://makersuite.google.com/app/apikey

---

### 5. "Image not displaying" or "404 on image URL"

**Cause A:** Image URL is local but using Cloudinary

**Fix:** Check image URL in browser console (F12)
- If starts with `http://localhost:8000/media/` → Local storage
- If starts with `https://res.cloudinary.com/` → Cloudinary

**Cause B:** CORS issue

**Fix:** Add to `.env`:
```
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```
Restart Django

**Cause C:** Cloudinary upload failed

**Fix:** Check Celery logs for errors
```bash
# Look for Cloudinary errors in Terminal 2
```

**Verify Cloudinary:**
1. Go to: https://cloudinary.com/console
2. Check Media Library
3. Should see uploaded images

---

### 6. "Module not found" or "Import Error"

**Cause:** Missing dependencies

**Fix:**
```bash
# Backend
cd "c:\Users\R I B\Desktop\5TWIN3\django-platform"
pip install -r requirements.txt

# Specifically for Cloudinary:
pip install cloudinary django-cloudinary-storage

# Frontend
cd FrontOffice
npm install
```

---

### 7. "Port already in use"

**Cause:** Port 8000 or 3000 already occupied

**Fix:**

**Windows:**
```bash
# Find process using port 8000
netstat -ano | findstr :8000
# Kill it
taskkill /PID <PID_NUMBER> /F

# Find process using port 3000
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

**Or change ports:**
```bash
# Django on different port
python manage.py runserver 8001

# Update frontend .env.local
NEXT_PUBLIC_API_URL=http://localhost:8001/api
```

---

### 8. "Database error" or "relation does not exist"

**Cause:** Migrations not run

**Fix:**
```bash
cd "c:\Users\R I B\Desktop\5TWIN3\django-platform"
python manage.py migrate
```

**If still errors:**
```bash
# Delete database and start fresh
python manage.py flush
python manage.py migrate
python manage.py createsuperuser
```

---

### 9. "Frontend shows blank page"

**Cause:** Next.js not started or error in code

**Fix:**
```bash
# Check Terminal 4 for errors
cd FrontOffice
npm run dev
```

**Check browser console (F12)** for JavaScript errors

---

### 10. "Generation takes too long" (>2 minutes)

**Possible Causes:**
- Slow AI API response
- Network issues
- Large image size

**Fix:**
- Use smaller image size (512x512 instead of 1024x1024)
- Try different AI provider
- Check network connection
- Check AI provider status page

---

## ✅ Health Check Commands

Run these to verify everything is working:

```bash
# 1. Check Redis
redis-cli ping
# Should return: PONG

# 2. Check Django
curl http://localhost:8000/api/
# Should return JSON

# 3. Check Celery tasks registered
cd "c:\Users\R I B\Desktop\5TWIN3\django-platform"
celery -A platform_core inspect registered
# Should show: media_processing.tasks.generate_artwork

# 4. Check Frontend
curl http://localhost:3000
# Should return HTML

# 5. Check Database
cd "c:\Users\R I B\Desktop\5TWIN3\django-platform"
python manage.py dbshell
# Should open database prompt
# Type: \dt (PostgreSQL) or .tables (SQLite)
# Should show tables like: media_processing_artwork
```

---

## 🔍 Debug Checklist

When something isn't working:

1. **Check all 4 terminals are running:**
   - [ ] Terminal 1: Redis
   - [ ] Terminal 2: Celery
   - [ ] Terminal 3: Django
   - [ ] Terminal 4: Next.js

2. **Check browser console (F12):**
   - [ ] No JavaScript errors
   - [ ] API calls succeeding (Network tab)

3. **Check Celery logs (Terminal 2):**
   - [ ] Task received message
   - [ ] No error messages

4. **Check Django logs (Terminal 3):**
   - [ ] API requests showing up
   - [ ] No 500 errors

5. **Check .env file:**
   - [ ] USE_CLOUDINARY=True
   - [ ] CLOUDINARY_CLOUD_NAME=dtn7sr0k5
   - [ ] OPENAI_API_KEY or GEMINI_API_KEY set

---

## 🆘 Still Not Working?

### Step 1: Restart Everything

```bash
# Stop all services (Ctrl+C in each terminal)
# Then restart in order:

# Terminal 1
redis-server

# Terminal 2 (wait for Redis to start)
cd "c:\Users\R I B\Desktop\5TWIN3\django-platform"
celery -A platform_core worker -l info -P solo

# Terminal 3 (wait for Celery to start)
cd "c:\Users\R I B\Desktop\5TWIN3\django-platform"
python manage.py runserver

# Terminal 4 (wait for Django to start)
cd FrontOffice
npm run dev
```

### Step 2: Check Logs for Specific Errors

Look in Terminal 2 (Celery) for detailed error messages

### Step 3: Test with cURL

```bash
# Test API directly
curl -X POST http://localhost:8000/api/artworks/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "generation_type": "ai_prompt",
    "ai_provider": "gemini",
    "prompt": "beautiful sunset",
    "image_size": "1024x1024",
    "is_public": true
  }'
```

---

## 📞 Quick Reference

**Backend URL:** http://localhost:8000
**Frontend URL:** http://localhost:3000
**Admin URL:** http://localhost:8000/admin
**API Root:** http://localhost:8000/api/

**Cloudinary Dashboard:** https://cloudinary.com/console
**Your Cloud Name:** dtn7sr0k5

---

**If all else fails:** Check [START_NOW.md](START_NOW.md) for complete setup instructions
