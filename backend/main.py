from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import analyze, bias, explain, fix, report, monitor, gemini

app = FastAPI(title="FairLens AI 2.0", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api/analyze", tags=["Data Analysis"])
app.include_router(bias.router,    prefix="/api/bias",    tags=["Bias Detection"])
app.include_router(explain.router, prefix="/api/explain", tags=["Explainability"])
app.include_router(fix.router,     prefix="/api/fix",     tags=["Bias Correction"])
app.include_router(report.router,  prefix="/api/report",  tags=["Compliance Report"])
app.include_router(monitor.router, prefix="/api/monitor", tags=["Real-time Monitor"])
app.include_router(gemini.router,  prefix="/api/gemini",  tags=["Gemini AI"])

@app.get("/")
def root():
    return {"status": "FairLens AI 2.0 running"}
