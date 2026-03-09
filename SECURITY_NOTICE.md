# Security Notice

## Critical: Firebase Credentials

The file `backend/serviceAccountKey.json` contains sensitive Firebase credentials and should NEVER be committed to version control.

### What to do:

1. **Remove from Git History** (if already committed):
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch backend/serviceAccountKey.json" \
     --prune-empty --tag-name-filter cat -- --all
   
   git push origin --force --all
   ```

2. **Verify it's in .gitignore**:
   The file is already listed in `.gitignore`, but double-check:
   ```
   backend/serviceAccountKey.json
   serviceAccountKey.json
   **/serviceAccountKey.json
   ```

3. **For Production Deployment**:
   - Store credentials as environment variables or secrets
   - Use Firebase App Hosting secrets (already configured in `apphosting.yaml`)
   - Never hardcode credentials in code

4. **Rotate Credentials**:
   If the credentials were exposed:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Generate a new private key
   - Delete the old service account key
   - Update your local `.env` file

### Environment Variables

All sensitive configuration should be in `.env` files (which are also gitignored):

```bash
# backend/.env
FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

See `backend/.env.example` for the template.
