from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd
import io, os
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

def _process_df(df: pd.DataFrame, filename: str = ""):
    store["df"] = df
    # Reset model state when new dataset is loaded
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
                "min": float(col_clean.min()) if len(col_clean) else 0,
                "max": float(col_clean.max()) if len(col_clean) else 0,
                "mean": round(float(col_clean.mean()), 2) if len(col_clean) else 0,
                "null_count": null_count,
            }

    return {
        "rows": len(df),
        "columns": list(df.columns),
        "detected_sensitive": detected_sensitive,
        "missing_values": df.isnull().sum().to_dict(),
        "stats": stats,
        "filename": filename,
    }
