"""
Minimal trainer: reads data_testathon/training_dataset.csv, stratified split by user.

Two modes:
- Classification (default): XGBClassifier with class weights → prints AUC + ranking metrics.
- Ranking: XGBRanker (rank:pairwise) grouped by user → prints NDCG@K/Hit@K.

Usage:
    python python-recommender/scripts/train_xgb.py

Env (optional):
    TRAIN_TEST_SPLIT=0.2     # fraction for test
    RANDOM_STATE=42
    SCALE_POS_WEIGHT=auto    # 'auto' or a float (classifier mode only)
    RANK_OBJECTIVE=0         # set to 1/true to use XGBRanker (rank:pairwise)
    METRIC_TOPK=5,10         # Ks to report for NDCG@K/Hit@K
"""
from __future__ import annotations
import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
from xgboost import XGBClassifier, XGBRanker

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'data_testathon', 'training_dataset.csv')
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')
os.makedirs(MODEL_DIR, exist_ok=True)
MODEL_CLS_PATH = os.path.join(MODEL_DIR, 'xgb_classifier.json')
MODEL_RNK_PATH = os.path.join(MODEL_DIR, 'xgb_ranker.json')

FEATURES = [
    'tag_overlap_count','tag_overlap_weighted','travel_style_match','budget_similarity',
    'recent_dest_weight','favorite_dest_match','trip_likes_count','trip_saved_count',
    'creator_followed','social_lift','content_score','recency_days'
]

TEST_SIZE = float(os.environ.get('TRAIN_TEST_SPLIT', '0.2'))
RANDOM_STATE = int(os.environ.get('RANDOM_STATE', '42'))
SCALE_POS_WEIGHT_ENV = os.environ.get('SCALE_POS_WEIGHT', 'auto')
RANK_OBJECTIVE = os.environ.get('RANK_OBJECTIVE', '0').lower() in ('1','true','yes','y')
K_LIST = [int(k.strip()) for k in os.environ.get('METRIC_TOPK', '5,10').split(',') if k.strip().isdigit()]


def _stratify_by_user(df: pd.DataFrame, test_size: float, random_state: int):
    # Split users, then map rows accordingly (keeps user separation between sets)
    users = df['userId'].unique()
    u_train, u_test = train_test_split(users, test_size=test_size, random_state=random_state)
    train_df = df[df['userId'].isin(u_train)].copy()
    test_df = df[df['userId'].isin(u_test)].copy()
    return train_df, test_df

def _group_sizes_by_user(df: pd.DataFrame) -> list[int]:
    return [len(g) for _, g in df.groupby('userId')]

def _predict_scores(model, X: np.ndarray) -> np.ndarray:
    # Works for both classifier and ranker (ranker exposes predict)
    try:
        proba = model.predict_proba(X)[:,1]
        return proba
    except Exception:
        return model.predict(X)

def _dcg(rels: np.ndarray, k: int) -> float:
    rels_k = rels[:k]
    if rels_k.size == 0:
        return 0.0
    # Gains are rels; discount by log2 positions
    discounts = 1.0 / np.log2(np.arange(2, 2 + len(rels_k)))
    return float(np.sum(rels_k * discounts))

def _ndcg_at_k(y_true: np.ndarray, y_score: np.ndarray, k: int) -> float:
    # Sort by predicted score descending
    order = np.argsort(-y_score)
    rel_sorted = y_true[order]
    dcg_k = _dcg(rel_sorted, k)
    # Ideal DCG
    ideal = np.sort(y_true)[::-1]
    idcg_k = _dcg(ideal, k)
    if idcg_k == 0.0:
        return 0.0
    return dcg_k / idcg_k

def _hit_at_k(y_true: np.ndarray, y_score: np.ndarray, k: int) -> int:
    order = np.argsort(-y_score)
    rel_sorted = y_true[order]
    return int(rel_sorted[:k].sum() > 0)

def eval_ranking_per_user(df: pd.DataFrame, scores: np.ndarray, k_list: list[int]):
    # Compute metrics per user and return means
    metrics = {f'ndcg@{k}': [] for k in k_list}
    metrics.update({f'hit@{k}': [] for k in k_list})
    for uid, g in df.groupby('userId'):
        y = g['label'].astype(int).values
        s = scores[g.index.values]
        for k in k_list:
            metrics[f'ndcg@{k}'].append(_ndcg_at_k(y, s, k))
            metrics[f'hit@{k}'].append(_hit_at_k(y, s, k))
    # Means
    mean_metrics = {m: float(np.mean(v)) if len(v) else 0.0 for m, v in metrics.items()}
    return mean_metrics


def main():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    # Ensure feature presence
    missing = [f for f in FEATURES if f not in df.columns]
    if missing:
        raise ValueError(f"Missing features in dataset: {missing}")

    # Replace NaNs and non-numeric recency with 0
    for f in FEATURES:
        df[f] = pd.to_numeric(df[f], errors='coerce').fillna(0.0)

    # Stratified split by user (prevents leakage)
    train_df, test_df = _stratify_by_user(df, TEST_SIZE, RANDOM_STATE)

    X_train = train_df[FEATURES].values
    y_train = train_df['label'].astype(int).values
    X_test = test_df[FEATURES].values
    y_test = test_df['label'].astype(int).values

    if RANK_OBJECTIVE:
        # Use XGBRanker with user groups
        group_train = _group_sizes_by_user(train_df)
        group_test = _group_sizes_by_user(test_df)

        model = XGBRanker(
            n_estimators=400,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            random_state=RANDOM_STATE,
            tree_method='hist',
            objective='rank:pairwise',
            n_jobs=4,
        )
        model.fit(X_train, y_train, group=group_train)
        scores = _predict_scores(model, X_test)
        metrics = eval_ranking_per_user(test_df.reset_index(drop=False), scores, K_LIST)
        print(f"RANK mode (users test/train: {test_df['userId'].nunique()}/{train_df['userId'].nunique()}) → " +
              ", ".join([f"{k}={v:.4f}" for k, v in metrics.items()]))
        try:
            model.save_model(MODEL_RNK_PATH)
            print(f"Saved ranker model to {MODEL_RNK_PATH}")
        except Exception as e:
            print(f"[warn] Could not save ranker: {e}")
    else:
        # Classification with class weights
        if SCALE_POS_WEIGHT_ENV == 'auto':
            pos = max(1, int(y_train.sum()))
            neg = max(1, int((y_train == 0).sum()))
            scale_pos_weight = neg / pos
        else:
            try:
                scale_pos_weight = float(SCALE_POS_WEIGHT_ENV)
            except Exception:
                scale_pos_weight = 1.0

        model = XGBClassifier(
            n_estimators=400,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            eval_metric='auc',
            n_jobs=4,
            random_state=RANDOM_STATE,
            tree_method='hist',
            scale_pos_weight=scale_pos_weight,
        )
        model.fit(X_train, y_train)
        scores = _predict_scores(model, X_test)
        try:
            auc = roc_auc_score(y_test, scores)
            print(f"AUC: {auc:.4f} (test users={test_df['userId'].nunique()}, train users={train_df['userId'].nunique()})")
        except Exception:
            print("AUC: n/a (only one class present in test)")
        metrics = eval_ranking_per_user(test_df.reset_index(drop=False), scores, K_LIST)
        print(", ".join([f"{k}={v:.4f}" for k, v in metrics.items()]))
        try:
            model.save_model(MODEL_CLS_PATH)
            print(f"Saved classifier model to {MODEL_CLS_PATH}")
        except Exception as e:
            print(f"[warn] Could not save classifier: {e}")


if __name__ == '__main__':
    main()
