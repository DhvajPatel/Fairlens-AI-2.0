from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import pandas as pd
import numpy as np
import io
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from imblearn.over_sampling import SMOTE
from imblearn.combine import SMOTETomek
from ml.dataset_store import store, store_ready, store_has_dataset

router = APIRouter()

class FixRequest(BaseModel):
    method: str  # reweigh | oversample | remove_sensitive

def encode_df(df: pd.DataFrame):
    df = df.copy().dropna()
    for col in df.select_dtypes(include="object").columns:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
    return df

def compute_fairness(df_original, target, sensitive, model, feature_cols):
    df_clean = df_original.dropna(subset=[target, sensitive]).copy()
    # encode_df also calls dropna(), so encode first then align df_clean to its index
    df_enc   = encode_df(df_clean)
    df_clean = df_clean.loc[df_enc.index].reset_index(drop=True)
    df_enc   = df_enc.reset_index(drop=True)
    X_all    = df_enc.drop(columns=[target])
    for col in feature_cols:
        if col not in X_all.columns:
            X_all[col] = 0
    X_all = X_all[feature_cols]
    preds = model.predict(X_all)
    df_clean["_pred"] = preds
    rates = {}
    for g in df_clean[sensitive].unique():
        subset = df_clean[df_clean[sensitive] == g]
        rates[str(g)] = round(float(subset["_pred"].mean()) * 100, 2)
    r  = list(rates.values())
    di = round(min(r) / max(r), 3) if max(r) > 0 else 1.0
    dp = round(max(r) - min(r), 2)
    return di, dp, rates

@router.get("/status")
def fix_status():
    return {
        "has_dataset": store_has_dataset(),
        "model_ready": store_ready(),
        "target":    store.get("target"),
        "sensitive": store.get("sensitive"),
    }

@router.post("/correct")
def correct_bias(req: FixRequest):
    if not store_has_dataset():
        raise HTTPException(status_code=400, detail="NO_DATASET")
    if not store_ready():
        raise HTTPException(status_code=400, detail="NO_MODEL")

    df          = store["df"]
    target      = store["target"]
    sensitive   = store["sensitive"]
    orig_model  = store["model"]
    X_test_orig = store["X_test"]
    y_test_orig = store["y_test"]

    orig_accuracy = round(orig_model.score(X_test_orig, y_test_orig) * 100, 2)
    orig_di = store.get("orig_di") or 0.5
    orig_dp = store.get("demographic_parity_diff") or 0.0

    df_enc = encode_df(df)
    X_full = df_enc.drop(columns=[target])
    y_full = df_enc[target]

    drop_cols = []
    if req.method == "remove_sensitive":
        if sensitive in X_full.columns:
            corr      = X_full.corrwith(X_full[sensitive]).abs()
            proxies   = corr[corr > 0.35].index.tolist()
            drop_cols = list(set([sensitive] + proxies))
        X_full = X_full.drop(columns=[c for c in drop_cols if c in X_full.columns])

    feature_cols = list(X_full.columns)
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X_full, y_full, test_size=0.2, random_state=42, stratify=y_full
        )
    except ValueError:
        X_train, X_test, y_train, y_test = train_test_split(
            X_full, y_full, test_size=0.2, random_state=42
        )

    if req.method == "reweigh":
        sens_col = sensitive if sensitive in X_train.columns else None
        weights  = np.ones(len(y_train))
        if sens_col:
            overall_pos = y_train.mean()
            idx_list    = list(y_train.index)
            for g in X_train[sens_col].unique():
                mask  = X_train[sens_col] == g
                g_pos = y_train[mask].mean() if mask.sum() > 0 else overall_pos
                g_neg = 1 - g_pos
                ov_neg = 1 - overall_pos
                for idx in y_train[mask].index:
                    pos = y_train[idx]
                    w   = (overall_pos / g_pos) if (pos == 1 and g_pos > 0) else (ov_neg / g_neg if g_neg > 0 else 1.0)
                    weights[idx_list.index(idx)] = np.clip(w, 0.05, 20.0)
        model = RandomForestClassifier(n_estimators=300, max_depth=8, min_samples_leaf=5,
                                       class_weight="balanced", random_state=42, n_jobs=-1)
        model.fit(X_train, y_train, sample_weight=weights)

    elif req.method == "oversample":
        try:
            X_res, y_res = SMOTETomek(random_state=42).fit_resample(X_train, y_train)
        except Exception:
            try:
                X_res, y_res = SMOTE(random_state=42, k_neighbors=3).fit_resample(X_train, y_train)
            except Exception:
                X_res, y_res = X_train, y_train
        model = RandomForestClassifier(n_estimators=300, max_depth=8, min_samples_leaf=3,
                                       class_weight="balanced", random_state=42, n_jobs=-1)
        model.fit(X_res, y_res)

    else:  # remove_sensitive
        model = RandomForestClassifier(n_estimators=300, max_depth=6, min_samples_leaf=10,
                                       class_weight="balanced_subsample", random_state=42, n_jobs=-1)
        model.fit(X_train, y_train)

    new_accuracy = round(model.score(X_test, y_test) * 100, 2)
    new_di, new_dp, new_rates = compute_fairness(df, target, sensitive, model, feature_cols)

    # ── Build corrected dataset ──────────────────────────────────────────────
    df_export = df.copy()
    df_enc2   = encode_df(df_export)
    # Align df_export to rows that survived encode_df's dropna
    df_export = df_export.loc[df_enc2.index].reset_index(drop=True)
    df_enc2   = df_enc2.reset_index(drop=True)
    X_export  = df_enc2.drop(columns=[target])
    for col in feature_cols:
        if col not in X_export.columns:
            X_export[col] = 0
    X_export = X_export[feature_cols]

    corrected_preds = model.predict(X_export)
    df_export = df_export.reset_index(drop=True)
    df_export[f"{target}_original"]  = df_export[target]
    df_export[f"{target}_corrected"] = corrected_preds
    df_export["bias_corrected"]      = (df_export[f"{target}_original"] != df_export[f"{target}_corrected"]).astype(int)

    store["corrected_df"]  = df_export
    store["fixed_metrics"] = {
        "accuracy":               new_accuracy,
        "disparate_impact":       new_di,
        "demographic_parity_diff": new_dp,
        "fairness_score":         round(new_di * 100, 1),
        "before_accuracy":        orig_accuracy,
        "method":                 req.method,
        "rows_changed":           int(df_export["bias_corrected"].sum()),
    }

    return {
        "method": req.method,
        "rows_changed": int(df_export["bias_corrected"].sum()),
        "before": {
            "accuracy":               orig_accuracy,
            "disparate_impact":       orig_di,
            "demographic_parity_diff": orig_dp,
            "fairness_score":         round(orig_di * 100, 1),
        },
        "after": {
            "accuracy":               new_accuracy,
            "disparate_impact":       new_di,
            "demographic_parity_diff": new_dp,
            "fairness_score":         round(new_di * 100, 1),
        },
    }

@router.get("/download")
def download_corrected():
    df_export = store.get("corrected_df")
    if df_export is None:
        raise HTTPException(status_code=400, detail="Apply bias correction first.")

    buf = io.StringIO()
    df_export.to_csv(buf, index=False)
    buf.seek(0)

    filename = f"fairlens_corrected_{store.get('target','data')}.csv"
    return StreamingResponse(
        io.BytesIO(buf.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
