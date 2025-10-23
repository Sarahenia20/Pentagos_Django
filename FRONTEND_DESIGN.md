# PentaArt Frontend Design Specification

## 🎨 Design System

### Colors (Purple/Pink Theme)
```css
--primary: #8b5cf6 (Purple)
--secondary: #ec4899 (Pink)
--accent: #f59e0b (Amber)
--dark: #1e1b4b (Indigo 900)
--light: #f5f3ff (Violet 50)
--success: #10b981 (Green)
--error: #ef4444 (Red)
--warning: #f59e0b (Amber)
```

### Typography
- **Headings:** Inter, Sans-serif (Bold 700-900)
- **Body:** Inter, Sans-serif (Regular 400-600)
- **Code/Monospace:** JetBrains Mono

### Spacing Scale
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

---

## 📄 Pages & Components

### 1. Landing Page (`/`)

**Hero Section:**
```
┌─────────────────────────────────────────┐
│  🎨 PentaArt                    [Login] │
│                                         │
│         Generate Art with AI            │
│         ────────────────────            │
│    Turn imagination into reality        │
│                                         │
│     [Get Started Free] [See Gallery]    │
│                                         │
│  ╔═══╗  ╔═══╗  ╔═══╗  ╔═══╗  ╔═══╗     │
│  ║ 🖼 ║  ║ 🖼 ║  ║ 🖼 ║  ║ 🖼 ║  ║ 🖼 ║     │
│  ╚═══╝  ╚═══╝  ╚═══╝  ╚═══╝  ╚═══╝     │
│   Featured AI-Generated Artworks        │
└─────────────────────────────────────────┘
```

**Components:**
- Animated gradient background
- Auto-rotating carousel of featured art
- Smooth scroll to sections
- CTA buttons with hover effects

**How It Works Section:**
```
┌──────────────────────────────────────┐
│   How PentaArt Works                 │
│                                      │
│   1️⃣ Sign Up Free → 2️⃣ Describe → 3️⃣ Generate │
│                                      │
│   [Detailed cards for each step]     │
└──────────────────────────────────────┘
```

**Pricing Tiers:**
```
┌───────────────────────────────────────┐
│  Free          Premium      Enterprise│
│  ───────       ────────     ──────────│
│  $0/mo         $19/mo       Custom    │
│                                       │
│  • 50 gens/mo  • Unlimited  • Dedicated│
│  • Hugging Face • GPT-4o   • API Access│
│  • Standard    • HD Quality • Priority│
│  • Community   • No Watermark• Support│
└───────────────────────────────────────┘
```

---

### 2. Authentication Pages

**Login (`/login`):**
```
┌──────────────────────┐
│   🎨 Welcome Back    │
│                      │
│   Email:    [_____]  │
│   Password: [_____]  │
│                      │
│   [Login] [Register] │
│   ─── OR ───         │
│   [🔵 Google]        │
│   [⚫ GitHub]         │
└──────────────────────┘
```

**Register (`/register`):**
```
┌──────────────────────┐
│   🎨 Join PentaArt   │
│                      │
│   Username: [_____]  │
│   Email:    [_____]  │
│   Password: [_____]  │
│   Confirm:  [_____]  │
│                      │
│   [Sign Up] [Login]  │
└──────────────────────┘
```

---

### 3. Dashboard / Studio (`/dashboard`)

**Layout:**
```
┌────┬──────────────────────────────────┬────┐
│ S  │      GENERATION PANEL            │ R  │
│ I  │  ┌────────────────────────────┐  │ I  │
│ D  │  │ Prompt: [____________]     │  │ G  │
│ E  │  │ AI: [Gemini ▼] Size: [▼] │  │ H  │
│ B  │  │ [Generate Art 🎨]          │  │ T  │
│ A  │  └────────────────────────────┘  │    │
│ R  │                                  │ S  │
│    │  ┌────────────────────────────┐  │ I  │
│ 📁 │  │                            │  │ D  │
│ My │  │    Generated Image         │  │ E  │
│ Art│  │        Preview             │  │    │
│    │  │    [Download] [Save]       │  │ 📊 │
│ 🌍 │  └────────────────────────────┘  │ Que│
│ Com│                                  │ ue │
│ mun│  Recent: [🖼][🖼][🖼][🖼][🖼]      │    │
│ ity│                                  │ 📈 │
│    │                                  │ Sta│
│ 📊 │                                  │ ts │
│ Ana│                                  │    │
│ lyt│                                  │    │
│ ics│                                  │    │
└────┴──────────────────────────────────┴────┘
```

**Left Sidebar:**
- Navigation menu
- Quick stats (total artworks, credits remaining)
- User avatar

**Center Canvas:**
- **Generation Panel** (Top):
  - Large textarea for prompt
  - AI provider dropdown (GPT-4o, SDXL, Flux)
  - Size selector, quality, style presets
  - Advanced options (collapsible)
  - "Generate" button (glowing purple gradient)

- **Preview Area** (Center):
  - Loading spinner during generation
  - Progress bar with status
  - Large image preview when done
  - Zoom/pan controls
  - Download, Save, Remix, Share buttons

- **Recent Generations** (Bottom):
  - Horizontal scrolling thumbnail strip
  - Click to load into preview

**Right Sidebar:**
- Generation queue (pending jobs)
- Quick stats
- Recent activity feed

---

### 4. Gallery View (`/gallery`)

**Masonry Grid Layout:**
```
┌──────────────────────────────────┐
│  [Search: _______] [Filters ▼]   │
│                                  │
│  ┌───┐ ┌───┐ ┌──────┐           │
│  │ 🖼│ │ 🖼│ │  🖼  │           │
│  └───┘ └───┘ └──────┘           │
│  ┌──────┐ ┌───┐ ┌───┐           │
│  │  🖼  │ │ 🖼│ │ 🖼│           │
│  └──────┘ └───┘ └───┘           │
│  ┌───┐ ┌──────┐ ┌───┐           │
│  │ 🖼│ │  🖼  │ │ 🖼│           │
│  └───┘ └──────┘ └───┘           │
│                                  │
│  [Load More...]                  │
└──────────────────────────────────┘
```

**Features:**
- Pinterest-style masonry layout
- Filter by: My Art, Public, Collections, Date
- Search by prompt text
- Infinite scroll
- Hover effects: Show title, likes, date
- Click → Modal with full details

**Artwork Modal:**
```
┌──────────────────────────────────┐
│  [← Back]              [× Close]  │
│                                  │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  │      Full Size Image       │  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
│  Title: "Cyberpunk Cityscape"    │
│  Prompt: "A neon-lit cyberpunk..." │
│  AI: GPT-4o | Size: 1024x1024   │
│  Date: Oct 14, 2025             │
│                                  │
│  [❤ Like] [💬 Comment] [🔄 Remix]│
│  [⬇ Download] [➕ Add to Collection]│
└──────────────────────────────────┘
```

---

### 5. Collections (`/collections`)

```
┌──────────────────────────────────┐
│  My Collections    [+ New]       │
│                                  │
│  ┌────────────┐ ┌────────────┐  │
│  │ Abstract   │ │ Landscapes │  │
│  │ 🖼 🖼 🖼    │ │ 🖼 🖼 🖼    │  │
│  │ 12 items   │ │ 8 items    │  │
│  └────────────┘ └────────────┘  │
│                                  │
│  ┌────────────┐ ┌────────────┐  │
│  │ Portraits  │ │ Sci-Fi     │  │
│  │ 🖼 🖼 🖼    │ │ 🖼 🖼 🖼    │  │
│  │ 5 items    │ │ 20 items   │  │
│  └────────────┘ └────────────┘  │
└──────────────────────────────────┘
```

**Collection Detail View:**
- Grid of artworks in collection
- Drag & drop to reorder
- Remove from collection
- Share collection link
- Export as ZIP

---

### 6. Community / Discovery (`/community`)

**Tabs:**
- Trending (24h, Week, Month)
- Featured by PentaArt
- New

```
┌──────────────────────────────────┐
│  [Trending] [Featured] [New]     │
│                                  │
│  🔥 Trending Today               │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐        │
│  │ 🖼│ │ 🖼│ │ 🖼│ │ 🖼│        │
│  │524│ │391│ │287│ │156│        │
│  │❤  │ │❤  │ │❤  │ │❤  │        │
│  └───┘ └───┘ └───┘ └───┘        │
│                                  │
│  🎨 Featured Artists             │
│  [@user1] [@user2] [@user3]      │
└──────────────────────────────────┘
```

---

### 7. Analytics (`/analytics`)

**Dashboard:**
```
┌──────────────────────────────────┐
│  Your Art Statistics             │
│                                  │
│  Total Artworks: 127             │
│  This Month: 34 (+12%)           │
│                                  │
│  ┌──────────┐ ┌──────────┐      │
│  │  AI: 78% │ │ Algo: 22%│      │
│  │  🥧 Pie  │ │ 📊 Chart │      │
│  └──────────┘ └──────────┘      │
│                                  │
│  Generation Timeline:            │
│  ╔════════════════════╗          │
│  ║ 📈 Line Chart      ║          │
│  ║                    ║          │
│  ╚════════════════════╝          │
│                                  │
│  Most Used Prompts:              │
│  • "cyberpunk" (24)              │
│  • "landscape" (18)              │
│  • "abstract" (15)               │
└──────────────────────────────────┘
```

---

### 8. Profile / Settings (`/profile`)

```
┌──────────────────────────────────┐
│  [Profile] [Settings] [Billing]  │
│                                  │
│  ┌────┐                          │
│  │ 👤 │  @username               │
│  └────┘  sarah.henia@esprit.tn   │
│                                  │
│  Bio: [___________________]      │
│  Location: [_______________]     │
│  Website: [________________]     │
│                                  │
│  Default AI: [Gemini ▼]          │
│  Image Size: [1024x1024 ▼]       │
│                                  │
│  [Save Changes]                  │
└──────────────────────────────────┘
```

---

## 🎯 Key Interactions

### Generation Flow
1. User enters prompt in textarea
2. Selects AI provider (defaults to user preference)
3. Adjusts size/quality (optional)
4. Clicks "Generate Art" button
   - Button shows loading state
   - Progress bar appears
   - Artwork appears in queue (right sidebar)
5. Generation completes
   - Toast notification
   - Image appears in preview
   - Action buttons enable

### Real-time Updates (WebSocket)
- Generation progress (0-100%)
- Queue position
- Completion notifications
- Other users' public generations (community feed)

---

## 📱 Responsive Breakpoints

- **Mobile:** < 640px (single column, bottom nav)
- **Tablet:** 640px - 1024px (2 columns, collapsible sidebars)
- **Desktop:** > 1024px (full 3-column layout)

---

## 🎨 Component Library (Suggested)

**UI Framework:** Tailwind CSS + shadcn/ui
**Icons:** Lucide React
**Animations:** Framer Motion
**Forms:** React Hook Form + Zod
**State:** Zustand
**API Client:** Axios + SWR (for caching)
**Image Handling:** Next.js Image component

---

## 🔗 Navigation Structure

```
/ (Landing)
├── /login
├── /register
├── /dashboard (Protected)
│   ├── /gallery
│   ├── /collections
│   │   └── /collections/[id]
│   ├── /community
│   ├── /analytics
│   └── /profile
└── /admin (Link to Django Admin)
```

---

## 🎨 Animation Guidelines

- **Page Transitions:** Smooth fade (200ms)
- **Button Hover:** Scale 1.05, shadow increase
- **Image Load:** Blur-up placeholder
- **Generation Progress:** Pulsing gradient bar
- **Success:** Confetti animation (react-confetti)
- **Errors:** Shake animation

---

## 🚀 Performance Targets

- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3s
- **Lighthouse Score:** > 90
- **Image Optimization:** WebP/AVIF, lazy loading
- **Code Splitting:** Dynamic imports for heavy components

---

**Use this spec as your reference when building the Next.js frontend!**
