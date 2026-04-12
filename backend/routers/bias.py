from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    confusion_matrix, roc_curve, auc,
    precision_score, recall_score, f1_score
)
from ml.dataset_store import store

router = APIRouter()

class BiasRequest(BaseModel):
    target_column: str
    sensitive_column: str
    positive_label: str = "1"

def encode_df(df: pd.DataFrame):
    df = df.copy().dropna()
    for col in df.select_dtypes(include="object").columns:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
    return df

@router.post("/detect")
def detect_bias(req: BiasRequest):
    df = store["df"]
    if df is None:
        raise HTTPException(status_code=400, detail="No dataset uploaded")
    if req.target_column not in df.columns or req.sensitive_column not in df.columns:
        raise HTTPException(status_code=400, detail="Invalid column names")

    store["target"]    = req.target_column
    store["sensitive"] = req.sensitive_column

    df_enc = encode_df(df)
    X = df_enc.drop(columns=[req.target_column])
    y = df_enc[req.target_column]

    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
    except ValueError:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    store["model"]         = model
    store["X_test"]        = X_test
    store["y_test"]        = y_test
    store["feature_names"] = list(X.columns)

    y_pred      = model.predict(X_test)
    y_pred_prob = model.predict_proba(X_test)[:, 1]
    accuracy    = round(model.score(X_test, y_test) * 100, 2)

    # ── Confusion matrix ──────────────────────────────────────────────────────
    classes = sorted(y_test.unique().tolist())
    cm      = confusion_matrix(y_test, y_pred, labels=classes)
    cm_data = {
        "matrix": cm.tolist(),
        "labels": [str(c) for c in classes],
    }
    if len(classes) == 2:
        tn, fp, fn, tp = cm.ravel()
        cm_data.update({
            "true_positive": int(tp), "true_negative": int(tn),
            "false_positive": int(fp), "false_negative": int(fn),
            "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
            "recall":    round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
            "f1_score":  round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
        })

    # ── ROC curve ─────────────────────────────────────────────────────────────
    roc_data = None
    try:
        fpr, tpr, _ = roc_curve(y_test, y_pred_prob)
        roc_auc     = round(auc(fpr, tpr), 4)
        # Downsample to 40 points for frontend
        step = max(1, len(fpr) // 40)
        roc_data = {
            "fpr":     [round(float(v), 4) for v in fpr[::step]],
            "tpr":     [round(float(v), 4) for v in tpr[::step]],
            "auc":     roc_auc,
        }
    except Exception:
        pass

    # ── Approval rates per group ───────────────────────────────────────────────
    df_clean = df.dropna(subset=[req.target_column, req.sensitive_column]).copy()
    approval_rates = {}
    for g in df_clean[req.sensitive_column].unique():
        subset = df_clean[df_clean[req.sensitive_column] == g]
        rate   = (subset[req.target_column].astype(str) == str(req.positive_label)).mean()
        approval_rates[str(g)] = round(float(rate) * 100, 2)

    rates = list(approval_rates.values())
    disparate_impact        = round(min(rates) / max(rates), 3) if max(rates) > 0 else 1.0
    demographic_parity_diff = round(max(rates) - min(rates), 2)

    # ── Equal Opportunity & Equalized Odds ────────────────────────────────────
    # Requires aligning df_clean with encoded predictions
    df_enc2   = encode_df(df_clean)
    df_clean2 = df_clean.loc[df_enc2.index].reset_index(drop=True)
    df_enc2   = df_enc2.reset_index(drop=True)
    X_all     = df_enc2.drop(columns=[req.target_column])
    for col in list(X.columns):
        if col not in X_all.columns:
            X_all[col] = 0
    X_all = X_all[list(X.columns)]
    preds_all = model.predict(X_all)
    df_clean2["_pred"] = preds_all

    pos_val = int(req.positive_label) if req.positive_label.isdigit() else req.positive_label
    tpr_by_group, fpr_by_group = {}, {}
    for g in df_clean2[req.sensitive_column].unique():
        grp = df_clean2[df_clean2[req.sensitive_column] == g]
        actual = grp[req.target_column].astype(str) == str(req.positive_label)
        pred   = grp["_pred"].astype(str) == str(pos_val)
        tp_g   = (actual & pred).sum()
        fn_g   = (actual & ~pred).sum()
        fp_g   = (~actual & pred).sum()
        tn_g   = (~actual & ~pred).sum()
        tpr_by_group[str(g)] = round(float(tp_g / (tp_g + fn_g)), 4) if (tp_g + fn_g) > 0 else 0.0
        fpr_by_group[str(g)] = round(float(fp_g / (fp_g + tn_g)), 4) if (fp_g + tn_g) > 0 else 0.0

    tpr_vals = list(tpr_by_group.values())
    fpr_vals = list(fpr_by_group.values())
    equal_opportunity  = round(max(tpr_vals) - min(tpr_vals), 4) if tpr_vals else 0.0
    equalized_odds     = round(
        max(abs(t1 - t2) for t1 in tpr_vals for t2 in tpr_vals) +
        max(abs(f1 - f2) for f1 in fpr_vals for f2 in fpr_vals), 4
    ) if tpr_vals else 0.0

    # ── Severity ──────────────────────────────────────────────────────────────
    if disparate_impact < 0.6 or demographic_parity_diff > 30:
        severity = "critical"
    elif disparate_impact < 0.8 or demographic_parity_diff > 15:
        severity = "moderate"
    else:
        severity = "low"

    store["disparate_impact"]        = disparate_impact
    store["demographic_parity_diff"] = demographic_parity_diff
    store["orig_di"]                 = disparate_impact

    importances        = model.feature_importances_
    feature_importance = sorted(
        zip(store["feature_names"], importances),
        key=lambda x: x[1], reverse=True
    )[:8]

    return {
        "accuracy":                 accuracy,
        "approval_rates":           approval_rates,
        "disparate_impact":         disparate_impact,
        "demographic_parity_diff":  demographic_parity_diff,
        "equal_opportunity_diff":   equal_opportunity,
        "equalized_odds_diff":      equalized_odds,
        "tpr_by_group":             tpr_by_group,
        "fpr_by_group":             fpr_by_group,
        "severity":                 severity,
        "confusion_matrix":         cm_data,
        "roc_curve":                roc_data,
        "feature_importance": [
            {"feature": f, "importance": round(float(i), 4)}
            for f, i in feature_importance
        ],
    }
