from fastapi import APIRouter, HTTPException
import shap
import numpy as np
from ml.dataset_store import store

router = APIRouter()

@router.get("/shap")
def get_shap_explanation():
    model         = store.get("model")
    X_test        = store.get("X_test")
    feature_names = store.get("feature_names")

    if model is None or X_test is None:
        raise HTTPException(status_code=400, detail="Run bias detection first")

    sample    = X_test.iloc[:50]
    explainer = shap.TreeExplainer(model)
    shap_vals = explainer.shap_values(sample)

    # Handle all SHAP output shapes:
    # - list of 2 arrays (old sklearn): shape [n_samples, n_features] each
    # - single 3D array (new sklearn):  shape [n_samples, n_features, n_classes]
    # - single 2D array (regression):   shape [n_samples, n_features]
    if isinstance(shap_vals, list):
        # Old format: list[class_0_array, class_1_array]
        sv = np.array(shap_vals[1]) if len(shap_vals) > 1 else np.array(shap_vals[0])
    elif isinstance(shap_vals, np.ndarray) and shap_vals.ndim == 3:
        # New format: (n_samples, n_features, n_classes) — take class 1
        sv = shap_vals[:, :, 1]
    else:
        sv = np.array(shap_vals)

    # Global importance: mean absolute SHAP per feature
    mean_abs   = np.abs(sv).mean(axis=0)
    global_imp = sorted(zip(feature_names, mean_abs.tolist()), key=lambda x: x[1], reverse=True)[:8]

    # Single sample explanation (first test row)
    single     = sv[0].tolist()
    single_exp = sorted(zip(feature_names, single), key=lambda x: abs(x[1]), reverse=True)[:6]

    # Base value
    base = explainer.expected_value
    if isinstance(base, (list, np.ndarray)):
        base_val = float(base[1]) if len(base) > 1 else float(base[0])
    else:
        base_val = float(base)

    return {
        "global_importance":  [{"feature": f, "shap_value": round(v, 4)} for f, v in global_imp],
        "single_explanation": [{"feature": f, "contribution": round(v, 4)} for f, v in single_exp],
        "base_value": round(base_val, 4),
    }
