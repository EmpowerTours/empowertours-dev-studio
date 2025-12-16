# 🚀 Correct Deployment Order

## The Right Order:

1. Push code to GitHub
2. Deploy to Railway (get URLs)
3. Create GitHub App (using Railway URLs)
4. Add GitHub App credentials to Railway

---

## Step 1: Push to GitHub (5 min)

```bash
cd /home/empowertours/projects/empowertours-dev-studio

# Initialize git
git init

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
*.log
build/
dist/
.DS_Store
cache/
artifacts/
deployments/
typechain-types/
EOF

# Add all files
git add .
git commit -m "Initial commit - EmpowerTours Dev Studio"

# Create repo on GitHub
# Go to: https://github.com/new
# Name: empowertours-dev-studio
# Public or Private
# Don't initialize with README
# Click "Create repository"

# Push
git remote add origin https://github.com/YOUR_USERNAME/empowertours-dev-studio.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy to Railway (15 min)

### 2.1: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project"

### 2.2: Deploy Backend

1. Click "Deploy from GitHub repo"
2. Select `empowertours-dev-studio`
3. Railway detects Node.js project

**Configure Backend:**

- Service name: `backend`
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`

**Add Environment Variables:**

```bash
NODE_ENV=production
PORT=3001
NETWORK=monadTestnet

# Monad
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
MONAD_MAINNET_RPC=https://rpc.monad.xyz

# Contracts (leave empty for now)
STUDIO_CONTRACT_ADDRESS=
TOURS_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000

# Backend wallet
BACKEND_PRIVATE_KEY=your_private_key_here

# Grok API
GROK_API_KEY=your_grok_api_key_here

# IPFS (optional for now)
PINATA_API_KEY=
PINATA_SECRET_API_KEY=

# JWT
JWT_SECRET=your_random_32_char_secret_here

# Frontend URL (will add after frontend deploys)
FRONTEND_URL=

# GitHub App (will add in Step 4)
GITHUB_APP_CLIENT_ID=
GITHUB_APP_CLIENT_SECRET=
```

Railway deploys automatically.

**Copy Backend URL:**
```
https://backend-production-xxxx.up.railway.app
```

Save this! You'll need it.

### 2.3: Deploy Frontend

In same Railway project:

1. Click "New Service"
2. Select same GitHub repo
3. Service name: `frontend`

**Configure Frontend:**

- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Start command: `npx serve -s build -l $PORT`

**Add to frontend/package.json first:**

```bash
cd frontend
npm install serve --save
cd ..
git add .
git commit -m "Add serve for Railway"
git push
```

**Add Environment Variables:**

```bash
REACT_APP_API_URL=https://backend-production-xxxx.up.railway.app
REACT_APP_STUDIO_CONTRACT_ADDRESS=
REACT_APP_NETWORK=monadTestnet
```

Railway auto-deploys.

**Copy Frontend URL:**
```
https://frontend-production-xxxx.up.railway.app
```

Save this too!

### 2.4: Link Backend to Frontend

Go to Railway → Backend → Variables:

Update:
```bash
FRONTEND_URL=https://frontend-production-xxxx.up.railway.app
```

---

## Step 3: Create GitHub App (10 min)

NOW you can create the GitHub App with real URLs!

Go to: https://github.com/settings/apps/new

### Fill in the form:

**GitHub App name:**
```
EmpowerTours Dev Studio
```

**Description:**
```
AI-powered dApp generator for Monad blockchain
```

**Homepage URL:**
```
https://frontend-production-xxxx.up.railway.app
(use your actual Railway frontend URL)
```

**Callback URL:**
```
https://frontend-production-xxxx.up.railway.app/github/callback
(use your actual Railway frontend URL)
```

**Setup URL:**
- Leave blank

**Webhook:**
- ❌ **Uncheck "Active"** (we don't need webhooks)

**Permissions → Repository permissions:**
- **Contents:** Read & Write
- **Metadata:** Read-only

**Subscribe to events:**
- None needed (webhook is disabled)

**Where can this GitHub App be installed?:**
- ✅ **Any account** (so users can install it)

Click **"Create GitHub App"**

### Get Credentials:

After creation:

1. **Client ID** is shown on page
   - Copy it: `Iv1.xxxxxxxxxxxxx`

2. **Generate client secret:**
   - Click "Generate a new client secret"
   - Copy immediately: `xxxxxxxxxxxxxxxxxxxxxx`

---

## Step 4: Add GitHub Credentials to Railway (5 min)

Go to Railway → Backend → Variables:

Add:
```bash
GITHUB_APP_CLIENT_ID=Iv1.your_client_id_here
GITHUB_APP_CLIENT_SECRET=your_client_secret_here
```

Railway auto-redeploys backend.

---

## Step 5: Deploy Smart Contract (10 min)

```bash
cd contracts

# Create .env
cat > .env << 'EOF'
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
DEPLOYER_PRIVATE_KEY=your_metamask_private_key
TOURS_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
MONAD_SCAN_API_KEY=abc123
EOF

# Compile
npx hardhat compile

# Test
npx hardhat test

# Deploy to TESTNET
npx hardhat deploy --network monadTestnet

# Copy the deployed address!
# Example: 0x1234567890abcdef...
```

### Update Contract Address in Railway:

**Backend Variables:**
```
STUDIO_CONTRACT_ADDRESS=0x1234567890abcdef...
```

**Frontend Variables:**
```
REACT_APP_STUDIO_CONTRACT_ADDRESS=0x1234567890abcdef...
```

Both auto-redeploy.

---

## Step 6: Test Everything! (10 min)

1. Visit your frontend: `https://frontend-production-xxxx.up.railway.app`

2. **Test wallet connection:**
   - Connect MetaMask
   - Switch to Monad Testnet

3. **Test credit purchase:**
   - Buy 1 credit (100 testnet MON)
   - Or use owner function to give yourself credits

4. **Test generation:**
   - Generate a simple NFT platform
   - View generated code

5. **Test GitHub push:**
   - Click "Push to GitHub"
   - Authorize the app
   - Create repo
   - Verify code appears in GitHub

6. **Test testnet deployment:**
   - Use Testnet Preview tab
   - Deploy generated contract
   - Verify on MonadScan

---

## Summary of URLs

After deployment, you'll have:

```
Frontend: https://frontend-production-xxxx.up.railway.app
Backend:  https://backend-production-xxxx.up.railway.app
Contract: 0x1234...5678 (on Monad Testnet)
GitHub:   github.com/settings/apps/your-app-name
```

---

## Troubleshooting

### Backend won't start

Check Railway logs:
```
Railway → Backend → Deployments → Logs
```

Common issues:
- Missing environment variables
- Wrong start command
- Port not configured

### Frontend shows blank page

Check build succeeded:
```
Railway → Frontend → Deployments → Build logs
```

Make sure you added `serve` package.

### GitHub callback fails

Double-check callback URL matches EXACTLY:
```
GitHub App callback URL = https://your-actual-frontend.railway.app/github/callback
```

---

## Total Time: ~1 hour

- GitHub repo: 5 min
- Railway deployment: 25 min
- GitHub App creation: 10 min
- Add credentials: 5 min
- Deploy contract: 10 min
- Testing: 10 min

**TOTAL: ~65 minutes**

---

## Next Steps After Testing

1. **Test for 1 week on testnet**
2. **Deploy contract to mainnet**
3. **Update Railway env vars to mainnet**
4. **Optional: Add custom domain**
5. **Launch publicly!**

Ready to start with Step 1?
