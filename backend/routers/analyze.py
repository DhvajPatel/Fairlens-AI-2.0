from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd
import io, os, pickle
from ml.dataset_store import store

router = APIRouter()

SENSITIVE_KEYWORDS = [
    "gender", "sex", "race", "caste", "religion",
    "age", "region", "nationality", "ethnicity"
]

SAMPLE_DATASETS = {
    "adult_income": {
        "file": "sample_data/adult_income.csv",
        "description": "Adult Income — predict income >50K, check gender/race bias",
        "target": "income",
        "sensitive": "gender",
    },
    "loan_approval": {
        "file": "sample_data/loan_approval.csv",
        "description": "Loan Approval — predict loan approval, check gender bias",
        "target": "approved",
        "sensitive": "gender",
    },
    "compas_recidivism": {
        "file": "sample_data/compas_recidivism.csv",
        "description": "COMPAS Recidivism — predict reoffending, check racial bias",
        "target": "two_year_recid",
        "sensitive": "race",
    },
}

SAMPLE_MODELS = {
    "fair_loan_model": {
        "file":        "sample_data/fair_loan_model.pkl",
        "description": "Fair Loan Model — trained WITHOUT gender, balanced classes (DI ~0.9+)",
        "dataset":     "loan_approval",
        "label":       "✅ Unbiased",
    },
    "biased_loan_model": {
        "file":        "sample_data/biased_loan_model.pkl",
        "description": "Biased Loan Model — gender heavily weighted in decisions (DI ~0.5)",
        "dataset":     "loan_approval",
        "label":       "⚠ Biased",
    },
}

# ── Dataset endpoints ─────────────────────────────────────────────────────────

@router.get("/samples")
def list_samples():
    return [
        {"id": k, "description": v["description"],
         "suggested_target": v["target"], "suggested_sensitive": v["sensitive"]}
        for k, v in SAMPLE_DATASETS.items()
    ]

@router.post("/load-sample/{dataset_id}")
def load_sample(dataset_id: str):
    if dataset_id not in SAMPLE_DATASETS:
        raise HTTPException(status_code=404, detail="Sample dataset not found")
    meta = SAMPLE_DATASETS[dataset_id]
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base, meta["file"])
    try:
        df = pd.read_csv(path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not load sample: {e}")
    return _process_df(df, meta["file"].split("/")[-1])

@router.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    content = await file.read()
    try:
        df = pd.read_csv(io.StringIO(content.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {e}")
    return _process_df(df, file.filename)

# ── Model endpoints ───────────────────────────────────────────────────────────

@router.get("/sample-models")
def list_sample_models():
    return [
        {"id": k, "description": v["description"],
         "label": v["label"], "dataset": v["dataset"]}
        for k, v in SAMPLE_MODELS.items()
    ]

@router.post("/load-sample-model/{model_id}")
def load_sample_model(model_id: str):
    if model_id not in SAMPLE_MODELS:
        raise HTTPException(status_code=404, detail="Sample model not found")
    meta = SAMPLE_MODELS[model_id]
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base, meta["file"])
    try:
        with open(path, "rb") as f:
            model = pickle.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not load model: {e}")

    feature_names = None
    for attr in ["feature_names_in_", "feature_names_", "feature_name_"]:
        if hasattr(model, attr):
            feature_names = list(getattr(model, attr))
            break

    store["model"]          = model
    store["feature_names"]  = feature_names
    store["X_test"]         = None
    store["y_test"]         = None
    store["model_source"]   = "uploaded"
    store["model_filename"] = f"{model_id}.pkl"

    return {
        "filename":          f"{model_id}.pkl",
        "has_proba":         hasattr(model, "predict_proba"),
        "feature_names":     feature_names,
        "n_features":        len(feature_names) if feature_names else None,
        "model_type":        type(model).__name__,
        "label":             meta["label"],
        "suggested_dataset": meta["dataset"],
        "message":           f"{meta['label']} model loaded. Load '{meta['dataset']}' dataset and run Bias Detection.",
    }

@router.post("/upload-model")
async def upload_model(file: UploadFile = File(...)):
    filename = file.filename or ""
    if not any(filename.endswith(ext) for ext in [".pkl", ".joblib", ".pickle"]):
        raise HTTPException(status_code=400, detail="Only .pkl, .joblib, or .pickle files are supported")
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Model file too large (max 50MB)")
    try:
        model = pickle.loads(content)
    except Exception:
        try:
            import joblib
            model = joblib.load(io.BytesIO(content))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not load model: {e}")

    if not hasattr(model, "predict"):
        raise HTTPException(status_code=400, detail="Model must have a predict() method")

    feature_names = None
    for attr in ["feature_names_in_", "feature_names_", "feature_name_"]:
        if hasattr(model, attr):
            feature_names = list(getattr(model, attr))
            break

    store["model"]          = model
    store["feature_names"]  = feature_names
    store["X_test"]         = None
    store["y_test"]         = None
    store["model_source"]   = "uploaded"
    store["model_filename"] = filename

    return {
        "filename":      filename,
        "has_proba":     hasattr(model, "predict_proba"),
        "feature_names": feature_names,
        "n_features":    len(feature_names) if feature_names else None,
        "model_type":    type(model).__name__,
        "message":       f"Model '{filename}' loaded. Now run Bias Detection.",
    }

@router.get("/model-status")
def model_status():
    return {
        "has_model":      store.get("model") is not None,
        "model_source":   store.get("model_source", "trained"),
        "model_filename": store.get("model_filename"),
        "model_type":     type(store["model"]).__name__ if store.get("model") else None,
        "feature_names":  store.get("feature_names"),
    }

# ── Shared helper ─────────────────────────────────────────────────────────────

def _process_df(df: pd.DataFrame, filename: str = ""):
    store["df"]            = df
    store["model"]         = None
    store["target"]        = None
    store["sensitive"]     = None
    store["X_test"]        = None
    store["y_test"]        = None
    store["feature_names"] = None
    store["disparate_impact"]        = None
    store["demographic_parity_diff"] = None
    store["orig_di"]       = None
    store["fixed_metrics"] = None
    store["corrected_df"]  = None
    store["model_source"]  = None
    store["model_filename"]= None

    detected_sensitive = [
        col for col in df.columns
        if any(kw in col.lower() for kw in SENSITIVE_KEYWORDS)
    ]

    stats = {}
    for col in df.columns:
        null_count = int(df[col].isnull().sum())
        if df[col].dtype == object or df[col].nunique() < 10:
            stats[col] = df[col].value_counts().to_dict()
        else:
            col_clean = df[col].dropna()
            stats[col] = {
                "min":        float(col_clean.min())              if len(col_clean) else 0,
                "max":        float(col_clean.max())              if len(col_clean) else 0,
                "mean":       round(float(col_clean.mean()), 2)   if len(col_clean) else 0,
                "null_count": null_count,
            }

    return {
        "rows":               len(df),
        "columns":            list(df.columns),
        "detected_sensitive": detected_sensitive,
        "missing_values":     df.isnull().sum().to_dict(),
        "stats":              stats,
        "filename":           filename,
    }
