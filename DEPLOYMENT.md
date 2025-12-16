# EmpowerTours Dev Studio - Deployment Guide

## 🚀 Complete Deployment Guide for Monad Blockchain

This guide covers testnet testing and mainnet deployment with **exact costs** and **time estimates**.

---

## 📊 Cost Breakdown

### Smart Contract Deployment

**Contract: EmpowerToursDevStudio.sol**

| Item | Gas | Cost (MON) | Cost (USD) |
|------|-----|------------|------------|
| Contract Deployment | 2,400,000 | 0.24 MON | $0.0048 |
| Fund Contract with MON | 21,000 | 0.0021 MON | $0.000042 |
| **Total Contract Deployment** | **2,421,000** | **0.2421 MON** | **$0.004842** |

**Assumptions:**
- Gas Price: 100 gwei (Monad standard)
- MON Price: $0.02 USD
- Network: Monad Testnet → Mainnet

### Backend Infrastructure (Monthly)

| Service | Cost/Month | Notes |
|---------|------------|-------|
| VPS (2 vCPU, 4GB RAM) | $12 | DigitalOcean/Hetzner |
| Domain + SSL | $1.50 | Namecheap + Let's Encrypt |
| Pinata IPFS (1GB) | $0 - $20 | Free tier → Paid |
| Grok API Credits | ~$5 | Pay-as-you-go |
| **Total Monthly** | **$18.50 - $38.50** | |

### One-Time Setup Costs

| Item | Cost | Notes |
|------|------|-------|
| Domain registration | $12/year | .com domain |
| TOURS token for airdrops | $200 | 100,000 TOURS @ $0.002 |
| Testnet MON (free) | $0 | Faucet |
| Mainnet deployment | $0.0048 | See above |
| **Total One-Time** | **~$212** | |

### Revenue Projections

**Per Generation:**
- Revenue: 100 MON = $2.00
- Cost: ~$0.005 (Grok API + gas)
- **Net Profit: $1.995 per generation**
- **Margin: 99.75%**

**Break-Even Analysis:**
- Total setup cost: $212
- Profit per generation: $1.995
- **Break-even: 107 generations**
- At 5 generations/day: **21 days to break even**
- At 10 generations/day: **11 days to break even**

**3-Month Projections:**

| Scenario | Gens/Day | Total Gens | Revenue | Costs | Net Profit |
|----------|----------|------------|---------|-------|------------|
| Conservative | 5 | 450 | $900 | $214.50 | **$685.50** |
| Moderate | 10 | 900 | $1,800 | $216 | **$1,584** |
| Aggressive | 25 | 2,250 | $4,500 | $223.50 | **$4,276.50** |

---

## ⏱️ Time Estimates

### Initial Deployment
- [ ] Environment setup: **30 minutes**
- [ ] Smart contract deployment (testnet): **15 minutes**
- [ ] Backend deployment: **1 hour**
- [ ] Frontend deployment: **45 minutes**
- [ ] DNS configuration: **15 minutes**
- [ ] Testing: **1 hour**
- **Total: ~3.5 hours**

### Mainnet Deployment
- [ ] Final testing on testnet: **2 hours**
- [ ] Contract deployment to mainnet: **15 minutes**
- [ ] Backend env update: **10 minutes**
- [ ] Frontend env update: **10 minutes**
- [ ] Final smoke tests: **30 minutes**
- **Total: ~3.5 hours**

**Grand Total: ~7 hours** (can be done in 1 day)

---

## 🎯 Step-by-Step Deployment

## Phase 1: Testnet Deployment (Week 1)

### 1. Prerequisites

**Required Accounts:**
- [ ] Monad testnet wallet with test MON
- [ ] Grok API key from x.ai
- [ ] Pinata account for IPFS
- [ ] GitHub account
- [ ] VPS provider account (DigitalOcean/Hetzner)

**Get Testnet MON:**
```bash
# Visit Monad testnet faucet
https://faucet.monad.xyz

# Request test MON for your wallet
# You'll need ~1 MON for testing
```

**Get API Keys:**
1. Grok API: https://x.ai → API keys
2. Pinata: https://pinata.cloud → API keys
3. MonadScan: https://testnet.monadscan.com → Get API key

### 2. Clone and Setup

```bash
# Clone repository
cd /home/empowertours/projects
git init empowertours-dev-studio
cd empowertours-dev-studio

# Copy all files from our build
# (All files are already created)

# Install dependencies
cd contracts
npm install

cd ../backend
npm install

cd ../frontend
npm install
```

### 3. Configure Environment Variables

**contracts/.env:**
```bash
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
MONAD_MAINNET_RPC=https://rpc.monad.xyz
DEPLOYER_PRIVATE_KEY=your_private_key_here
TOURS_TOKEN_ADDRESS=0x... # Get from TOURS token contract
MONAD_SCAN_API_KEY=your_monadscan_api_key
```

**backend/.env:**
```bash
PORT=3001
NODE_ENV=development
NETWORK=monadTestnet

# Monad Network
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
MONAD_MAINNET_RPC=https://rpc.monad.xyz

# Contracts
STUDIO_CONTRACT_ADDRESS=# Will be filled after deployment
TOURS_TOKEN_ADDRESS=0x...

# Backend Wallet (for minting NFTs)
BACKEND_PRIVATE_KEY=your_backend_private_key

# Grok API
GROK_API_KEY=your_grok_api_key_from_x_ai

# IPFS (Pinata)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret

# JWT
JWT_SECRET=generate_random_secret_here

# Frontend
FRONTEND_URL=http://localhost:3000
```

**frontend/.env:**
```bash
REACT_APP_API_URL=http://localhost:3001
REACT_APP_STUDIO_CONTRACT_ADDRESS=# Will be filled after deployment
REACT_APP_NETWORK=monadTestnet
```

### 4. Deploy Smart Contract to Testnet

```bash
cd contracts

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to testnet
npx hardhat deploy --network monadTestnet

# You'll see output like:
# ✅ Contract deployed to: 0x1234...5678
# Copy this address!
```

**Update environment files with deployed address:**
- Update `backend/.env` → `STUDIO_CONTRACT_ADDRESS`
- Update `frontend/.env` → `REACT_APP_STUDIO_CONTRACT_ADDRESS`

### 5. Verify Contract on MonadScan

```bash
# Verify contract (makes it readable on explorer)
npx hardhat verify --network monadTestnet <CONTRACT_ADDRESS> <TOURS_TOKEN_ADDRESS>

# Check verification:
# https://testnet.monadscan.com/address/<CONTRACT_ADDRESS>
```

### 6. Fund Contract with TOURS Tokens

```bash
# You need to send TOURS tokens to the contract for airdrops
# Send 100,000 TOURS to contract address

# Or use the fundTOURS function:
# Call contract.fundTOURS(ethers.parseEther("100000"))
# via Hardhat console or frontend
```

### 7. Start Backend Server

```bash
cd backend

# Development mode
npm run dev

# You should see:
# 🚀 EmpowerTours Dev Studio Backend
# 📡 Server running on port 3001
# ✅ Contract Manager initialized
# ✅ Grok Service initialized
# ✅ IPFS Service initialized
```

Test backend:
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok"}
```

### 8. Start Frontend

```bash
cd frontend

# Development mode
npm start

# Browser should open: http://localhost:3000
```

### 9. Test Complete Flow on Testnet

**Testing Checklist:**
- [ ] Connect wallet to Monad Testnet
- [ ] Buy credits with testnet MON
- [ ] Generate a simple dApp (try NFT Platform)
- [ ] View generated code
- [ ] Deploy to testnet using Testnet Preview
- [ ] Verify contract on explorer
- [ ] Check IPFS upload
- [ ] Mint whitelist NFT (if eligible)
- [ ] Test discount for whitelisted user
- [ ] Check TOURS airdrop

**Expected Results:**
- Credit purchase: ~65,000 gas (~0.0065 MON)
- Generation: 1 credit burned, NFT minted
- Whitelist mint: ~180,000 gas + 2000 TOURS airdrop
- Contract appears on testnet.monadscan.com
- Code available on IPFS

---

## Phase 2: Production Deployment (Week 2)

### 10. Deploy Backend to VPS

**Recommended: DigitalOcean Droplet ($12/month)**

```bash
# SSH into VPS
ssh root@your-server-ip

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Clone repository
cd /var/www
git clone https://github.com/your-username/empowertours-dev-studio
cd empowertours-dev-studio/backend

# Install dependencies
npm install --production

# Create .env file (use production values)
nano .env

# Start with PM2
pm2 start src/server.js --name empowertours-backend
pm2 save
pm2 startup
```

**Setup Nginx as reverse proxy:**
```bash
# Install Nginx
apt-get install -y nginx

# Configure
nano /etc/nginx/sites-available/empowertours
```

```nginx
server {
    listen 80;
    server_name api.empowertours-studio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/empowertours /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Setup SSL with Let's Encrypt
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d api.empowertours-studio.com
```

### 11. Deploy Frontend

**Option A: Vercel (Recommended - Free)**

```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts
# Set environment variables in Vercel dashboard
```

**Option B: Self-hosted on VPS**

```bash
# Build production
npm run build

# Copy build to server
scp -r build/* root@your-server-ip:/var/www/html/

# Configure Nginx for React Router
nano /etc/nginx/sites-available/empowertours-frontend
```

```nginx
server {
    listen 80;
    server_name empowertours-studio.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 12. Deploy to Mainnet

**⚠️ IMPORTANT: Test thoroughly on testnet first!**

```bash
# Update environment files
# backend/.env
NETWORK=monadMainnet

# frontend/.env
REACT_APP_NETWORK=monadMainnet

# Deploy contract to mainnet
cd contracts
npx hardhat deploy --network monadMainnet

# You'll pay ~0.24 MON in gas

# Update contract addresses in all .env files

# Verify on mainnet
npx hardhat verify --network monadMainnet <CONTRACT_ADDRESS> <TOURS_TOKEN_ADDRESS>

# Fund contract with 100,000 TOURS for airdrops

# Restart backend
pm2 restart empowertours-backend

# Redeploy frontend
cd frontend
npm run build
# Upload to Vercel or VPS
```

### 13. Final Testing on Mainnet

**Mainnet Launch Checklist:**
- [ ] Contract deployed and verified
- [ ] Backend connected to mainnet contract
- [ ] Frontend pointing to mainnet
- [ ] Test buy credits with REAL MON (small amount)
- [ ] Test generation (costs 1 credit)
- [ ] Verify NFT minted on mainnet
- [ ] Check IPFS storage working
- [ ] Test whitelist functionality
- [ ] Monitor backend logs for errors
- [ ] Check MonadScan for all transactions

---

## 📈 Post-Launch

### Monitoring

**Setup monitoring:**
```bash
# PM2 monitoring
pm2 monit

# Check logs
pm2 logs empowertours-backend

# Setup alerts
pm2 install pm2-logrotate
```

**Track metrics:**
- Total generations
- Revenue (MON collected)
- Active users
- Whitelist members
- API costs (Grok)
- IPFS storage used

### Marketing Launch

1. **Week 1-2:** Testnet beta testing
   - Invite 10-20 developers
   - Offer free testnet credits
   - Gather feedback

2. **Week 3:** Mainnet launch
   - Tweet announcement
   - Post on r/monad, r/ethereum
   - Developer Discord/Telegram
   - ProductHunt launch

3. **Month 1:** Growth
   - Partner with Monad ecosystem projects
   - Educational content (YouTube tutorials)
   - Bounties for best generated dApps
   - Whitelist filling campaign (first 50 users)

### Maintenance

**Weekly:**
- Check server health
- Review API costs
- Monitor contract activity
- Backup databases

**Monthly:**
- Update dependencies
- Review security
- Analyze metrics
- Plan new features

---

## 💰 Revenue Optimization

### Pricing Strategy

**Current:** 100 MON per generation ($2)

**Potential adjustments:**
- Dynamic pricing based on complexity
- Bulk credits discount (10 for 900 MON)
- Enterprise tier: Unlimited generations for 5000 MON/month
- Affiliate program: 10% commission

### Cost Reduction

1. **Grok API:** Negotiate enterprise pricing after 1000+ gens
2. **IPFS:** Optimize storage, use compression
3. **Infrastructure:** Scale horizontally only when needed
4. **Caching:** Cache common contract patterns

### Upsells

- **Premium templates:** $50 one-time
- **Code audit service:** $200 per contract
- **Custom development:** $1000+
- **Mainnet deployment service:** $100 fee

---

## 🔒 Security Checklist

- [ ] All private keys in .env (never commit)
- [ ] Rate limiting on API endpoints
- [ ] Input validation on all user inputs
- [ ] Smart contract audited (optional but recommended)
- [ ] SSL/HTTPS on all endpoints
- [ ] Database backups (if added later)
- [ ] DDoS protection (Cloudflare)
- [ ] Monitor for unusual activity

---

## 🚨 Troubleshooting

### Common Issues

**Contract deployment fails:**
- Check you have enough MON for gas
- Verify RPC endpoint is correct
- Check network is Monad (chainId 143 or 41454)

**Backend can't connect to contract:**
- Verify contract address in .env
- Check RPC endpoint is accessible
- Ensure backend wallet has permissions

**Grok API errors:**
- Check API key is valid
- Verify you have credits
- Rate limit exceeded? Add delays

**IPFS upload fails:**
- Check Pinata API keys
- Verify account has storage available
- Try smaller file sizes first

**Frontend can't connect wallet:**
- Ensure MetaMask is installed
- Add Monad network to MetaMask
- Check contract address is correct

---

## 📞 Support Resources

- **Monad Docs:** https://docs.monad.xyz
- **Grok API:** https://docs.x.ai
- **Hardhat:** https://hardhat.org/docs
- **Ethers.js:** https://docs.ethers.org

---

## ✅ Final Pre-Launch Checklist

### Testnet (Must Complete)
- [ ] All tests passing
- [ ] Contract deployed and verified
- [ ] Backend fully functional
- [ ] Frontend working end-to-end
- [ ] At least 5 successful test generations
- [ ] Whitelist NFT tested
- [ ] IPFS uploads confirmed
- [ ] All features tested

### Mainnet (Before Launch)
- [ ] Testnet tested for 1+ week
- [ ] Smart contract code reviewed
- [ ] Backend security reviewed
- [ ] All environment variables correct
- [ ] Monitoring setup
- [ ] Backup plan ready
- [ ] Marketing materials prepared
- [ ] Domain and SSL configured
- [ ] Terms of service ready
- [ ] Privacy policy ready

### Go-Live
- [ ] Deploy contract to mainnet
- [ ] Fund contract with TOURS
- [ ] Deploy backend to production
- [ ] Deploy frontend to production
- [ ] Verify all systems operational
- [ ] Test with small MON amount
- [ ] Announce launch
- [ ] Monitor closely for 24 hours

---

## 🎉 Launch Day Timeline

**Hour 0:** Deploy contract to mainnet (0.24 MON)
**Hour 1:** Update and deploy backend
**Hour 2:** Deploy frontend
**Hour 3:** Final smoke tests
**Hour 4:** Soft launch to small group (10 people)
**Hour 6:** Monitor, fix any issues
**Hour 8:** Public announcement if all good
**Hour 12:** First whitelist members
**Hour 24:** First day review

**Expected First Day:**
- 10-20 users
- 5-10 generations
- $10-$20 revenue
- 3-5 whitelist members

**Target: Profitable by Day 21** ✅
