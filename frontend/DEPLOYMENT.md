# Deploy PrivateVeil Farcaster Mini App to Vercel

## Quick Deployment Steps

### Step 1: Fix Vercel Configuration

The `vercel.json` file has been created, but Vercel needs the build command in the dashboard instead.

### Step 2: Deploy via Vercel Dashboard (Easier!)

1. **Go to** https://vercel.com/new

2. **Import Git Repository** (recommended):
   - Connect your GitHub account
   - Import the `hacksproject2` repository
   - Select the `frontend` folder as root directory
   
   OR
   
   **Upload folder directly**:
   - Click "Deploy" without Git
   - Upload the `frontend` folder

3. **Configure Build Settings**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend` (if importing full repo)
   - **Build Command**: `npm install --legacy-peer-deps && npm run build`
   - **Install Command**: `npm install --legacy-peer-deps`
   - **Output Directory**: `.next`

4. **Add Environment Variables**:
   Click "Environment Variables" and add all from your `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://qsswoshsltnhcqiwopyu.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   NEXT_PUBLIC_REGISTRY_ADDRESS=0x30892966D7D4AA2A4db11c9D1e67710DdD5F737e
   NEXT_PUBLIC_VAULT_ADDRESS=0x78023B7FDA8acf600e0EE866418755c95CDaa94F
   NEXT_PUBLIC_COMMITMENT_ADDRESS=0x399F6232A83216F34623F8517217340DF9067fBb
   NEXT_PUBLIC_VERIFIER_ADDRESS=0xa9f47927b79F74E74bAa9B186F6ed096f67C5DB0
   NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
   NEXT_PUBLIC_CHAIN_ID=10143
   NEXT_PUBLIC_PLATFORM_ADDRESS=0x3319148cB4324b0fbBb358c93D52e0b7f3fe4bc9
   NEXT_PUBLIC_USDC_ADDRESS=0x534b2f3A21130d7a60830c2Df862319e593943A3
   NEXT_PUBLIC_URL=https://veilpay.vercel.app (will be your actual URL)
   ```

5. **Click "Deploy"**

6. **Wait for build** (2-3 minutes)

7. **Get your URL**: `https://veilpay-xxx.vercel.app`

### Step 3: Update NEXT_PUBLIC_URL

After deployment:

1. Go to Vercel dashboard → Your project → Settings → Environment Variables
2. Update `NEXT_PUBLIC_URL` with your actual Vercel URL
3. Redeploy (Deployments tab → click "..." → Redeploy)

### Step 4: Test in Warpcast

1. **Visit**: https://warpcast.com/~/developers/mini-apps/embed
2. **Enter your Vercel URL**: `https://veilpay-xxx.vercel.app`
3. **Click "Refetch"**
4. **See your mini app!** 🎉

You should see:
- Farcaster user info card
- All PrivateVeil features working
- Share buttons after actions

---

## Alternative: Test Locally First

If you want to skip deployment and just see it working:

### Option 1: Just Use Browser
1. Open http://localhost:3000/register-domain
2. The app works - Farcaster features are just hidden
3. Everything functions normally

### Option 2: Use Ngrok (Requires Free Signup)
1. Sign up at https://dashboard.ngrok.com/signup
2. Get your auth token
3. Run:
   ```bash
   npx ngrok config add-authtoken YOUR_TOKEN
   npx ngrok http 3000
   ```
4. Use the HTTPS URL in Warpcast embed tool

---

## What's Ready

✅ All code is complete and working
✅ Farcaster SDK integrated
✅ All 4 pages adapted
✅ Share actions implemented
✅ Ready for deployment

The only issue is the Vercel CLI build command - using the dashboard is easier!
