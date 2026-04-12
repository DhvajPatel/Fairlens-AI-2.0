# FairLens AI 2.0 — AI Governance Platform

> **"Audit. Explain. Fix. Govern AI Decisions."**

Full-stack AI governance platform: detects, explains, fixes, and monitors bias in real-time with compliance-ready PDF reports.

---

## Setup

### 1. Start backend
```bash
cd fairlens-ai/backend 
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Start frontend
```bash
cd fairlens-ai/frontend  
npm install
npm run dev
# → http://localhost:3000
```

---

## Demo Flow (2.5 min)

| Step | Page | Action |
|------|------|--------|
| 1 | Data Analyzer | Upload your CSV → sensitive attributes auto-detected |
| 2 | Bias Detection | Set target & sensitive columns → see bias severity |
| 3 | Explainable AI | SHAP shows which features drive decisions |
| 4 | Bias Correction | Apply correction → fairness improves |
| 5 | Compliance Report | Download PDF with regulatory risk assessment |
| 6 | Live Monitor | Real-time bias drift chart with alerts |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Tailwind CSS, Recharts |
| Backend | FastAPI, Python 3.11+ |
| ML | Scikit-learn, SHAP, imbalanced-learn |
| Reports | ReportLab PDF |
