# 🐙 GitHub App Setup Guide

Let users push generated code to their own GitHub repos.

---

## Why GitHub Integration?

Users generate dApps on your platform, then:
- Click "Push to GitHub"
- Authorize the app
- Code automatically pushed to their GitHub repo
- Ready to deploy!

---

## Step 1: Create GitHub App

1. Go to https://github.com/settings/apps
2. Click "New GitHub App"

### GitHub App Settings:

**GitHub App name:**
```
EmpowerTours Dev Studio
```

**Description:**
```
AI-powered dApp generator for Monad blockchain. Pushes generated smart contracts and dApps to your GitHub repository.
```

**Homepage URL:**
```
https://your-frontend.railway.app
(or your custom domain)
```

**Callback URL:**
```
https://your-frontend.railway.app/github/callback
```

**Request user authorization (OAuth) during installation:**
- ✅ Check this box

**Webhook:**
- ❌ Uncheck "Active"
(We don't need webhooks)

**Permissions → Repository permissions:**
- **Contents:** Read & Write
- **Metadata:** Read-only

**Where can this GitHub App be installed?:**
- ✅ Any account

3. Click **Create GitHub App**

---

## Step 2: Get Credentials

After creating the app:

1. **Client ID:**
   - Copy the Client ID shown on the page
   - Example: `Iv1.a1b2c3d4e5f6g7h8`

2. **Client Secret:**
   - Click "Generate a new client secret"
   - Copy the secret immediately (can't see it again!)
   - Example: `1234567890abcdef...`

---

## Step 3: Add to Backend Environment

In Railway → Backend → Variables:

```bash
# GitHub App Integration
GITHUB_APP_CLIENT_ID=Iv1.your_client_id_here
GITHUB_APP_CLIENT_SECRET=your_client_secret_here
```

Backend will auto-restart.

---

## Step 4: Test the Flow

1. **Generate a dApp** on your platform

2. **Click "Push to GitHub"** button

3. **Authorize** - User connects GitHub account

4. **Enter repo name** - e.g., "my-nft-collection"

5. **Push** - Code automatically pushed to GitHub

6. **Result:**
   - New repo created: `github.com/username/my-nft-collection`
   - All code pushed
   - README included
   - Ready to clone and deploy

---

## User Flow

```
User generates dApp
  ↓
Clicks "Push to GitHub"
  ↓
Redirected to GitHub OAuth
  ↓
Authorizes EmpowerTours
  ↓
Redirected back with code
  ↓
Backend creates repo
  ↓
Pushes all generated files
  ↓
User sees: "✅ Pushed to GitHub!"
  ↓
Link to their new repo
```

---

## What Gets Pushed

The GitHub integration creates a complete repo with:

```
username/repo-name/
├── contracts/
│   ├── Main.sol
│   └── Helper.sol (if any)
├── deploy/
│   └── 001_deploy.js
├── test/
│   └── Main.test.js
├── frontend/
│   └── src/
│       ├── App.js
│       └── contract.js
├── package.json
├── hardhat.config.js
├── .gitignore
└── README.md
```

All ready to:
```bash
git clone https://github.com/username/repo-name
cd repo-name
npm install
npx hardhat deploy
```

---

## Security

**What permissions does the app need?**
- Read & Write to repositories
- Only creates new repos (doesn't touch existing ones)

**What can users do?**
- Revoke access anytime at github.com/settings/applications
- Delete created repos if they want
- Full control over their code

**What can you NOT do:**
- Cannot access existing repos
- Cannot modify user's code after push
- Cannot see private repos (unless user chooses to make generated repo private)

---

## Customization

### Change Initial Commit Message

Edit `backend/src/services/githubService.js`:

```javascript
const { data: commit } = await octokit.git.createCommit({
  owner,
  repo: repoName,
  message: 'Your custom commit message here',
  tree: tree.sha
});
```

### Add More Files

In `prepareFiles()` function, add:

```javascript
files.push({
  path: 'your-file.txt',
  content: 'File content'
});
```

### Make Repos Private by Default

In frontend, change:

```javascript
const [isPrivate, setIsPrivate] = useState(true); // Default to private
```

---

## Troubleshooting

### "GitHub integration not configured"

**Fix:** Add `GITHUB_APP_CLIENT_ID` and `GITHUB_APP_CLIENT_SECRET` to Railway backend variables.

### "Repository name already exists"

**Fix:** User already has a repo with that name. They need to:
- Use a different name
- Or delete the existing repo first

### "Failed to push code"

**Fix:** Check Railway logs:
```
Railway → Backend → Logs
```

Common causes:
- Invalid access token (user needs to re-authorize)
- GitHub API rate limit (wait a bit)
- Network timeout (retry)

### Callback URL doesn't match

**Fix:** Update GitHub App callback URL to match your frontend URL:
```
https://actual-frontend.railway.app/github/callback
```

---

## Cost

**GitHub API:**
- Free tier: 5,000 requests/hour
- Each repo creation uses ~10 requests
- **500 repos/hour = plenty!**

**GitHub App:**
- Free to create
- Free to use
- No ongoing costs

---

## Optional: Add GitHub Button to UI

In your `CodePreview` component, add a push button:

```javascript
import PushToGitHub from './PushToGitHub';

// In your component:
<div className="actions">
  <button onClick={downloadCode}>📥 Download</button>
  <PushToGitHub
    generatedCode={code}
    metadata={metadata}
  />
</div>
```

---

## Mainnet vs Testnet

The GitHub integration works for both:
- Testnet-generated code: Includes testnet config
- Mainnet-generated code: Includes mainnet config

The `hardhat.config.js` automatically adjusts based on what network was used during generation.

---

## User Benefits

Why users love this:

✅ **No manual copy-paste** - One click push
✅ **Version control** - Full git history
✅ **Collaboration** - Easy to share with team
✅ **Backup** - Code safe on GitHub
✅ **Professional** - Proper repo structure
✅ **CI/CD ready** - Can add GitHub Actions later

---

## Next Steps

1. Create GitHub App
2. Add credentials to Railway
3. Test with a generated dApp
4. Users can push to GitHub!

**That's it! 🚀**
