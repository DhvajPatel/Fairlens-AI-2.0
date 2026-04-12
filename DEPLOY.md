# FairLens AI 2.0 — Deployment Guide (100% Free, No Card)

---

## 🥇 Backend → Hugging Face Spaces (Free, No Card, No Sleep)

### Why HuggingFace?
- ✅ 100% Free
- ✅ No credit card
- ✅ No sleep / always on
- ✅ Docker support = full FastAPI server
- ✅ Persistent memory within a session
- ✅ Made for AI/ML projects like this one

---

### Step 1 — Create Account
1. Go to https://huggingface.co/join
2. Sign up with **email only** (no card)

### Step 2 — Create New Space
1. Go to https://huggingface.co/new-space
2. Fill in:
   - **Space name:** `fairlens-ai-backend`
   - **License:** MIT
   - **SDK:** **Docker** ← important
   - **Visibility:** Public
3. Click **Create Space**

### Step 3 — Upload Backend Files
You have 2 options:

**Option A — Git (recommended):**
```bash
# Clone the empty space
git clone https://huggingface.co/spaces/YOUR_USERNAME/fairlens-ai-backend
cd fairlens-ai-backend

# Copy backend files into it
cp -r fairlens-ai/backend/* .

# Push
git add .
git commit -m "Deploy FairLens AI backend"
git push
```

**Option B — Upload via browser:**
- In your Space → **Files** tab → Upload files
- Upload everything from `fairlens-ai/backend/` folder

### Step 4 — Add Gemini API Key (optional)
- Space → **Settings** → **Repository secrets**
- Add: `GEMINI_API_KEY` = your key

### Step 5 — Get your URL
After build completes (~3-5 min):
```
https://YOUR_USERNAME-fairlens-ai-backend.hf.space
```

---

## Frontend → Vercel (Free, No Card)

1. Go to https://vercel.com → Sign up with GitHub (no card)
2. **New Project** → import your GitHub repo
3. Settings:
   - **Root Directory:** `fairlens-ai/frontend`
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables:**
   - Key: `VITE_API_URL`
   - Value: `https://YOUR_USERNAME-fairlens-ai-backend.hf.space`
5. Deploy → get live link ✅

---

## Final Stack

```
GitHub Repo
    ├── Backend  →  Hugging Face Spaces  ✅ Free, No Card, No Sleep
    └── Frontend →  Vercel               ✅ Free, No Card, Instant
```

## After Deploy — Update .env.production

Edit `fairlens-ai/frontend/.env.production`:
```
VITE_API_URL=https://YOUR_USERNAME-fairlens-ai-backend.hf.space
```
Then in Vercel → Settings → Environment Variables → update → Redeploy.
