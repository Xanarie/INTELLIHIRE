# IntelliHire Deployment Guide

## ✅ Frontend Deployed
Your frontend is live at: **https://intellihire-system.web.app**

## Backend Deployment Options

### Option 1: Google Cloud Run (Recommended)

1. **Install Google Cloud CLI**
   - Download from: https://cloud.google.com/sdk/docs/install
   - Follow the installation wizard

2. **Deploy Backend**
   ```bash
   # Login to Google Cloud
   gcloud auth login
   
   # Set your project
   gcloud config set project intellihire-system
   
   # Deploy to Cloud Run
   gcloud run deploy intellihire-backend \
     --source backend \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars="FIREBASE_PROJECT_ID=intellihire-system"
   ```

3. **Update Frontend Environment**
   After deployment, you'll get a URL like: `https://intellihire-backend-xxx.run.app`
   
   Update `frontend/.env.production`:
   ```
   VITE_API_URL=https://intellihire-backend-xxx.run.app/api/admin
   VITE_API_PUBLIC_URL=https://intellihire-backend-xxx.run.app
   ```

4. **Rebuild and Redeploy Frontend**
   ```bash
   cd frontend
   npm run build
   cd ..
   firebase deploy --only hosting
   ```

### Option 2: Render.com (Free Tier)

1. Go to https://render.com and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - Name: `intellihire-backend`
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables from `backend/.env`
6. Deploy!

### Option 3: Railway.app (Free Tier)

1. Go to https://railway.app and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect Python and deploy
5. Add environment variables
6. Get your deployment URL

## Environment Variables

Make sure to set these in your backend deployment:
- `FIREBASE_PROJECT_ID`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- Any other variables from `backend/.env`

## Quick Redeploy Commands

**Frontend only:**
```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

**Both (after backend is set up):**
```bash
# Build frontend
cd frontend
npm run build
cd ..

# Deploy frontend
firebase deploy --only hosting

# Deploy backend (Cloud Run)
gcloud run deploy intellihire-backend --source backend --region us-central1
```

## Troubleshooting

- **CORS errors**: Make sure your backend allows requests from `https://intellihire-system.web.app`
- **API not found**: Check that your API URLs in `.env.production` match your deployed backend
- **Build errors**: Run `npm install` in frontend directory first

## Current Status

✅ Frontend: https://intellihire-system.web.app
⏳ Backend: Needs deployment (choose option above)
