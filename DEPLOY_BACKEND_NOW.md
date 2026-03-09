# Deploy Your Backend - Quick Guide

## Option 1: Render.com (Easiest - 5 minutes)

### Step 1: Sign Up & Create Service
1. Go to https://render.com
2. Sign up with GitHub (recommended) or email
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repository (or use "Public Git repository" if not on GitHub)

### Step 2: Configure Service
Fill in these settings:
- **Name**: `intellihire-backend`
- **Region**: Choose closest to you
- **Branch**: `main` (or your default branch)
- **Root Directory**: `backend`
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Step 3: Add Environment Variables
Click "Advanced" → "Add Environment Variable" and add:

```
FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json
FRONTEND_URL=https://intellihire-system.web.app
```

### Step 4: Deploy
1. Click **"Create Web Service"**
2. Wait 3-5 minutes for deployment
3. Copy your service URL (looks like: `https://intellihire-backend-xxxx.onrender.com`)

### Step 5: Update Frontend & Redeploy
Once you have your backend URL, run these commands:

```bash
# 1. Update frontend environment
# Edit frontend/.env.production with your backend URL

# 2. Build frontend
cd frontend
npm run build

# 3. Deploy to Firebase
cd ..
firebase deploy --only hosting
```

---

## Option 2: Railway.app (Also Easy)

### Step 1: Sign Up
1. Go to https://railway.app
2. Sign up with GitHub

### Step 2: Deploy
1. Click **"New Project"** → **"Deploy from GitHub repo"**
2. Select your repository
3. Railway auto-detects Python and deploys

### Step 3: Configure
1. Go to **Variables** tab
2. Add environment variables:
   - `FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json`
   - `FRONTEND_URL=https://intellihire-system.web.app`
3. Go to **Settings** → **Networking** → **Generate Domain**

### Step 4: Update Frontend
Same as Option 1, Step 5

---

## Option 3: Google Cloud Run (Most Scalable)

### Prerequisites
```bash
# Install Google Cloud CLI
# Download from: https://cloud.google.com/sdk/docs/install
```

### Deploy Commands
```bash
# 1. Login
gcloud auth login

# 2. Set project
gcloud config set project intellihire-system

# 3. Deploy
gcloud run deploy intellihire-backend \
  --source backend \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json,FRONTEND_URL=https://intellihire-system.web.app"
```

### Update Frontend
Same as Option 1, Step 5

---

## After Backend is Deployed

### Update Frontend Environment
Edit `frontend/.env.production`:

```env
VITE_API_URL=https://YOUR-BACKEND-URL/api/admin
VITE_API_PUBLIC_URL=https://YOUR-BACKEND-URL
```

Replace `YOUR-BACKEND-URL` with your actual backend URL from Render/Railway/Cloud Run.

### Rebuild & Redeploy Frontend
```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

### Verify Deployment
1. Go to https://intellihire-system.web.app/admin
2. Dashboard should now show data!

---

## Troubleshooting

### CORS Errors
If you see CORS errors in browser console, check that your backend's `FRONTEND_URL` environment variable is set to `https://intellihire-system.web.app`

### 404 Errors
Make sure your API URLs in `.env.production` include the correct paths:
- Admin API: `/api/admin`
- Public API: root URL

### Build Errors
```bash
cd frontend
npm install
npm run build
```

---

## Quick Reference

**Your Frontend URL**: https://intellihire-system.web.app
**Your Backend URL**: (Get this after deploying to Render/Railway/Cloud Run)

**Redeploy Frontend Only**:
```bash
cd frontend && npm run build && cd .. && firebase deploy --only hosting
```
