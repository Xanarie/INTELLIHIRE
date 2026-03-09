# Deploy Backend to Firebase (Cloud Run)

Firebase App Hosting uses Google Cloud Run under the hood. Here's how to deploy:

## Step 1: Install Google Cloud CLI

Download and install from: https://cloud.google.com/sdk/docs/install

For Windows:
1. Download the installer: https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe
2. Run the installer
3. Follow the prompts
4. Restart your terminal after installation

## Step 2: Initialize and Login

```bash
# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project intellihire-system

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

## Step 3: Deploy Backend to Cloud Run

```bash
# Navigate to backend directory
cd backend

# Deploy to Cloud Run
gcloud run deploy intellihire-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars="FRONTEND_URL=https://intellihire-system.web.app"
```

This will:
- Build your Docker container
- Push it to Google Container Registry
- Deploy to Cloud Run
- Give you a URL like: `https://intellihire-backend-xxx.run.app`

## Step 4: Update Frontend Configuration

After deployment, update `frontend/.env.production` with your new backend URL:

```env
VITE_API_URL=https://intellihire-backend-xxx.run.app/api/admin
VITE_API_PUBLIC_URL=https://intellihire-backend-xxx.run.app
```

Then rebuild and redeploy frontend:

```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

## Step 5: Set Environment Variables (if needed)

If you need to add Cloudinary or other secrets:

```bash
gcloud run services update intellihire-backend \
  --region us-central1 \
  --set-env-vars="CLOUDINARY_CLOUD_NAME=your_value,CLOUDINARY_API_KEY=your_key"
```

Or use Secret Manager for sensitive data:

```bash
# Create a secret
echo -n "your-secret-value" | gcloud secrets create cloudinary-api-secret --data-file=-

# Grant access to Cloud Run
gcloud secrets add-iam-policy-binding cloudinary-api-secret \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Update service to use secret
gcloud run services update intellihire-backend \
  --region us-central1 \
  --set-secrets="CLOUDINARY_API_SECRET=cloudinary-api-secret:latest"
```

## Alternative: Continue Using Render

If you prefer to keep using Render (simpler, no CLI needed):

1. Go to https://dashboard.render.com
2. Find your service
3. Go to "Environment" tab
4. Add: `FRONTEND_URL=https://intellihire-system.web.app`
5. Click "Manual Deploy" → "Deploy latest commit"

Your backend will restart with the updated CORS settings.

## Troubleshooting

**Build fails:**
- Check that all dependencies in requirements.txt are compatible
- Increase memory if needed: `--memory 4Gi`

**CORS errors:**
- Verify FRONTEND_URL environment variable is set
- Check that main.py includes your Firebase hosting URL in CORS origins

**Cold starts:**
- Set `--min-instances 1` to keep one instance always warm (costs more)
