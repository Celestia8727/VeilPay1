# Railway Deployment - Payment Indexer

This directory contains the standalone indexer for Railway deployment.

## Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

## Manual Setup

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Service**
   - Root Directory: `/` (or `/indexer` if you separate it)
   - Start Command: `node indexer/payment-indexer.js`

4. **Add Environment Variables**
   ```
   MONAD_RPC_URL=https://testnet-rpc.monad.xyz
   SUPABASE_URL=https://qsswoshsltnhcqiwopyu.supabase.co
   SUPABASE_SERVICE_KEY=your-service-key-here
   NEXT_PUBLIC_VAULT_ADDRESS=0x78023B7FDA8acf600e0EE866418755c95CDaa94F
   ```

5. **Deploy**
   - Railway will automatically deploy
   - Service will run 24/7

## Cost

- **Free Trial:** $5 credit (enough for ~1 month)
- **After Trial:** ~$5/month for 24/7 operation

## Monitoring

View logs in Railway dashboard to monitor indexer activity.
