# 🚀 QUICK START - 3 HOUR SETUP

## 📍 Step 1: Create .env File (Django Backend Root)

**Location:** `c:\Users\R I B\Desktop\5TWIN3\django-platform\.env`

**Copy this EXACTLY:**

```env
# Django Settings
SECRET_KEY=django-insecure-pentaart-dev-key-change-in-production-abc123xyz789
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database - Using SQLite for speed
USE_POSTGRESQL=False

# Celery/Redis
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# AI Providers - PASTE YOUR OPENAI KEY!
OPENAI_API_KEY=sk-proj-YOUR-KEY-HERE
GEMINI_API_KEY=

# Cloudinary - YOUR CREDENTIALS (WORKING!)
USE_CLOUDINARY=True
CLOUDINARY_CLOUD_NAME=dtn7sr0k5
CLOUDINARY_API_KEY=218928741933615
CLOUDINARY_API_SECRET=4Q5w13NQb8CBjfSfgosna0QR7ao

# CORS (Frontend)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

**⚠️ REPLACE:** `sk-proj-YOUR-KEY-HERE` with your actual OpenAI key!

---

## 📍 Step 2: Frontend .env.local

**Location:** `c:\Users\R I B\Desktop\5TWIN3\django-platform\FrontOffice\.env.local`

**Already created - should have:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## 📍 Step 3: Install Everything

```bash
# Backend
cd c:\Users\R I B\Desktop\5TWIN3\django-platform
pip install -r requirements.txt

# Frontend
cd FrontOffice
npm install
```

---

## 📍 Step 4: Run Migrations

```bash
cd c:\Users\R I B\Desktop\5TWIN3\django-platform
python manage.py migrate
python manage.py createsuperuser
# Username: admin
# Password: admin123
```

---

## 🚀 Step 5: START ALL SERVICES (4 Terminals)

### Terminal 1: Redis
```bash
redis-server
```

### Terminal 2: Celery Worker
```bash
cd c:\Users\R I B\Desktop\5TWIN3\django-platform
celery -A platform_core worker -l info -P solo
```

### Terminal 3: Django Backend
```bash
cd c:\Users\R I B\Desktop\5TWIN3\django-platform
python manage.py runserver
```

### Terminal 4: Next.js Frontend
```bash
cd c:\Users\R I B\Desktop\5TWIN3\django-platform\FrontOffice
npm run dev
```

---

## ✅ Step 6: TEST IT!

1. Open: http://localhost:3000/studio
2. Enter prompt: "A beautiful sunset over mountains, vibrant colors"
3. Select: Gemini or GPT-4o
4. Click: "Generate Art"
5. Wait 10-15 seconds
6. **IMAGE APPEARS!** ✨
7. Image is saved to Cloudinary automatically!
8. Check admin: http://localhost:8000/admin/

---

## 🎨 BONUS: Add Color Palette API (5 minutes)

Let's make the studio richer! Add a color palette generator.

### Create utility file:

**File:** `django-platform/media_processing/utils/color_helper.py`

```python
import requests

def get_color_palette():
    """Get AI-generated color palette from Colormind (FREE API)"""
    try:
        url = "http://colormind.io/api/"
        response = requests.post(url, json={"model": "default"})
        if response.status_code == 200:
            colors = response.json()['result']
            # Convert RGB to hex
            hex_colors = ['#%02x%02x%02x' % tuple(c) for c in colors]
            return hex_colors
        return None
    except:
        return None

def get_color_scheme(hex_color):
    """Get color scheme from TheColorAPI (FREE, no key needed)"""
    try:
        url = f"https://www.thecolorapi.com/scheme"
        params = {
            'hex': hex_color.replace('#', ''),
            'mode': 'analogic',
            'count': 5
        }
        response = requests.get(url, params=params)
        if response.status_code == 200:
            data = response.json()
            return [c['hex']['value'] for c in data['colors']]
        return None
    except:
        return None
```

### Add API endpoint:

**File:** `django-platform/media_processing/views.py` (ADD AT END)

```python
@api_view(['GET'])
def get_color_palette(request):
    """Generate AI color palette for inspiration"""
    from .utils.color_helper import get_color_palette

    palette = get_color_palette()
    if palette:
        return Response({
            'colors': palette,
            'gradient': f"linear-gradient(to right, {', '.join(palette)})"
        })
    return Response({'error': 'Failed to generate palette'}, status=500)
```

### Add to URLs:

**File:** `django-platform/platform_core/urls.py` (ADD TO ROUTER)

```python
# Add this import at top
from media_processing.views import get_color_palette

# Add this route
path('api/colors/', get_color_palette, name='color-palette'),
```

### Use in Frontend:

**File:** `FrontOffice/app/studio/page.tsx` (ADD BUTTON)

```tsx
// Add state
const [suggestedColors, setSuggestedColors] = useState<string[]>([]);

// Add function
const getSuggestion = async () => {
  try {
    const response = await fetch('http://localhost:8000/api/colors/');
    const data = await response.json();
    setSuggestedColors(data.colors);
    // Add to prompt
    setPrompt(prev => `${prev}, color palette: ${data.colors.join(', ')}`);
  } catch (err) {
    console.error('Failed to get colors');
  }
};

// Add button before Generate button:
<Button onClick={getSuggestion} variant="outline" className="w-full">
  🎨 Get Color Inspiration
</Button>

// Show colors if available
{suggestedColors.length > 0 && (
  <div className="flex gap-2">
    {suggestedColors.map(color => (
      <div
        key={color}
        className="w-10 h-10 rounded"
        style={{backgroundColor: color}}
        title={color}
      />
    ))}
  </div>
)}
```

---

## 🌐 MORE FREE APIs TO ADD (From GitHub Lists)

### 1. **Metropolitan Museum API** (Art Inspiration)
- FREE, No key needed
- Get famous artworks for style reference
- URL: https://collectionapi.metmuseum.org/public/collection/v1

**Quick Integration:**
```python
@api_view(['GET'])
def get_art_inspiration(request):
    """Get random famous artwork"""
    import requests
    import random

    # Search for artworks
    response = requests.get(
        'https://collectionapi.metmuseum.org/public/collection/v1/search',
        params={'q': 'landscape', 'hasImages': 'true'}
    )
    object_ids = response.json().get('objectIDs', [])[:20]

    # Get random artwork details
    if object_ids:
        random_id = random.choice(object_ids)
        artwork = requests.get(
            f'https://collectionapi.metmuseum.org/public/collection/v1/objects/{random_id}'
        ).json()

        return Response({
            'title': artwork.get('title'),
            'artist': artwork.get('artistDisplayName'),
            'image': artwork.get('primaryImage'),
            'suggestion': f"Create art inspired by {artwork.get('artistDisplayName')}"
        })
    return Response({'error': 'No artwork found'}, status=404)
```

### 2. **Quotable API** (Inspirational Quotes)
- FREE, No key
- Show art quotes on landing page
- URL: https://api.quotable.io

```python
@api_view(['GET'])
def get_quote(request):
    response = requests.get('https://api.quotable.io/random?tags=art')
    data = response.json()
    return Response({
        'quote': data['content'],
        'author': data['author']
    })
```

### 3. **Unsplash API** (Reference Photos)
- FREE: 50 requests/hour
- Need free key from: https://unsplash.com/developers
- High-quality photos for reference

---

## 🎯 YOUR CHECKLIST (3 Hours)

### Hour 1: Setup
- [ ] Create `.env` file in Django root
- [ ] Add OpenAI key
- [ ] Install dependencies (backend & frontend)
- [ ] Run migrations
- [ ] Create superuser

### Hour 2: Testing
- [ ] Start Redis
- [ ] Start Celery worker
- [ ] Start Django
- [ ] Start Next.js
- [ ] Test image generation
- [ ] Fix any errors

### Hour 3: Polish
- [ ] Add color palette API
- [ ] Test Cloudinary uploads
- [ ] Test Gallery page
- [ ] Make sure images display
- [ ] Submit!

---

## 🆘 QUICK FIXES

**Image not generating?**
- Check Celery worker is running (Terminal 2)
- Check OpenAI key in .env
- Check Celery logs for errors

**Image not showing?**
- Check image URL in browser console (F12)
- Cloudinary URL should start with: https://res.cloudinary.com/dtn7sr0k5/

**CORS error?**
- Restart Django after changing .env
- Check CORS_ALLOWED_ORIGINS includes http://localhost:3000

---

## 🎨 EXAMPLE PROMPTS TO TEST

1. "A serene Japanese garden with cherry blossoms, watercolor style"
2. "Cyberpunk cityscape at night, neon lights, rainy streets"
3. "Abstract geometric patterns, vibrant colors, minimalist"
4. "Majestic dragon flying over mountains, fantasy art"
5. "Peaceful beach sunset, tropical paradise, golden hour"

---

**LET'S GO! YOU HAVE 3 HOURS - START WITH STEP 1!** 🚀
