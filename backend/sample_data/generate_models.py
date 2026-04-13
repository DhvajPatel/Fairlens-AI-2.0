"""
Generate 2 sample models for demo:
1. fair_loan_model.pkl    — unbiased loan approval model (DI ~0.9+)
2. biased_loan_model.pkl  — biased loan approval model  (DI ~0.5)

Both trained on loan_approval.csv so judges can load the same dataset
and switch between models to see the difference.
"""
import pandas as pd
import numpy as np
import pickle
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split

rng = np.random.default_rng(42)

# ── Load / recreate loan dataset ─────────────────────────────────────────────
n = 800
gender   = rng.choice(['Male', 'Female'], n, p=[0.6, 0.4])
age      = rng.integers(22, 60, n)
income   = rng.integers(20000, 120000, n)
credit   = rng.integers(300, 850, n)
loan_amt = rng.integers(5000, 50000, n)
employed = rng.choice([1, 0], n, p=[0.85, 0.15])

# Biased approval (gender heavily weighted)
base_biased = (
    0.20 * (credit - 300) / 550
    + 0.10 * income / 120000
    + 0.05 * employed.astype(float)
    + 0.05 * (1 - loan_amt / 50000)
    + 0.60 * (gender == 'Male').astype(float)   # 60% weight on gender!
)
approved_biased = (base_biased + rng.normal(0, 0.05, n) > 0.45).astype(int)

# Fair approval (gender not used)
base_fair = (
    0.40 * (credit - 300) / 550
    + 0.30 * income / 120000
    + 0.20 * employed.astype(float)
    + 0.10 * (1 - loan_amt / 50000)
)
approved_fair = (base_fair + rng.normal(0, 0.05, n) > 0.45).astype(int)

df = pd.DataFrame({
    'age': age, 'gender': gender, 'income': income,
    'credit_score': credit, 'loan_amount': loan_amt,
    'employed': employed,
})

# Encode
df_enc = df.copy()
le = LabelEncoder()
df_enc['gender'] = le.fit_transform(df_enc['gender'].astype(str))

X = df_enc.values

# ── Train BIASED model ────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, approved_biased, test_size=0.2, random_state=42
)
biased_model = RandomForestClassifier(n_estimators=200, random_state=42)
biased_model.fit(X_train, y_train)
biased_model.feature_names_in_ = np.array(['age', 'gender', 'income', 'credit_score', 'loan_amount', 'employed'])

with open('biased_loan_model.pkl', 'wb') as f:
    pickle.dump(biased_model, f)
print(f"✓ biased_loan_model.pkl  — accuracy: {biased_model.score(X_test, y_test):.2%}")

# ── Train FAIR model ──────────────────────────────────────────────────────────
# Remove gender column for fair model
X_fair = df_enc.drop(columns=['gender']).values
X_train2, X_test2, y_train2, y_test2 = train_test_split(
    X_fair, approved_fair, test_size=0.2, random_state=42
)
fair_model = RandomForestClassifier(
    n_estimators=200, class_weight='balanced', random_state=42
)
fair_model.fit(X_train2, y_train2)
fair_model.feature_names_in_ = np.array(['age', 'income', 'credit_score', 'loan_amount', 'employed'])

with open('fair_loan_model.pkl', 'wb') as f:
    pickle.dump(fair_model, f)
print(f"✓ fair_loan_model.pkl    — accuracy: {fair_model.score(X_test2, y_test2):.2%}")
print("\nDone! Upload these .pkl files in Data Analyzer to compare bias.")
