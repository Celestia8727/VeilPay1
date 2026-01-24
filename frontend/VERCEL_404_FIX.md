# Vercel 404 Fix Guide

## The Problem

Your Vercel deployment is showing 404 because it's looking for files in the wrong directory.

## Quick Fix - Update Vercel Settings

1. **Go to your Vercel dashboard**: https://vercel.com/vaibhav-rawat-ciphers-projects/veilpay

2. **Click "Settings"** (top navigation)

3. **Scroll to "Root Directory"**
   - Current: probably `.` or `D:\hacksproject2` (wrong!)
   - **Change to**: `frontend`
   - Click "Save"

4. **Scroll to "Build & Development Settings"**
   - **Build Command**: `npm install --legacy-peer-deps && npm run build`
   - **Install Command**: `npm install --legacy-peer-deps`
   - **Output Directory**: `.next` (should be auto-detected)

5. **Go to "Deployments" tab**
   - Click the "..." menu on the latest deployment
   - Click "Redeploy"

## Why This Fixes It

Your GitHub repo structure is:
```
hacksproject2/
├── frontend/          ← Your Next.js app is HERE
│   ├── package.json
│   ├── app/
│   └── ...
├── contracts/
└── ...
```

Vercel needs to know to look in the `frontend` folder, not the root!

## Alternative: Deploy Only Frontend

If the above doesn't work, you can:

1. **Delete the current Vercel project**
2. **Create a new one**
3. **When importing from GitHub**:
   - Select the repository
   - **Set Root Directory to `frontend`** during setup
   - This tells Vercel where your Next.js app lives

## Check If It Worked

After redeploying, visit your Vercel URL. You should see your PrivateVeil app, not a 404!

## Still Getting 404?

If you're still seeing 404 after setting root directory to `frontend`, check the deployment logs:
1. Go to Deployments tab
2. Click on the latest deployment
3. Look for errors in the build log
4. Share the error with me and I'll help fix it!
