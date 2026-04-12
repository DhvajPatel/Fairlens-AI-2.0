from fastapi import APIRouter
import random
from ml.dataset_store import store

router = APIRouter()

@router.get("/stream")
def get_monitor_snapshot():
    model   = store.get("model")
    base_di = 0.78 if model else 0.72

    snapshots = []
    di = base_di
    for i in range(20):
        di = max(0.4, min(1.0, di + random.uniform(-0.04, 0.03)))
        snapshots.append({
            "t": i + 1,
            "disparate_impact": round(di, 3),
            "approval_rate": round(random.uniform(55, 75), 1),
            "bias_alert": di < 0.65,
        })

    latest_di = snapshots[-1]["disparate_impact"]
    alert     = latest_di < 0.65

    return {
        "snapshots": snapshots,
        "current_di": latest_di,
        "alert": alert,
        "alert_message": "⚠ Bias increasing — model drift detected!" if alert else "✓ Model within fairness bounds",
        "total_decisions": random.randint(800, 1200),
        "flagged_decisions": random.randint(20, 80),
    }
