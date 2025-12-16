# 🚂 Railway Deployment Guide

Deploy **EVERYTHING** to Railway - Backend + Frontend in one platform.

---

## Why Railway for Everything?

- ✅ **One platform** - Backend + Frontend together
- ✅ **$5/month** - Covers both services
- ✅ **Easy deployment** - Connect GitHub, done
- ✅ **Auto SSL** - HTTPS for free
- ✅ **CI/CD** - Auto-deploy on push
- ✅ **No bullshit** - Just works

**Total Cost: $5-10/month for entire stack**

---

## Architecture

```
Railway Project
├── Backend Service (Node.js API)
└── Frontend Service (React static site)
```

Both auto-deploy from same GitHub repo.

---

## Step 1: Prepare Repository

```bash
cd /home/empowertours/projects/empowertours-dev-studio

# Initialize git
git init

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
*.log
dist/
build/
.DS_Store
deployments/
cache/
artifacts/
typechain-types/
EOF

# Commit everything
git add .
git commit -m "Initial commit"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/empowertours-dev-studio.git
git push -u origin main
```

---

## Step 2: Deploy Backend to Railway

### Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repo

### Configure Backend Service

**Service Name:** `backend`

**Settings → Root Directory:**
```
backend
```

**Settings → Build Command:**
```
npm install
```

**Settings → Start Command:**
```
npm start
```

### Add Environment Variables

Click `Variables` tab:

```bash
NODE_ENV=production
PORT=3001
NETWORK=monadTestnet

# Monad
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
MONAD_MAINNET_RPC=https://rpc.monad.xyz

# Contracts (add after deploying contract)
STUDIO_CONTRACT_ADDRESS=
TOURS_TOKEN_ADDRESS=

# Backend wallet
BACKEND_PRIVATE_KEY=your_private_key

# Grok API
GROK_API_KEY=your_grok_api_key

# IPFS
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_API_KEY=your_pinata_secret

# JWT
JWT_SECRET=your_random_secret_min_32_chars

# Frontend URL (will add after frontend deploys)
FRONTEND_URL=
```

Railway will auto-deploy. Wait 2-3 minutes.

**Copy your backend URL:**
```
https://backend-production-xxxx.up.railway.app
```

Test it:
```bash
curl https://your-backend-url.railway.app/health
# Returns: {"status":"ok"}
```

---

## Step 3: Deploy Frontend to Railway

### Add Second Service

In same Railway project:
1. Click "New Service"
2. Select same GitHub repo
3. Railway will detect it's the same repo

### Configure Frontend Service

**Service Name:** `frontend`

**Settings → Root Directory:**
```
frontend
```

**Settings → Build Command:**
```
npm install && npm run build
```

**Settings → Start Command:**
```
npx serve -s build -l $PORT
```

### Install serve package

Add to `frontend/package.json`:
```json
{
  "dependencies": {
    "serve": "^14.2.1"
  }
}
```

Commit and push:
```bash
cd frontend
npm install serve --save
cd ..
git add .
git commit -m "Add serve for Railway deployment"
git push
```

### Add Frontend Environment Variables

In Railway frontend service → Variables:

```bash
REACT_APP_API_URL=https://your-backend-url.railway.app
REACT_APP_STUDIO_CONTRACT_ADDRESS=
REACT_APP_NETWORK=monadTestnet
```

Railway auto-redeploys.

**Copy your frontend URL:**
```
https://frontend-production-xxxx.up.railway.app
```

---

## Step 4: Link Backend to Frontend

Go to Railway → Backend → Variables:

Update:
```bash
FRONTEND_URL=https://your-frontend-url.railway.app
```

Railway auto-redeploys backend.

---

## Step 5: Deploy Smart Contract

```bash
cd contracts

# Create .env
cat > .env << 'EOF'
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
DEPLOYER_PRIVATE_KEY=your_private_key
TOURS_TOKEN_ADDRESS=your_tours_token_address
MONAD_SCAN_API_KEY=your_api_key
EOF

# Compile
npx hardhat compile

# Test
npx hardhat test

# Deploy to testnet
npx hardhat deploy --network monadTestnet

# Copy the deployed address!
# Example: 0x1234567890abcdef...
```

### Update Contract Address

**Railway Backend Variables:**
```
STUDIO_CONTRACT_ADDRESS=0x1234...
```

**Railway Frontend Variables:**
```
REACT_APP_STUDIO_CONTRACT_ADDRESS=0x1234...
```

Both auto-redeploy.

---

## Step 6: Test Everything

1. Visit your frontend: `https://your-frontend.railway.app`
2. Connect MetaMask (Monad Testnet)
3. Buy credits (100 testnet MON)
4. Generate a dApp
5. Deploy to testnet
6. Verify on MonadScan

---

## Railway Configuration Files

### backend/railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### frontend/railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npx serve -s build -p $PORT",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

Commit:
```bash
git add backend/railway.json frontend/railway.json
git commit -m "Add Railway configs"
git push
```

---

## Custom Domain Setup (Optional)

### Add Domain to Backend

1. Buy domain: `yourdomain.com`
2. Railway → Backend → Settings → Domains
3. Add: `api.yourdomain.com`
4. Add CNAME in your DNS:
   ```
   Type: CNAME
   Host: api
   Value: backend-production-xxxx.up.railway.app
   ```

### Add Domain to Frontend

1. Railway → Frontend → Settings → Domains
2. Add: `yourdomain.com`
3. Add CNAME in your DNS:
   ```
   Type: CNAME
   Host: @
   Value: frontend-production-xxxx.up.railway.app
   ```

**Done!**
- Frontend: `https://yourdomain.com`
- Backend: `https://api.yourdomain.com`

---

## Costs

### Railway Pricing

**Developer Plan: $5/month**
- $5 usage credits included
- Both services use ~$4-8/month combined
- **Effectively $0-3/month overage**

**Hobby Plan: $10/month (if needed)**
- $10 usage credits
- Plenty for moderate traffic

### Total Monthly Costs

```
Railway: $5-10
Pinata IPFS: $0 (free tier)
Grok API: $5 (pay-as-you-go)
Domain: $1 (optional)

TOTAL: $11-16/month
```

**vs Original Plan (VPS): $38/month**

**Savings: $22-27/month** ✅

---

## Monitoring

### View Logs

**Backend logs:**
```
Railway → Backend → Deployments → View Logs
```

**Frontend logs:**
```
Railway → Frontend → Deployments → View Logs
```

### Good Logs (Backend):
```
✅ Contract Manager initialized
✅ Grok Service initialized
✅ IPFS Service initialized
📡 Server running on port 3001
```

### Set Alerts

Railway → Project Settings → Notifications:
- Enable deployment failed alerts
- Enable crash alerts

---

## Mainnet Deployment

When ready:

1. **Deploy contract to mainnet:**
```bash
npx hardhat deploy --network monadMainnet
```

2. **Update Railway variables:**

Backend:
```
NETWORK=monadMainnet
STUDIO_CONTRACT_ADDRESS=new_mainnet_address
```

Frontend:
```
REACT_APP_NETWORK=monadMainnet
REACT_APP_STUDIO_CONTRACT_ADDRESS=new_mainnet_address
```

3. **Fund contract with TOURS:**
```bash
# Send 100,000 TOURS for airdrops
```

4. **Test with small amount**

5. **Go live!**

---

## Auto-Deploy Workflow

Every time you push to GitHub:

```bash
git add .
git commit -m "New feature"
git push
```

Railway automatically:
1. Detects changes
2. Rebuilds affected services
3. Runs tests
4. Deploys new version
5. Zero downtime switch

**CI/CD built in!** ✅

---

## Troubleshooting

### Backend won't start

Check Railway logs:
```
Railway → Backend → Deployments
```

Common issues:
- Missing env variables
- Wrong start command
- Port not set correctly

### Frontend shows blank page

Check build logs:
```
Railway → Frontend → Build Logs
```

Common issues:
- `npm run build` failed
- Missing `serve` package
- Wrong API URL

### CORS errors

Update backend `.env`:
```
FRONTEND_URL=https://your-actual-frontend.railway.app
```

Make sure CORS is configured in `backend/src/server.js`:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

---

## Project Structure

```
empowertours-dev-studio/
├── backend/              (Railway Service 1)
│   ├── src/
│   ├── package.json
│   └── railway.json
├── frontend/             (Railway Service 2)
│   ├── src/
│   ├── package.json
│   └── railway.json
├── contracts/            (Deploy locally)
│   ├── contracts/
│   ├── test/
│   └── hardhat.config.js
└── README.md
```

---

## Quick Commands

```bash
# View Railway logs (if Railway CLI installed)
railway logs

# Or use web dashboard
# Railway → Service → Deployments → Logs

# Deploy both services
git push

# Check status
# Railway dashboard → Services

# Test backend
curl https://backend-xxx.railway.app/health

# Test frontend
curl https://frontend-xxx.railway.app
```

---

## Final Checklist

### Testnet Launch
- [ ] Railway account created
- [ ] GitHub repo connected
- [ ] Backend deployed on Railway
- [ ] Frontend deployed on Railway
- [ ] Smart contract deployed to testnet
- [ ] All environment variables set
- [ ] Can connect wallet
- [ ] Can buy credits
- [ ] Can generate dApp
- [ ] Testnet deployment works

### Mainnet Launch
- [ ] Tested 1+ week on testnet
- [ ] No errors in logs
- [ ] Contract deployed to mainnet
- [ ] Variables updated to mainnet
- [ ] Funded with TOURS
- [ ] Custom domain (optional)
- [ ] Ready to go live!

---

## Total Deployment Time

- Railway setup: **20 minutes**
- Contract deployment: **15 minutes**
- Testing: **30 minutes**

**Total: 65 minutes (just over 1 hour)** ⚡

---

## Why Railway > Everything Else

| Feature | Railway | VPS | Vercel+AWS |
|---------|---------|-----|------------|
| Setup time | 1 hour | 4 hours | 3 hours |
| Monthly cost | $5-10 | $38 | $20+ |
| Auto-deploy | ✅ | ❌ | ✅ |
| SSL | ✅ Free | Manual | ✅ Free |
| Scaling | ✅ Auto | Manual | ✅ Auto |
| Logs | ✅ Easy | SSH needed | Split |
| Monitoring | ✅ Built-in | Manual | Manual |

**Railway wins.** 🏆

---

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Monad Docs: https://docs.monad.xyz

---

## Ready to Deploy?

1. ✅ Sign up: https://railway.app
2. ✅ Connect GitHub repo
3. ✅ Deploy backend service
4. ✅ Deploy frontend service
5. ✅ Deploy smart contract
6. ✅ Test on testnet
7. ✅ Go to mainnet
8. ✅ Print money 💰

**Let's fucking ship it! 🚀**
