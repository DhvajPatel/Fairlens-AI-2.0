from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os

try:
    from google import genai
    GEMINI_AVAILABLE = True
except Exception:
    GEMINI_AVAILABLE = False

from ml.dataset_store import store

router = APIRouter()

class GeminiRequest(BaseModel):
    api_key: str = ""

def _build_prompt() -> str:
    di        = store.get("disparate_impact") or 0.0
    dp        = store.get("demographic_parity_diff") or 0.0
    tgt       = store.get("target") or "unknown"
    sens      = store.get("sensitive") or "unknown"
    fixed     = store.get("fixed_metrics")
    feat_names = store.get("feature_names") or []
    severity  = "HIGH RISK" if di < 0.6 else ("MODERATE RISK" if di < 0.8 else "LOW RISK")

    fix_text = ""
    if fixed:
        fix_text = f"""
Bias correction was applied using method: {fixed.get('method','unknown')}.
- Accuracy changed from {fixed.get('before_accuracy','?')}% to {fixed.get('accuracy','?')}%
- Disparate Impact improved to {fixed.get('disparate_impact','?')}
- Fairness Score improved to {fixed.get('fairness_score','?')}%
- {fixed.get('rows_changed', 0)} decisions were changed
"""

    return f"""You are an expert AI fairness auditor. Analyze the following bias detection results and provide a clear, actionable explanation for a non-technical stakeholder.

Dataset Analysis:
- Target column (what the model predicts): {tgt}
- Sensitive attribute (fairness check): {sens}
- Disparate Impact score: {round(di, 3)} (threshold: 0.8 = fair, below 0.6 = critical)
- Demographic Parity Difference: {round(dp, 2)}%
- Risk Level: {severity}
- Top features used by model: {', '.join(feat_names[:5]) if feat_names else 'unknown'}
{fix_text}

Please provide:
1. A plain-English explanation of what the bias means in real-world terms (2-3 sentences)
2. Which group is most disadvantaged and why
3. The business/legal risk if this model is deployed as-is
4. Top 3 specific recommendations to fix this bias
5. A one-line verdict (e.g. "This model should NOT be deployed without correction")

Keep the tone professional but accessible. Use bullet points where helpful. Be direct and specific.
"""

@router.post("/explain")
def gemini_explain(req: GeminiRequest):
    if not GEMINI_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="google-genai package not installed. Run: pip install google-genai"
        )

    if store.get("target") is None:
        raise HTTPException(status_code=400, detail="Run bias detection first")

    api_key = req.api_key.strip() or os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=400, detail="NO_API_KEY")

    try:
        client   = genai.Client(api_key=api_key)
        prompt   = _build_prompt()

        # Try models in order — fall back if quota or not-found
        models_to_try = [
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
        ]
        last_err = None
        for model_name in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )
                return {
                    "explanation": response.text,
                    "model": model_name,
                    "context": {
                        "target":           store.get("target"),
                        "sensitive":        store.get("sensitive"),
                        "disparate_impact": store.get("disparate_impact"),
                        "risk": (
                            "HIGH"     if (store.get("disparate_impact") or 1) < 0.6 else
                            "MODERATE" if (store.get("disparate_impact") or 1) < 0.8 else
                            "LOW"
                        ),
                    },
                }
            except Exception as model_err:
                err_str = str(model_err)
                if any(x in err_str for x in ["429", "RESOURCE_EXHAUSTED", "quota", "404", "NOT_FOUND"]):
                    last_err = model_err
                    continue  # try next model
                raise model_err  # auth or other hard error, stop immediately

        # All models failed
        last_msg = str(last_err) if last_err else "unknown"
        if "429" in last_msg or "RESOURCE_EXHAUSTED" in last_msg:
            raise HTTPException(
                status_code=429,
                detail="Free tier quota exceeded. Wait ~1 minute and retry, or enable billing at https://aistudio.google.com"
            )
        raise HTTPException(status_code=500, detail=f"All models unavailable: {last_msg[:200]}")
    except Exception as e:
        err = str(e)
        if "API_KEY_INVALID" in err or "invalid" in err.lower() or "401" in err:
            raise HTTPException(status_code=401, detail="Invalid Gemini API key")
        raise HTTPException(status_code=500, detail=f"Gemini error: {err}")

@router.get("/status")
def gemini_status():
    return {
        "available":    GEMINI_AVAILABLE,
        "has_env_key":  bool(os.environ.get("GEMINI_API_KEY")),
        "bias_ready":   store.get("target") is not None,
    }
