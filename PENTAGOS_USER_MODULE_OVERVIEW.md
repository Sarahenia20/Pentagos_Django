# Pentagos User Module & AI Features: Full Technical Overview

## Table of Contents
1. Introduction
2. Backend (Django)
   - User Authentication & Registration
   - OAuth (Google/GitHub)
   - UserProfile & ActivityLog Models
   - AI-Powered Features (Bio, Avatar, Personality, Skills)
   - Celery Task Flow
   - API Endpoints
3. Frontend (Next.js)
   - User Flows (Sign In, Sign Up, Password Reset, Profile, Logout)
   - API Usage & User State Management
   - Polling for AI Task Completion
4. Database Schema
   - User & UserProfile Tables
   - AI Fields & Data Flow
5. AI Task Flow
   - Triggering AI Tasks
   - Celery Processing
   - Result Delivery
6. Code References
   - Backend: File & Function Locations
   - Frontend: File & Component Locations
7. Sequence Diagrams
8. Summary

---

## 1. Introduction
This document provides a comprehensive technical explanation of the user module in Pentagos, including authentication, profile management, AI-powered features, and the full stack flow from frontend to backend to database and AI task processing.

## 2. Backend (Django)
### User Authentication & Registration
- **Files:** `accounts/views.py`, `accounts/serializers.py`, `accounts/models.py`, `accounts/urls.py`
- **Features:**
  - Register: `/api/accounts/register/` (POST)
  - Login: `/api/accounts/login/` (POST)
  - Logout: `/api/accounts/logout/` (POST)
  - Password Reset: `/api/accounts/password_reset/` (POST)
  - Profile CRUD: `/api/accounts/profile/` (GET/PUT/PATCH)

### OAuth (Google/GitHub)
- **Files:** `accounts/views.py`, `accounts/serializers.py`
- **Features:**
  - Google: `/api/accounts/google/` (POST)
  - GitHub: `/api/accounts/github/` (POST)
- **Flow:**
  - Frontend gets OAuth token from provider, sends to backend endpoint.
  - Backend verifies token, creates/updates user, returns auth token.

### UserProfile & ActivityLog Models
- **Files:** `accounts/models.py`
- **UserProfile:**
  - Extends Django user with fields: bio, avatar, personality, skills, stats, etc.
  - Linked via OneToOneField to User.
- **ActivityLog:**
  - Tracks user actions (login, AI generation, etc.)

### AI-Powered Features
- **Files:** `accounts/views.py`, `media_processing/tasks.py`, `accounts/models.py`
- **Features:**
  - Generate AI Bio: `/api/accounts/profile/generate_bio/` (POST)
  - Generate AI Avatar: `/api/accounts/profile/generate_avatar/` (POST)
  - Generate AI Personality: `/api/accounts/profile/generate_personality/` (POST)
  - Generate AI Skills: `/api/accounts/profile/generate_skills/` (POST)
- **Flow:**
  - Endpoint enqueues Celery task (see below), returns task ID.
  - User polls `/api/accounts/profile/` to check for updated AI fields.

### Celery Task Flow
- **Files:** `media_processing/tasks.py`
- **Tasks:**
  - `generate_user_avatar_task(user_id)`
  - `generate_user_bio_task(user_id)`
  - `generate_user_personality_task(user_id)`
  - `generate_user_skills_task(user_id)`
- **AI Providers:** Groq, HuggingFace, (optionally OpenAI)
- **Process:**
  - Task fetches user, calls AI provider, updates UserProfile, logs activity.

### API Endpoints
- **Routing:** `accounts/urls.py`
- **Serializers:** `accounts/serializers.py`
- **Views:** `accounts/views.py`

## 3. Frontend (Next.js)
### User Flows
- **Files:** `FrontOffice/app/login/page.tsx`, `register/page.tsx`, `reset-password/page.tsx`, `profile/page.tsx`
- **Features:**
  - Sign In, Sign Up, Password Reset, Profile Edit, Logout
  - OAuth via Google/GitHub
  - Trigger AI generation (bio, avatar, etc.)

### API Usage & User State Management
- **API Client:** `FrontOffice/lib/api.ts`
  - Handles all HTTP requests to backend endpoints.
- **User State:**
  - `FrontOffice/lib/currentUserStore.ts`: In-memory cache, dedupes fetches.
  - `FrontOffice/lib/CurrentUserProvider.tsx`: React context for user.
  - `FrontOffice/lib/useCurrentUser.ts`: Hook for accessing user in components.

### Polling for AI Task Completion
- After triggering AI generation, frontend polls `/api/accounts/profile/` to check for updated fields.
- UI updates when new AI-generated data is available.

## 4. Database Schema
### User & UserProfile Tables
- **User:** Standard Django user (username, email, password, etc.)
- **UserProfile:**
  - OneToOne with User
  - Fields: bio, avatar, personality, skills, stats, ai_task_status, etc.

### AI Fields & Data Flow
- AI fields are updated by Celery tasks and reflected in UserProfile.
- ActivityLog records each AI generation event.

## 5. AI Task Flow
1. User triggers AI generation from frontend (e.g., generate bio).
2. Frontend calls backend endpoint (e.g., `/api/accounts/profile/generate_bio/`).
3. Backend enqueues Celery task, returns task ID.
4. Celery worker runs AI provider, updates UserProfile.
5. User polls `/api/accounts/profile/` to get updated data.

## 6. Code References
### Backend
- `accounts/models.py`: UserProfile, ActivityLog
- `accounts/views.py`: Auth, profile, AI endpoints
- `accounts/serializers.py`: UserProfileSerializer, etc.
- `media_processing/tasks.py`: AI generation tasks
- `accounts/urls.py`: Endpoint routing

### Frontend
- `FrontOffice/lib/api.ts`: API client
- `FrontOffice/lib/currentUserStore.ts`: User cache
- `FrontOffice/lib/CurrentUserProvider.tsx`: User context
- `FrontOffice/lib/useCurrentUser.ts`: User hook
- `FrontOffice/app/login/page.tsx`, `register/page.tsx`, `reset-password/page.tsx`, `profile/page.tsx`: User flows

## 7. Sequence Diagrams
### Example: AI Bio Generation
```
User → Frontend: Clicks 'Generate Bio'
Frontend → Backend: POST /api/accounts/profile/generate_bio/
Backend → Celery: Enqueue generate_user_bio_task(user_id)
Celery → AI Provider: Generate bio
AI Provider → Celery: Return bio
Celery → DB: Update UserProfile.bio
Frontend → Backend: Poll /api/accounts/profile/
Backend → Frontend: Return updated bio
Frontend → User: Show new bio
```

## 8. Summary
The user module in Pentagos is a full-stack system integrating Django (backend), Next.js (frontend), PostgreSQL (database), and AI providers via Celery. All user authentication, profile, and AI-powered features are implemented with clear separation of concerns and robust API design. For code details, see the referenced files above.
