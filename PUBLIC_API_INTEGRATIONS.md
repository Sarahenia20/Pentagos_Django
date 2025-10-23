# Public API Integrations Guide

## 🌐 Useful APIs from GitHub Lists

Based on your links:
- https://github.com/public-apis/public-api
- https://github.com/public-api-lists/public-api-lists

Here are the most useful APIs for PentaArt and how to integrate them.

---

## 🎨 Recommended APIs for Art Generation Platform

### 1️⃣ Color Palette APIs (FREE)

#### **Colormind.io - AI Color Palette Generator**

**Use Case:** Auto-generate complementary color palettes from user's prompt keywords

**API:** http://colormind.io/api-access/

**Implementation:**

Create `media_processing/utils/color_helper.py`:

```python
import requests
import json

def get_ai_color_palette():
    """Get AI-generated color palette from Colormind"""
    url = "http://colormind.io/api/"
    payload = {"model": "default"}

    response = requests.post(url, json=payload)
    if response.status_code == 200:
        colors = response.json()['result']
        # Convert RGB to hex
        hex_colors = ['#%02x%02x%02x' % tuple(c) for c in colors]
        return hex_colors
    return None

def get_palette_from_image_colors(rgb_list):
    """Generate palette based on specific colors"""
    url = "http://colormind.io/api/"
    payload = {
        "model": "default",
        "input": [rgb_list[0], "N", "N", "N", "N"]  # N = AI fills
    }

    response = requests.post(url, json=payload)
    if response.status_code == 200:
        return response.json()['result']
    return None
```

**Add to Django View:**

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .utils.color_helper import get_ai_color_palette

@api_view(['GET'])
def generate_color_palette(request):
    """Generate AI color palette for user"""
    palette = get_ai_color_palette()
    return Response({
        'colors': palette,
        'css': f"linear-gradient(to right, {', '.join(palette)})"
    })
```

**Add to URLs:**
```python
path('api/colors/generate/', generate_color_palette),
```

**Frontend Usage:**
```typescript
// Get palette suggestion
const palette = await fetch('http://localhost:8000/api/colors/generate/');
const colors = await palette.json();
// Suggest: "Try these colors: #FF5733, #33FF57, ..."
```

---

### 2️⃣ TheColorAPI - Color Information & Schemes

**API:** https://www.thecolorapi.com/

**Use Case:** Get color names, schemes, complementary colors

**Example Endpoints:**
```
GET https://www.thecolorapi.com/id?hex=FF5733
GET https://www.thecolorapi.com/scheme?hex=FF5733&mode=analogic&count=5
```

**Implementation:**

```python
# media_processing/utils/color_helper.py

def get_color_scheme(hex_color, mode='analogic', count=5):
    """
    Get color scheme from TheColorAPI

    Modes: monochrome, monochrome-dark, monochrome-light,
           analogic, complement, analogic-complement, triad, quad
    """
    url = f"https://www.thecolorapi.com/scheme"
    params = {
        'hex': hex_color.replace('#', ''),
        'mode': mode,
        'count': count,
        'format': 'json'
    }

    response = requests.get(url, params=params)
    if response.status_code == 200:
        data = response.json()
        return {
            'colors': [c['hex']['value'] for c in data['colors']],
            'mode': mode,
            'seed': data['seed']['hex']['value']
        }
    return None

def get_color_name(hex_color):
    """Get human-friendly color name"""
    url = f"https://www.thecolorapi.com/id"
    params = {'hex': hex_color.replace('#', '')}

    response = requests.get(url, params=params)
    if response.status_code == 200:
        data = response.json()
        return {
            'name': data['name']['value'],
            'closest': data['name']['closest_named_hex']
        }
    return None
```

---

### 3️⃣ Metropolitan Museum of Art API (FREE, No Key)

**API:** https://metmuseum.github.io/

**Use Case:** Get famous artworks for style inspiration

**Implementation:**

```python
# media_processing/utils/art_reference.py

import requests
import random

def search_met_artworks(query, limit=10):
    """Search Met Museum collection"""
    url = "https://collectionapi.metmuseum.org/public/collection/v1/search"
    params = {
        'q': query,
        'hasImages': 'true'
    }

    response = requests.get(url, params=params)
    if response.status_code == 200:
        object_ids = response.json().get('objectIDs', [])
        return object_ids[:limit]
    return []

def get_met_artwork_details(object_id):
    """Get artwork details from Met"""
    url = f"https://collectionapi.metmuseum.org/public/collection/v1/objects/{object_id}"

    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        return {
            'title': data.get('title'),
            'artist': data.get('artistDisplayName'),
            'date': data.get('objectDate'),
            'medium': data.get('medium'),
            'image': data.get('primaryImage'),
            'department': data.get('department'),
            'culture': data.get('culture')
        }
    return None

def get_random_art_inspiration(style='impressionism'):
    """Get random artwork for inspiration"""
    # Search by style
    object_ids = search_met_artworks(style, limit=20)
    if object_ids:
        # Pick random artwork
        random_id = random.choice(object_ids)
        return get_met_artwork_details(random_id)
    return None
```

**Add Django View:**

```python
@api_view(['GET'])
def get_art_inspiration(request):
    """Get random famous artwork for inspiration"""
    style = request.query_params.get('style', 'landscape')
    artwork = get_random_art_inspiration(style)

    if artwork:
        return Response({
            'artwork': artwork,
            'suggestion': f"Create art inspired by {artwork['artist']}'s {artwork['title']}"
        })
    return Response({'error': 'No artwork found'}, status=404)
```

**Frontend Usage:**
```typescript
// Get inspiration
const inspiration = await fetch('http://localhost:8000/api/inspiration/?style=impressionism');
const art = await inspiration.json();
// Show: "Inspired by Van Gogh's Starry Night"
// Button: "Generate in this style"
```

---

### 4️⃣ Unsplash API (Free: 50 requests/hour)

**API:** https://unsplash.com/developers

**Use Case:** High-quality reference photos for image-to-image generation

**Setup:**
```bash
# Add to .env
UNSPLASH_ACCESS_KEY=your-key-here
```

**Installation:**
```bash
pip install python-unsplash
```

**Implementation:**

```python
# media_processing/utils/unsplash_helper.py

from unsplash.api import Api
from unsplash.auth import Auth
from decouple import config

def search_unsplash_photos(query, per_page=10):
    """Search Unsplash for reference photos"""
    client_id = config('UNSPLASH_ACCESS_KEY', default='')
    if not client_id:
        return None

    auth = Auth(client_id, '', '', '')
    api = Api(auth)

    photos = api.search.photos(query, per_page=per_page)

    return [
        {
            'id': photo.id,
            'url': photo.urls.regular,
            'thumb': photo.urls.thumb,
            'author': photo.user.name,
            'description': photo.description or photo.alt_description,
            'download_url': photo.links.download
        }
        for photo in photos['results']
    ]

def get_random_photo(query='nature'):
    """Get random Unsplash photo"""
    client_id = config('UNSPLASH_ACCESS_KEY', default='')
    if not client_id:
        return None

    auth = Auth(client_id, '', '', '')
    api = Api(auth)

    photo = api.photo.random(query=query)[0]

    return {
        'url': photo.urls.regular,
        'author': photo.user.name,
        'description': photo.description
    }
```

---

### 5️⃣ OpenAI GPT-4 API - Prompt Enhancement

**You already have the key!**

**Use Case:** Automatically enhance user prompts for better AI art

**Implementation:**

```python
# media_processing/utils/prompt_enhancer.py

from openai import OpenAI
from decouple import config

def enhance_art_prompt(user_prompt):
    """Use GPT-4 to enhance user's prompt with artistic details"""
    client = OpenAI(api_key=config('OPENAI_API_KEY'))

    system_message = """You are an AI art prompt expert.
    Enhance the user's prompt by adding artistic details, style,
    lighting, composition, and mood while keeping the core idea.
    Keep it under 200 characters. Be creative and specific."""

    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": f"Enhance this art prompt: {user_prompt}"}
        ],
        max_tokens=100,
        temperature=0.8
    )

    enhanced = response.choices[0].message.content
    return enhanced.strip()
```

**Add Django View:**

```python
@api_view(['POST'])
def enhance_prompt(request):
    """Enhance user's prompt using GPT-4"""
    prompt = request.data.get('prompt', '')
    if not prompt:
        return Response({'error': 'Prompt required'}, status=400)

    enhanced = enhance_art_prompt(prompt)
    return Response({
        'original': prompt,
        'enhanced': enhanced
    })
```

**Add to URLs:**
```python
path('api/enhance-prompt/', enhance_prompt),
```

**Frontend Usage:**
```typescript
// Enhance button
const enhancePrompt = async (prompt: string) => {
  const response = await fetch('http://localhost:8000/api/enhance-prompt/', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({prompt})
  });
  const data = await response.json();
  return data.enhanced;
};

// In Studio page
<Button onClick={async () => {
  const enhanced = await enhancePrompt(prompt);
  setPrompt(enhanced);
}}>
  ✨ Enhance Prompt with AI
</Button>
```

---

### 6️⃣ Remove.bg API (Free: 50/month)

**API:** https://www.remove.bg/api

**Use Case:** Remove backgrounds from generated artwork

**Setup:**
```bash
# Add to .env
REMOVEBG_API_KEY=your-key-here

# Install
pip install removebg
```

**Implementation:**

```python
# media_processing/utils/image_processing.py

import requests
from decouple import config

def remove_background(image_url):
    """Remove background from image using Remove.bg"""
    api_key = config('REMOVEBG_API_KEY', default='')
    if not api_key:
        return None

    response = requests.post(
        'https://api.remove.bg/v1.0/removebg',
        data={'image_url': image_url, 'size': 'auto'},
        headers={'X-Api-Key': api_key}
    )

    if response.status_code == 200:
        # Returns PNG with transparent background
        return response.content
    return None
```

---

### 7️⃣ Quotable API (FREE) - Inspirational Quotes

**API:** https://github.com/lukePeavey/quotable

**Use Case:** Show inspirational art quotes on landing page

**Implementation:**

```python
# No installation needed - just HTTP requests

@api_view(['GET'])
def get_random_quote(request):
    """Get random inspirational quote"""
    response = requests.get('https://api.quotable.io/random?tags=art|creativity')
    if response.status_code == 200:
        data = response.json()
        return Response({
            'quote': data['content'],
            'author': data['author']
        })
    return Response({'error': 'Failed to fetch quote'}, status=500)
```

**Frontend Usage:**
```typescript
// Show on landing page
const quote = await fetch('http://localhost:8000/api/quote/');
// Display: "Art is not what you see, but what you make others see" - Edgar Degas
```

---

## 📦 Installation Summary

Add to `requirements.txt`:

```txt
# Existing packages...

# Public API integrations
python-unsplash==1.1.0    # Unsplash photos
removebg==0.4.0           # Background removal (optional)
```

Add to `.env`:

```bash
# Optional API keys (get from respective services)
UNSPLASH_ACCESS_KEY=your-key-here
REMOVEBG_API_KEY=your-key-here
```

---

## 🎯 Priority Implementation Plan

### High Priority (Enhance Core Features)

1. **Color Palette Generator** ⭐⭐⭐
   - Uses: Colormind + TheColorAPI
   - Benefit: Users get color suggestions
   - Time: 2 hours

2. **Prompt Enhancer** ⭐⭐⭐
   - Uses: OpenAI GPT-4 (you already have key!)
   - Benefit: Better prompts = better art
   - Time: 1 hour

3. **Art Inspiration** ⭐⭐
   - Uses: Met Museum API
   - Benefit: Users browse famous art for ideas
   - Time: 3 hours

### Medium Priority (Nice to Have)

4. **Reference Photos** ⭐⭐
   - Uses: Unsplash API
   - Benefit: Image-to-image generation
   - Time: 2 hours

5. **Background Removal** ⭐
   - Uses: Remove.bg API
   - Benefit: Post-processing effect
   - Time: 1 hour

6. **Inspirational Quotes** ⭐
   - Uses: Quotable API
   - Benefit: Landing page content
   - Time: 30 minutes

---

## 🔗 Quick Links

**Art & Museums:**
- Met Museum: https://metmuseum.github.io/
- Rijksmuseum: https://data.rijksmuseum.nl/object-metadata/api/
- Harvard Art: https://github.com/harvardartmuseums/api-docs

**Colors:**
- Colormind: http://colormind.io/api-access/
- TheColorAPI: https://www.thecolorapi.com/docs
- Coolors: https://coolors.co/api

**Images:**
- Unsplash: https://unsplash.com/developers
- Remove.bg: https://www.remove.bg/api
- Pexels: https://www.pexels.com/api/

**Text & Content:**
- Quotable: https://github.com/lukePeavey/quotable
- Lorem Picsum: https://picsum.photos/

---

## 🧪 Testing Public APIs

Create `test_public_apis.py`:

```python
"""
Test public API integrations
Run: python test_public_apis.py
"""

import requests

def test_colormind():
    print("🎨 Testing Colormind API...")
    url = "http://colormind.io/api/"
    response = requests.post(url, json={"model": "default"})
    if response.status_code == 200:
        colors = response.json()['result']
        print(f"✅ Got palette: {colors}")
    else:
        print("❌ Failed")

def test_color_api():
    print("🌈 Testing TheColorAPI...")
    url = "https://www.thecolorapi.com/scheme?hex=FF5733&mode=analogic"
    response = requests.get(url)
    if response.status_code == 200:
        print("✅ TheColorAPI working")
    else:
        print("❌ Failed")

def test_met_museum():
    print("🖼️ Testing Met Museum API...")
    url = "https://collectionapi.metmuseum.org/public/collection/v1/search?q=sunflowers&hasImages=true"
    response = requests.get(url)
    if response.status_code == 200:
        count = response.json()['total']
        print(f"✅ Found {count} artworks")
    else:
        print("❌ Failed")

def test_quotable():
    print("💭 Testing Quotable API...")
    url = "https://api.quotable.io/random?tags=art"
    response = requests.get(url)
    if response.status_code == 200:
        quote = response.json()
        print(f"✅ Quote: \"{quote['content']}\" - {quote['author']}")
    else:
        print("❌ Failed")

if __name__ == "__main__":
    print("Testing Public APIs...\n")
    test_colormind()
    test_color_api()
    test_met_museum()
    test_quotable()
    print("\nAll tests complete!")
```

Run:
```bash
python test_public_apis.py
```

---

## 🎁 Bonus: AI Generators You Can Add

From the GitHub resources in your README:

### Algorithmic Art Generators

Based on https://github.com/erdavids/Generative-Art:

1. **Flow Fields**
   - Perlin noise-based flowing lines
   - Beautiful organic patterns

2. **Fractals**
   - Mandelbrot set
   - Julia set
   - Sierpinski triangle

3. **Circle Packing**
   - Non-overlapping circles
   - Organic bubble patterns

4. **Voronoi Diagrams**
   - Cellular patterns
   - Natural stone textures

5. **Wave Patterns**
   - Sine/cosine wave interference
   - Ripple effects

**Place your implementations in:**
```
media_processing/algorithms/
├── fractals.py
├── flow_fields.py
├── geometric.py
├── circle_packing.py
└── voronoi.py
```

---

## 📝 Summary

**What You Can Do:**

1. **Enhance Prompts** - Use GPT-4 to improve user prompts (you already have the key!)
2. **Color Suggestions** - Generate AI color palettes with Colormind
3. **Art Inspiration** - Browse Met Museum for style references
4. **Reference Photos** - Search Unsplash for image-to-image
5. **Post-Processing** - Remove backgrounds, apply effects

**All FREE or use your existing API keys!**

**Next Steps:**
1. Pick 1-2 APIs to integrate first (recommend: Prompt Enhancement + Color Palette)
2. Add utility functions to `media_processing/utils/`
3. Create Django API endpoints
4. Update frontend to use new features

🚀 **Ready to level up your art generation platform!**
