# PentaArt Frontend Deployment Guide

## 🏗️ Architecture Overview

Your PentaArt project has two separate parts:

### 1. **Backend (Django)** ✅ Already Deployed
- **Technology**: Django + Django REST Framework
- **Local**: `http://localhost:8000`
- **Production**: `https://pentagos-django.onrender.com`
- **Serves**: REST API, Admin panel, Authentication

### 2. **Frontend (Next.js)** ❌ Needs Deployment
- **Technology**: Next.js 14 + React 19
- **Local**: `http://localhost:3000`
- **Production**: Not deployed yet
- **Location**: `FrontOffice/` directory

---

## 🚀 Deploy Frontend to Vercel (RECOMMENDED)

Vercel is made by the creators of Next.js and is the easiest deployment option.

### Step 1: Install Vercel CLI (Optional)
```bash
npm install -g vercel
```

### Step 2: Deploy via Vercel Dashboard (Easiest)

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **"Add New Project"**
3. Import your GitHub repository: `Sarahenia20/Pentagos_Django`
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `FrontOffice`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   
5. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL` = `https://pentagos-django.onrender.com/api`
   - `NEXT_PUBLIC_BACKEND_URL` = `https://pentagos-django.onrender.com`
   - `NEXT_PUBLIC_API_BASE` = `https://pentagos-django.onrender.com`

6. Click **Deploy**

### Step 3: Update Django CORS Settings

Once deployed, you'll get a URL like `https://pentaart.vercel.app`

Update your Django backend on Render:
1. Go to Render Dashboard → `pentaart-django` → Environment
2. Update these variables:
   - `CORS_ALLOWED_ORIGINS` = `https://pentaart.vercel.app,https://pentagos-django.onrender.com`
   - `FRONTEND_URL` = `https://pentaart.vercel.app`
3. Save and redeploy

---

## 🔄 Alternative: Deploy Frontend to Render

If you prefer to keep everything on Render:

### Create `render-frontend.yaml`:
```yaml
services:
  - type: web
    name: pentaart-frontend
    runtime: node
    buildCommand: cd FrontOffice && npm install && npm run build
    startCommand: cd FrontOffice && npm start
    envVars:
      - key: NEXT_PUBLIC_API_URL
        value: https://pentagos-django.onrender.com/api
      - key: NEXT_PUBLIC_BACKEND_URL
        value: https://pentagos-django.onrender.com
      - key: NEXT_PUBLIC_API_BASE
        value: https://pentagos-django.onrender.com
      - key: NODE_VERSION
        value: 18.17.0
```

---

## 🧪 Local Development Setup

### Backend (Django):
```bash
# Terminal 1 - Backend
cd c:\Users\chama\Documents\Pentagos\Pentagos_Django
python manage.py runserver
# Runs on http://localhost:8000
```

### Frontend (Next.js):
```bash
# Terminal 2 - Frontend
cd c:\Users\chama\Documents\Pentagos\Pentagos_Django\FrontOffice
npm install
npm run dev
# Runs on http://localhost:3000
```

### Environment Variables for Local Dev:
Create `FrontOffice/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

---

## 📝 Current Deployment Status

| Component | Status | URL |
|-----------|--------|-----|
| Backend (Django) | ✅ Deployed | https://pentagos-django.onrender.com |
| Frontend (Next.js) | ❌ Not deployed | - |

---

## 🔗 URLs After Full Deployment

- **Frontend (User App)**: `https://pentaart.vercel.app` (or your custom domain)
- **Backend API**: `https://pentagos-django.onrender.com/api`
- **Admin Panel**: `https://pentagos-django.onrender.com/admin`

---

## ⚠️ Important Notes

1. **The Django backend runs on port 8000 locally** but on Render it uses the standard HTTPS port (443)
2. **The Next.js frontend runs on port 3000 locally** but will use standard ports in production
3. **They are separate applications** that communicate via API calls
4. **CORS must be configured** on the Django backend to allow requests from the frontend domain
5. **Environment variables** must be set correctly on both deployments

---

## 🎯 Next Steps

1. ✅ Backend deployed and running
2. ⏳ Create superuser on Render (set env vars)
3. ⏳ Deploy frontend to Vercel
4. ⏳ Update CORS settings with frontend URL
5. ⏳ Test full application flow
