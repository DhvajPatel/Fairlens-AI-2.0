"""
In-memory store shared across all routers.
Uses a module-level dict — single source of truth within one uvicorn worker process.
"""

store = {
    "df": None,
    "model": None,
    "target": None,
    "sensitive": None,
    "X_test": None,
    "y_test": None,
    "feature_names": None,
    "disparate_impact": None,
    "demographic_parity_diff": None,
    "orig_di": None,
    "fixed_metrics": None,
    "corrected_df": None,
}


def store_ready() -> bool:
    """Returns True if bias detection has been run and model is available."""
    return store["model"] is not None and store["target"] is not None


def store_has_dataset() -> bool:
    """Returns True if a dataset has been uploaded."""
    return store["df"] is not None
