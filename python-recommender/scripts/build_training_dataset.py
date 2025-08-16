"""
Build a training dataset by joining data_testathon CSVs with MongoDB users/trips
and computing features from user preferences and trip attributes.

Inputs:
- data_testathon/relevance-*.csv: rows of (userId, tripId, label=1/0)
- data_testathon/eval-*.csv: recommendation exposures per user (we use as candidates)
- MongoDB: users (preferences, followings), trips (tags, destination, budget, likes, savedBy, owner)

Output:
- data_testathon/training_dataset.csv with rows (userId, tripId, label, features...)

Usage:
- Set MONGO_URI env var if different from app.py; otherwise fallback to the same URI.
- Run: python python-recommender/scripts/build_training_dataset.py

Notes:
- We maximize coverage by treating every (user,trip) from eval files as an exposure; label is looked up from relevance files (default 0 if absent).
- We skip pairs where user or trip is missing in Mongo.
- Features include tag overlap, style match, budget similarity, destination matches, popularity, social, and a content-like score.
"""
from __future__ import annotations
import os
import csv
import sys
import glob
from typing import Dict, Tuple, List, Any, Set
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import MongoClient

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'data_testathon')
OUTPUT_PATH = os.path.join(DATA_DIR, 'training_dataset.csv')

# Default to the same URI used by app.py if MONGO_URI isn't set
DEFAULT_MONGO_URI = "mongodb://appuser1:appuser1@ac-pzmwfhj-shard-00-00.jxzjzuo.mongodb.net:27017,ac-pzmwfhj-shard-00-01.jxzjzuo.mongodb.net:27017,ac-pzmwfhj-shard-00-02.jxzjzuo.mongodb.net:27017/recommendation_dataset?ssl=true&replicaSet=atlas-tq5bms-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0"
MONGO_URI = os.environ.get('MONGO_URI', DEFAULT_MONGO_URI)
DB_NAME = os.environ.get('MONGO_DB_NAME', 'recommendation_dataset')
USERS_COLL = os.environ.get('MONGO_USERS_COLL', 'users')
TRIPS_COLL = os.environ.get('MONGO_TRIPS_COLL', 'trips')

# Content-like score weights (align with app.py defaults)
WEIGHT_TAG = float(os.environ.get('REC_WEIGHT_TAG', '2.0'))
WEIGHT_BUDGET = float(os.environ.get('REC_WEIGHT_BUDGET', '1.0'))
WEIGHT_DESTINATION = float(os.environ.get('REC_WEIGHT_DESTINATION', '1.5'))
WEIGHT_TRAVEL_STYLE = float(os.environ.get('REC_WEIGHT_STYLE', '1.0'))


def _to_str_id(x: Any) -> str:
    if isinstance(x, ObjectId):
        return str(x)
    return str(x) if x is not None else ''


def _to_count_dict(val: Any) -> Dict[str, float]:
    if isinstance(val, dict):
        return {str(k): float(v) for k, v in val.items() if k}
    if isinstance(val, list):
        return {str(k): 1.0 for k in val if k}
    return {}


def _budget_similarity(user_b: Any, trip_b: Any) -> float:
    try:
        ub = float(user_b) if user_b is not None else None
        tb = float(trip_b) if trip_b is not None else None
    except Exception:
        return 0.0
    if not ub or not tb:
        return 0.0
    denom = max(ub, tb, 1.0)
    return max(0.0, 1.0 - abs(ub - tb) / denom)


def _safe_len(x: Any) -> int:
    try:
        return len(x or [])
    except Exception:
        return 0


def _infer_headers(headers: List[str]) -> Tuple[str, str, str|None]:
    """Guess user, trip, and label columns from a CSV header."""
    lower = [h.strip().lower() for h in headers]
    user_col = None
    trip_col = None
    label_col = None
    for h in lower:
        if user_col is None and h in ('user', 'userid', 'user_id', 'uid'):
            user_col = headers[lower.index(h)]
        if trip_col is None and h in ('trip', 'tripid', 'trip_id', 'tid', 'item', 'itemid', 'item_id'):
            trip_col = headers[lower.index(h)]
        if label_col is None and h in ('label', 'relevance', 'liked', 'y', 'target', 'value', 'isliked', 'is_liked'):
            label_col = headers[lower.index(h)]
    return user_col, trip_col, label_col


def _guess_binary_label_col(rows: List[dict], headers: List[str], exclude: Set[str]) -> str|None:
    """Try to guess a label column: one that looks binary (0/1/true/false) across sample rows."""
    candidates = [h for h in headers if h not in exclude]
    sample = rows[:200] if len(rows) > 200 else rows
    for h in candidates:
        ok = True
        seen_any = False
        for r in sample:
            if h not in r:
                ok = False
                break
            v = str(r.get(h)).strip().lower()
            if v == '' or v == 'none':
                continue
            seen_any = True
            if v not in ('0','1','true','false','yes','no','y','n'):
                ok = False
                break
        if ok and seen_any:
            return h
    return None


def load_relevance_map() -> Dict[Tuple[str, str], int]:
    rel_map: Dict[Tuple[str, str], int] = {}
    total_pos = 0
    file_count = 0
    for path in glob.glob(os.path.join(DATA_DIR, 'relevance-*.csv')):
        with open(path, 'r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames or []
            # Read all rows to allow guessing
            rows = list(reader)
            user_col, trip_col, label_col = _infer_headers(headers)
            # Apply defaults for ids
            user_col = user_col or ('userId' if 'userId' in headers else None)
            trip_col = trip_col or ('tripId' if 'tripId' in headers else None)
            # If label is unknown, try to guess a binary column
            if not label_col:
                label_col = _guess_binary_label_col(rows, headers, exclude=set(filter(None, [user_col, trip_col])))
            missing = [c for c in (user_col, trip_col, label_col) if not c or c not in headers]
            if missing:
                print(f"[warn] Skipping relevance file (missing cols {missing}): {os.path.basename(path)}")
                continue
            file_count += 1
            pos_in_file = 0
            for row in rows:
                u = _to_str_id(row.get(user_col))
                t = _to_str_id(row.get(trip_col))
                if not u or not t:
                    continue
                val_raw = str(row.get(label_col)).strip().lower()
                if val_raw in ('1','true','yes','y'):
                    y = 1
                elif val_raw in ('0','false','no','n',''):
                    y = 0
                else:
                    try:
                        y = 1 if int(val_raw) == 1 else 0
                    except Exception:
                        y = 0
                rel_map[(u, t)] = 1 if y == 1 else 0
                if y == 1:
                    total_pos += 1
                    pos_in_file += 1
            print(f"[info] Parsed relevance file {os.path.basename(path)}: +{pos_in_file} positives")
    print(f"[info] Loaded relevance labels: {len(rel_map)} pairs (+{total_pos} positives) from {file_count} files")
    return rel_map


def load_exposures() -> List[Tuple[str, str]]:
    pairs: Set[Tuple[str, str]] = set()
    cnt_rows = 0
    for path in glob.glob(os.path.join(DATA_DIR, 'eval-*.csv')):
        with open(path, 'r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            user_col, trip_col, _ = _infer_headers(reader.fieldnames or [])
            user_col = user_col or 'userId'
            trip_col = trip_col or 'tripId'
            if user_col not in (reader.fieldnames or []) or trip_col not in (reader.fieldnames or []):
                print(f"[warn] Skipping eval file (missing userId/tripId): {os.path.basename(path)}")
                continue
            for row in reader:
                u = _to_str_id(row.get(user_col))
                t = _to_str_id(row.get(trip_col))
                if u and t:
                    pairs.add((u, t))
                    cnt_rows += 1
    print(f"[info] Loaded exposures: {len(pairs)} unique pairs from {cnt_rows} rows")
    return list(pairs)


def fetch_users_and_trips(target_users: Set[str]) -> Tuple[Dict[str, dict], Dict[str, dict]]:
    client = MongoClient(MONGO_URI)
    db = client.get_database(DB_NAME)
    trips_coll = db.get_collection(TRIPS_COLL)
    users_coll = db.get_collection(USERS_COLL)

    # Load all trips once; build id->doc map with stringified ids
    trip_docs: Dict[str, dict] = {}
    for t in trips_coll.find({}):
        trip_docs[_to_str_id(t.get('_id'))] = t

    # Load users of interest
    user_docs: Dict[str, dict] = {}
    # Mongo IDs may be ObjectId; CSV ids are strings of the same hex -> we fetch by _id if possible
    # But to avoid per-id queries, we load all users and map
    for u in users_coll.find({}):
        user_docs[_to_str_id(u.get('_id'))] = u

    # Filter down to requested users
    if target_users:
        user_docs = {uid: doc for uid, doc in user_docs.items() if uid in target_users}

    print(f"[info] Loaded users={len(user_docs)} trips={len(trip_docs)} from Mongo")
    return user_docs, trip_docs


def compute_features(user_doc: dict, trip_doc: dict) -> Dict[str, Any]:
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

    # Overlaps
    tag_overlap_count = len(set(trip_tags) & set(user_tags.keys())) if trip_tags else 0
    tag_overlap_weighted = sum(user_tags.get(tag, 0.0) for tag in (trip_tags or []))

    travel_style_match = 1 if (user_style and trip_style and user_style == trip_style) else 0
    budget_similarity = _budget_similarity(user_budget, trip_budget)

    recent_dest_weight = float(recent_dests.get(trip_dest, 0.0)) if trip_dest else 0.0
    favorite_dest_match = 1 if (trip_dest and trip_dest in fav_dests) else 0

    # Popularity & social
    likes = trip_doc.get('likes') or []
    saved_by = trip_doc.get('savedBy') or []
    trip_likes_count = _safe_len(likes)
    trip_saved_count = _safe_len(saved_by)

    followings = set(user_doc.get('followings', []) or [])
    creator = _to_str_id(trip_doc.get('userId')) if trip_doc.get('userId') else None
    creator_followed = 1 if (creator and creator in followings) else 0

    # social lift: how many followings liked this trip
    likes_set = { _to_str_id(u) for u in likes }
    social_lift = len(followings & likes_set)

    # Content-like score (no like/save boost here)
    content_score = 0.0
    content_score += WEIGHT_TAG * tag_overlap_weighted
    content_score += WEIGHT_BUDGET * budget_similarity
    if trip_dest:
        content_score += WEIGHT_DESTINATION * recent_dests.get(trip_dest, 0.0)
    if travel_style_match:
        content_score += WEIGHT_TRAVEL_STYLE

    # Recency (optional if timestamps exist)
    created_at = trip_doc.get('createdAt')
    recency_days = None
    try:
        if isinstance(created_at, datetime):
            recency_days = max(0, (datetime.now(timezone.utc) - created_at).days)
    except Exception:
        recency_days = None

    return {
        'tag_overlap_count': tag_overlap_count,
        'tag_overlap_weighted': round(tag_overlap_weighted, 4),
        'travel_style_match': travel_style_match,
        'budget_similarity': round(budget_similarity, 4),
        'recent_dest_weight': round(recent_dest_weight, 4),
        'favorite_dest_match': favorite_dest_match,
        'trip_likes_count': trip_likes_count,
        'trip_saved_count': trip_saved_count,
        'creator_followed': creator_followed,
        'social_lift': social_lift,
        'content_score': round(content_score, 4),
        'recency_days': recency_days if recency_days is not None else ''
    }


def main():
    rel_map = load_relevance_map()
    exposures = load_exposures()

    # Target users present in either set
    target_users = {u for (u, _) in exposures}
    target_users.update(u for (u, t), y in rel_map.items())

    user_docs, trip_docs = fetch_users_and_trips(target_users)

    out_fields = [
        'userId', 'tripId', 'label',
        'tag_overlap_count', 'tag_overlap_weighted', 'travel_style_match', 'budget_similarity',
        'recent_dest_weight', 'favorite_dest_match', 'trip_likes_count', 'trip_saved_count',
        'creator_followed', 'social_lift', 'content_score', 'recency_days',
        # Optional raw fields for analysis
        'user_avgBudget', 'user_travelStyle', 'trip_destination', 'trip_travelStyle', 'trip_budget'
    ]

    wrote = 0
    skipped_missing = 0

    with open(OUTPUT_PATH, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=out_fields)
        writer.writeheader()

        # Build a fast reverse index of interactions per user for optional constraints (not strictly required)
        for (u, t) in exposures:
            user_doc = user_docs.get(u)
            trip_doc = trip_docs.get(t)
            if not user_doc or not trip_doc:
                skipped_missing += 1
                continue
            # Skip user's own trips
            if _to_str_id(trip_doc.get('userId')) == u:
                continue
            label = rel_map.get((u, t), 0)
            feats = compute_features(user_doc, trip_doc)
            row = {
                'userId': u,
                'tripId': t,
                'label': label,
                **feats,
                'user_avgBudget': user_doc.get('preferences',{}).get('avgBudget') or user_doc.get('avgBudget') or '',
                'user_travelStyle': user_doc.get('preferences',{}).get('travelStyle') or user_doc.get('travelStyle') or '',
                'trip_destination': trip_doc.get('destination') or '',
                'trip_travelStyle': trip_doc.get('travelStyle') or '',
                'trip_budget': trip_doc.get('budget') or ''
            }
            writer.writerow(row)
            wrote += 1

    print(f"[done] Wrote {wrote} rows to {OUTPUT_PATH}; skipped {skipped_missing} (missing user/trip)")


if __name__ == '__main__':
    main()
