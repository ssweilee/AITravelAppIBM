from __future__ import annotations
import os
import numpy as np
from xgboost import XGBClassifier, XGBRanker
from bson import ObjectId

# Paths relative to this package
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
MODEL_CLS_PATH = os.path.join(MODEL_DIR, 'xgb_classifier.json')
MODEL_RNK_PATH = os.path.join(MODEL_DIR, 'xgb_ranker.json')

FEATURES = [
    'tag_overlap_count','tag_overlap_weighted','travel_style_match','budget_similarity',
    'recent_dest_weight','favorite_dest_match','trip_likes_count','trip_saved_count',
    'creator_followed','social_lift','content_score','recency_days'
]

# Preference blending weights (env-tunable)
PREF_ALPHA = float(os.environ.get('RANKER_PREF_ALPHA', '1.0'))  # overall blend weight
PREF_W_TAG = float(os.environ.get('RANKER_PREF_W_TAG', '1.0'))
PREF_W_STYLE = float(os.environ.get('RANKER_PREF_W_STYLE', '1.0'))
PREF_W_BUDGET = float(os.environ.get('RANKER_PREF_W_BUDGET', '1.0'))
PREF_W_DEST = float(os.environ.get('RANKER_PREF_W_DEST', '1.0'))
DEBUG_LOG = os.environ.get('REC_DEBUG', 'false').lower() == 'true'

# Import feature builders from dataset builder to keep logic in sync
def _to_id(x):
    if isinstance(x, ObjectId):
        return str(x)
    return str(x) if x is not None else ''

def _to_count_dict(val):
    if isinstance(val, dict):
        return {str(k): float(v) for k, v in val.items() if k}
    if isinstance(val, list):
        return {str(k): 1.0 for k in val if k}
    return {}

def _budget_similarity(user_b, trip_b):
    try:
        ub = float(user_b) if user_b is not None else None
        tb = float(trip_b) if trip_b is not None else None
    except Exception:
        return 0.0
    if not ub or not tb:
        return 0.0
    denom = max(ub, tb, 1.0)
    return max(0.0, 1.0 - abs(ub - tb) / denom)

# Lightweight helpers

def _safe_len(x):
    try:
        return len(x or [])
    except Exception:
        return 0


def _popularity(trip):
    return _safe_len(trip.get('likes')) + 0.5 * _safe_len(trip.get('savedBy'))


def _recency_days(trip):
    created = trip.get('createdAt')
    try:
        import pandas as pd
        ts = pd.to_datetime(created, utc=True)
        return max(0.0, (pd.Timestamp.utcnow() - ts).days)
    except Exception:
        return 0.0


def build_features_row(user_doc: dict, trip_doc: dict) -> np.ndarray:
    prefs = (user_doc or {}).get('preferences', {}) or {}
    user_tags = _to_count_dict(prefs.get('tags', {}))
    user_style = prefs.get('travelStyle') or user_doc.get('travelStyle')
    user_budget = prefs.get('avgBudget') or user_doc.get('avgBudget')
    recent_dests = _to_count_dict(prefs.get('recentDestinations', {}))
    fav_dests = set(prefs.get('favoriteDestinations', []) or [])

    trip_tags = trip_doc.get('tags') or []
    trip_style = trip_doc.get('travelStyle')
    trip_budget = trip_doc.get('budget')
    trip_dest = trip_doc.get('destination')

    tag_overlap_count = len(set(trip_tags) & set(user_tags.keys())) if trip_tags else 0
    tag_overlap_weighted = float(sum(user_tags.get(tag, 0.0) for tag in (trip_tags or [])))
    travel_style_match = 1.0 if (user_style and trip_style and user_style == trip_style) else 0.0
    budget_similarity = float(_budget_similarity(user_budget, trip_budget))
    recent_dest_weight = float(recent_dests.get(trip_dest, 0.0) if trip_dest else 0.0)
    favorite_dest_match = 1.0 if (trip_dest and trip_dest in fav_dests) else 0.0

    likes = trip_doc.get('likes') or []
    saved_by = trip_doc.get('savedBy') or []
    trip_likes_count = float(len(likes))
    trip_saved_count = float(len(saved_by))

    followings = set(user_doc.get('followings', []) or [])
    creator = _to_id(trip_doc.get('userId')) if trip_doc.get('userId') else None
    creator_followed = 1.0 if (creator and creator in followings) else 0.0

    likes_set = { _to_id(u) for u in likes }
    social_lift = float(len(followings & likes_set))

    # simple content_score proxy like builder (weights are not needed here; model learns)
    content_score = (
        tag_overlap_weighted + budget_similarity + recent_dest_weight + travel_style_match
    )

    recency_days = _recency_days(trip_doc)

    vals = [
        tag_overlap_count, tag_overlap_weighted, travel_style_match, budget_similarity,
        recent_dest_weight, favorite_dest_match, trip_likes_count, trip_saved_count,
        creator_followed, social_lift, content_score, recency_days
    ]
    return np.array(vals, dtype=float)


def load_model():
    # Prefer ranker if present
    if os.path.exists(MODEL_RNK_PATH):
        m = XGBRanker()
        m.load_model(MODEL_RNK_PATH)
        return m, 'rank'
    if os.path.exists(MODEL_CLS_PATH):
        m = XGBClassifier()
        m.load_model(MODEL_CLS_PATH)
        return m, 'cls'
    return None, None


def recommend_by_ranker(user_doc: dict, all_trips: list[dict], top_k: int = 10, candidates: list[dict] | None = None):
    model, mode = load_model()
    if model is None:
        print("[ranker] No model loaded.")
        return []
    user_id = _to_id(user_doc.get('_id') or user_doc.get('userId'))
    # Build candidates if not provided: use all trips not owned by user
    candidates = candidates if candidates is not None else [t for t in all_trips if _to_id(t.get('userId')) != user_id]
    print(f"[ranker] Model mode: {mode}, Candidates: {len(candidates)}")
    if not candidates:
        print("[ranker] No candidates to rank.")
        return []
    try:
        X = np.vstack([build_features_row(user_doc, t) for t in candidates])
    except Exception as e:
        print(f"[ranker] Error building features: {e}")
        return []
    # Scores
    try:
        scores = model.predict_proba(X)[:,1]
    except Exception as e1:
        try:
            scores = model.predict(X)
        except Exception as e2:
            print(f"[ranker] Model prediction error: {e1}, {e2}")
            return []

    # Preference signal emphasizing tags, destinations, budget, and travel style
    # Indices: 1=tag_overlap_weighted, 2=style_match, 3=budget_similarity, 4=recent_dest_weight
    tag_col = X[:, 1]
    style_col = X[:, 2]
    budget_col = X[:, 3]
    dest_col = X[:, 4]
    # Normalize tag and destination by pool max to keep 0..1 range
    tag_max = float(np.max(tag_col)) if tag_col.size and np.max(tag_col) > 0 else 1.0
    dest_max = float(np.max(dest_col)) if dest_col.size and np.max(dest_col) > 0 else 1.0
    pref_signal = (
        PREF_W_TAG * (tag_col / tag_max) +
        PREF_W_STYLE * style_col +
        PREF_W_BUDGET * budget_col +
        PREF_W_DEST * (dest_col / dest_max)
    )

    final_scores = scores + PREF_ALPHA * pref_signal
    if DEBUG_LOG:
        try:
            print(f"[ranker] mean(scores)={float(np.mean(scores)):.4f} mean(pref)={float(np.mean(pref_signal)):.4f} alpha={PREF_ALPHA}")
        except Exception as e:
            print(f"[ranker] Debug log error: {e}")

    ranked = sorted(zip(final_scores, candidates), key=lambda x: x[0], reverse=True)[:top_k]
    print(f"[ranker] Returning {len(ranked)} ranked recommendations.")
    return [t for _, t in ranked]
