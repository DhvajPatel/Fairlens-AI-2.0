# FairLens AI 2.0 — Deployment Guide

## Backend → Render (free)

1. Push this repo to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Set these values:
   - **Root Directory:** `fairlens-ai/backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Runtime:** Python 3.11
5. Add Environment Variable:
   - `GEMINI_API_KEY` = your key (optional, users can also enter it in the UI)
6. Click **Deploy** — note your URL e.g. `https://fairlens-ai-backend.onrender.com`

---

## Frontend → Vercel (free)

1. Go to https://vercel.com → New Project → Import your GitHub repo
2. Set:
   - **Root Directory:** `fairlens-ai/frontend`
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add Environment Variable:
   - `VITE_API_URL` = your Render backend URL (e.g. `https://fairlens-ai-backend.onrender.com`)
4. Click **Deploy** — Vercel gives you a live URL instantly

---

## Notes

- Render free tier **spins down after 15 min of inactivity** — first request after sleep takes ~30s
- To keep it awake, use https://uptimerobot.com (free) to ping `/` every 10 minutes
- The `vercel.json` rewrites handle routing — no extra config needed
