# PentaArt - AI Art Generation Platform

A full-stack generative art platform with Next.js frontend and Django backend integration. Create stunning AI-generated artwork using multiple AI models and algorithmic art generation.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: shadcn/ui components
- **Backend**: Django (separate repository - backend integration ready)
- **Theme**: Dark/Light mode with localStorage persistence

## Project Structure

\`\`\`
├── app/
│   ├── page.tsx                 # Landing page (hero section)
│   ├── login/page.tsx           # Sign in page
│   ├── register/page.tsx        # Sign up page
│   ├── reset-password/page.tsx  # Password reset page
│   ├── studio/page.tsx          # Art generation studio (main app)
│   ├── gallery/page.tsx         # Personal art gallery
│   ├── community/page.tsx       # Community feed & trending art
│   └── profile/page.tsx         # User profile & settings
├── components/
│   ├── user-nav.tsx             # Header navigation with user dropdown
│   ├── theme-toggle.tsx         # Dark/Light mode toggle button
│   └── pulsing-border-shader.tsx # Animated border effect (landing page)
├── hero-section.tsx             # Landing page hero component
└── README.md                    # This file
\`\`\`

## Routes & Pages

### Public Routes (Dark Background)
- `/` - Landing page with hero section, features, and pricing
- `/login` - Sign in form with social auth options
- `/register` - Sign up form with email/password
- `/reset-password` - Password reset flow

### Protected Routes (Theme-aware)
- `/studio` - Main art generation interface with AI model selection
- `/gallery` - Personal gallery with masonry grid layout
- `/community` - Trending artworks and featured artists
- `/profile` - User settings, billing, and preferences

## Components

### UserNav (`components/user-nav.tsx`)
Header navigation component with:
- PentaArt logo (links to home)
- Navigation links (Studio, Gallery, Community)
- Theme toggle button (sun/moon icon)
- User dropdown menu (Profile, Settings, Logout)
- Responsive design with theme-aware styling

**Usage:**
\`\`\`tsx
import { UserNav } from '@/components/user-nav'

<UserNav />
\`\`\`

### ThemeToggle (`components/theme-toggle.tsx`)
Dark/Light mode toggle with:
- Sun icon (light mode) / Moon icon (dark mode)
- localStorage persistence
- System preference detection
- Smooth transitions

**Usage:**
\`\`\`tsx
import { ThemeToggle } from '@/components/theme-toggle'

<ThemeToggle />
\`\`\`

### PulsingBorderShader (`components/pulsing-border-shader.tsx`)
Animated border effect for landing page hero section:
- Canvas-based animation
- Purple/pink gradient colors
- Responsive sizing
- Performance optimized

## Color System

### Dark Mode (Default)
\`\`\`css
Background: bg-black
Overlay: from-purple-900/20 via-black to-pink-900/20
Cards: bg-gray-900/50 with backdrop-blur-xl
Text: text-white, text-gray-300
Borders: border-purple-500/20
\`\`\`

### Light Mode
\`\`\`css
Background: bg-white
Overlay: from-purple-50 via-white to-pink-50
Cards: bg-white with border-gray-200
Text: text-gray-900, text-gray-600
Borders: border-gray-200
\`\`\`

### Brand Colors
- **Primary Purple**: `#8b5cf6` (purple-500)
- **Primary Pink**: `#ec4899` (pink-500)
- **Accent Amber**: `#f59e0b` (amber-500)
- **Dark Base**: `#000000` (black)
- **Light Base**: `#ffffff` (white)

### Color Usage
\`\`\`tsx
// Buttons
bg-gradient-to-r from-purple-600 to-pink-600

// Hover states
hover:from-purple-700 hover:to-pink-700

// Text accents
text-purple-400, text-pink-400

// Borders
border-purple-500/20
\`\`\`

## Theme System

The app uses a custom theme system with localStorage persistence:

1. **Theme Toggle**: Click sun/moon icon in header
2. **Persistence**: Theme preference saved to localStorage
3. **System Preference**: Respects `prefers-color-scheme` on first load
4. **Implementation**: Classes added to `document.documentElement`

### How It Works
\`\`\`tsx
// Theme is stored in localStorage as 'theme'
// Values: 'dark' | 'light'

// All pages use conditional classes:
className="bg-black dark:bg-black light:bg-white"
className="text-white dark:text-white light:text-gray-900"
\`\`\`

## Page Details

### Landing Page (`/`)
- Hero section with pulsing border animation
- "How It Works" section (3 steps)
- Pricing tiers (Free, Premium, Enterprise)
- CTA buttons → `/register`
- Dark theme only (no light mode toggle)

### Auth Pages (`/login`, `/register`, `/reset-password`)
- Dark background matching landing page
- Glassmorphic form cards
- Social auth buttons (Google, GitHub)
- Form validation ready
- Redirects to `/studio` after login

### Studio Page (`/studio`)
Main art generation interface:
- Prompt input textarea
- AI model selector (Gemini, GPT-4o, DALL-E, Stable Diffusion)
- Style presets (Realistic, Abstract, Anime, etc.)
- Aspect ratio selector
- Generate button
- Recent generations grid
- Theme-aware styling

### Gallery Page (`/gallery`)
Personal art collection:
- Masonry grid layout (3 columns)
- Search and filter tabs
- Artwork cards with hover effects
- Modal view for details
- Theme-aware styling

### Community Page (`/community`)
Discover and explore:
- Trending artworks grid
- Featured artists section
- Tabs: Trending, Featured, New
- Like and view counts
- Theme-aware styling

### Profile Page (`/profile`)
User management:
- Tabbed interface (Profile, Settings, Billing)
- Profile information form
- Generation preferences
- Billing and subscription info
- Theme-aware styling

## Django Backend Integration

### API Endpoints (Ready for Integration)
\`\`\`typescript
// Auth
POST /api/auth/login
POST /api/auth/register
POST /api/auth/reset-password
POST /api/auth/logout

// Art Generation
POST /api/generate
GET /api/generations
GET /api/generations/:id

// Gallery
GET /api/gallery
DELETE /api/gallery/:id

// Community
GET /api/community/trending
GET /api/community/featured

// Profile
GET /api/profile
PUT /api/profile
\`\`\`

### Environment Variables Needed
\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DJANGO_API_KEY=your_api_key
\`\`\`

## Development

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
\`\`\`

## Design System

### Typography
- **Font Family**: Inter (sans-serif)
- **Headings**: font-bold, text-3xl to text-5xl
- **Body**: font-normal, text-base to text-lg
- **Line Height**: leading-relaxed (1.625)

### Spacing Scale
- **Tight**: gap-2, p-2 (8px)
- **Normal**: gap-4, p-4 (16px)
- **Relaxed**: gap-6, p-6 (24px)
- **Loose**: gap-8, p-8 (32px)

### Border Radius
- **Small**: rounded-lg (8px)
- **Medium**: rounded-xl (12px)
- **Large**: rounded-2xl (16px)
- **Full**: rounded-full (9999px)

### Shadows
- **Small**: shadow-sm
- **Medium**: shadow-md
- **Large**: shadow-lg
- **Extra Large**: shadow-2xl

## Key Features

✅ Dark/Light theme with toggle
✅ Responsive design (mobile-first)
✅ Glassmorphic UI elements
✅ Smooth animations and transitions
✅ Form validation ready
✅ Django backend integration ready
✅ AI model selection interface
✅ Gallery with masonry layout
✅ Community discovery feed
✅ User profile management

## Notes for AI Agents

- **Color consistency**: Use the brand colors (purple, pink, amber) throughout
- **Theme awareness**: All new components must support dark/light modes
- **Component reuse**: Use existing shadcn/ui components when possible
- **Routing**: Use Next.js Link component for navigation
- **Forms**: Ready for Django backend integration via fetch/axios
- **Images**: Use Next.js Image component for optimization

## Future Enhancements

- [ ] Connect to Django backend API
- [ ] Implement actual AI generation
- [ ] Add user authentication with JWT
- [ ] Add payment integration (Stripe)
- [ ] Add real-time generation queue
- [ ] Add social features (likes, comments, shares)
- [ ] Add collection management
- [ ] Add analytics dashboard

---

**PentaArt** - Where AI meets creativity 🎨
