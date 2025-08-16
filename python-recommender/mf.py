"""Matrix Factorization (Implicit ALS) for travel recommender.

Lightweight in-memory implicit feedback ALS implementation (no external deps
besides numpy) intended for moderate data sizes. Rebuilds periodically and
kept in module-level cache.

References:
 - Hu, Koren, Volinsky (2008) Collaborative Filtering for Implicit Feedback Datasets.

We treat any like/save/ownership as an implicit interaction r_ui = 1.
Confidence: c_ui = 1 + alpha * r_ui. Preference p_ui = 1 if r_ui > 0 else 0.
Objective minimized via alternating least squares.

NOTE: For larger scale, consider using the 'implicit' Python package with a
proper sparse matrix backend or a service-level offline training job.
"""
from __future__ import annotations
import time
import os
from typing import Dict, List, Tuple
from bson import ObjectId
import numpy as np

# ---- Env / hyperparameters ----
MF_FACTORS = int(os.environ.get('REC_MF_FACTORS', '32'))
MF_REG = float(os.environ.get('REC_MF_REG', '0.1'))
MF_ALPHA = float(os.environ.get('REC_MF_ALPHA', '40.0'))
MF_ITER = int(os.environ.get('REC_MF_ITER', '10'))
MF_REBUILD_MINUTES = int(os.environ.get('REC_MF_REBUILD_MIN', '10'))
DEBUG_LOG = os.environ.get('REC_DEBUG', 'false').lower() == 'true'

# ---- Module-level cache ----
_model_cache = {
    'built_at': 0.0,
    'user_index': {},   # user_id -> idx
    'item_index': {},   # trip_id -> idx
    'users_rev': [],    # idx -> user_id
    'items_rev': [],    # idx -> trip_id
    'X': None,          # user factors (U x F)
    'Y': None,          # item factors (I x F)
    'shape': (0,0)
}


def _to_id(x):
    if isinstance(x, ObjectId):
        return str(x)
    return str(x)


def _needs_rebuild(num_users: int, num_items: int) -> bool:
    if _model_cache['X'] is None:
        return True
    age_min = (time.time() - _model_cache['built_at']) / 60.0
    if age_min > MF_REBUILD_MINUTES:
        return True
    U, I = _model_cache['shape']
    return U != num_users or I != num_items


def _build_interactions(all_trips: List[dict]):
    """Build mapping and sparse-like coordinate lists for implicit interactions."""
    user_index: Dict[str,int] = {}
    item_index: Dict[str,int] = {}
    users_rev: List[str] = []
    items_rev: List[str] = []
    rows = []
    cols = []

    for trip in all_trips:
        tid = _to_id(trip.get('_id'))
        if tid not in item_index:
            item_index[tid] = len(items_rev)
            items_rev.append(tid)
        interactions = set()
        for field in ('likes','savedBy'):
            vals = trip.get(field) or []
            for u in vals:
                interactions.add(_to_id(u))
        owner = trip.get('userId')
        if owner:
            interactions.add(_to_id(owner))
        j = item_index[tid]
        for uid in interactions:
            if uid not in user_index:
                user_index[uid] = len(users_rev)
                users_rev.append(uid)
            i = user_index[uid]
            rows.append(i)
            cols.append(j)
    return user_index, item_index, users_rev, items_rev, rows, cols


def _als_factorize(all_trips: List[dict]):
    user_index, item_index, users_rev, items_rev, rows, cols = _build_interactions(all_trips)
    num_users = len(users_rev)
    num_items = len(items_rev)
    if num_users == 0 or num_items == 0:
        return None
    F = MF_FACTORS
    # Build CSR-like structure for fast access: user -> list of (item_idx)
    user_items = [[] for _ in range(num_users)]
    for r, c in zip(rows, cols):
        user_items[r].append(c)
    item_users = [[] for _ in range(num_items)]
    for r, c in zip(rows, cols):
        item_users[c].append(r)

    # Initialize factors
    rng = np.random.default_rng(42)
    X = 0.01 * rng.standard_normal((num_users, F))
    Y = 0.01 * rng.standard_normal((num_items, F))
    I_f = np.eye(F)

    alpha = MF_ALPHA
    reg = MF_REG

    for it in range(MF_ITER):
        # --- Update user factors ---
        YtY = Y.T @ Y + reg * I_f
        for u in range(num_users):
            items = user_items[u]
            if not items:
                continue
            CuI = np.zeros((F, F))
            Pu = np.zeros(F)
            for j in items:
                yj = Y[j]
                c = 1.0 + alpha  # binary implicit -> c_ui = 1 + alpha
                CuI += (c - 1.0) * np.outer(yj, yj)
                Pu += c * yj  # equivalent to Y^T C_u p_u with p=1
            A = YtY + CuI
            try:
                X[u] = np.linalg.solve(A, Pu)
            except np.linalg.LinAlgError:
                X[u] = np.linalg.pinv(A) @ Pu
        # --- Update item factors ---
        XtX = X.T @ X + reg * I_f
        for j in range(num_items):
            users = item_users[j]
            if not users:
                continue
            CuI = np.zeros((F, F))
            Pj = np.zeros(F)
            for u in users:
                xu = X[u]
                c = 1.0 + alpha
                CuI += (c - 1.0) * np.outer(xu, xu)
                Pj += c * xu
            A = XtX + CuI
            try:
                Y[j] = np.linalg.solve(A, Pj)
            except np.linalg.LinAlgError:
                Y[j] = np.linalg.pinv(A) @ Pj
        if DEBUG_LOG:
            print(f"[mf] Iter {it+1}/{MF_ITER} done")

    _model_cache.update({
        'built_at': time.time(),
        'user_index': user_index,
        'item_index': item_index,
        'users_rev': users_rev,
        'items_rev': items_rev,
        'X': X,
        'Y': Y,
        'shape': (num_users, num_items)
    })
    if DEBUG_LOG:
        print(f"[mf] Model built users={num_users} items={num_items} factors={F}")


def ensure_model(all_trips: List[dict]):
    # Determine counts BEFORE deciding
    user_index, item_index, users_rev, items_rev, rows, cols = _build_interactions(all_trips)
    if _needs_rebuild(len(users_rev), len(items_rev)):
        if DEBUG_LOG:
            print('[mf] Rebuilding matrix factorization model')
        _als_factorize(all_trips)


def recommend_mf(user_id: str, all_trips: List[dict], top_k: int = 10):
    if not user_id:
        return []
    ensure_model(all_trips)
    if _model_cache['X'] is None:
        return []
    user_index = _model_cache['user_index']
    item_index = _model_cache['item_index']
    users_rev = _model_cache['users_rev']
    items_rev = _model_cache['items_rev']
    X = _model_cache['X']
    Y = _model_cache['Y']

    if user_id not in user_index:
        # Cold start -> popularity proxy using interaction counts
        interaction_counts = {tid:0 for tid in items_rev}
        for trip in all_trips:
            tid = _to_id(trip.get('_id'))
            cnt = 0
            for f in ('likes','savedBy'):
                cnt += len(trip.get(f) or [])
            interaction_counts[tid] = cnt
        ranked = sorted(interaction_counts.items(), key=lambda x: x[1], reverse=True)
        trip_lookup = {_to_id(t.get('_id')): t for t in all_trips}
        out = []
        for tid,_ in ranked:
            t = trip_lookup.get(tid)
            if t and _to_id(t.get('userId')) != user_id:
                out.append(t)
            if len(out) >= top_k:
                break
        return out

    uidx = user_index[user_id]
    user_vec = X[uidx]

    # Score all items
    scores = Y @ user_vec

    # Determine interacted items to skip
    interacted = set()
    for trip in all_trips:
        tid = _to_id(trip.get('_id'))
        likes = {_to_id(u) for u in (trip.get('likes') or [])}
        saved = {_to_id(u) for u in (trip.get('savedBy') or [])}
        owner = _to_id(trip.get('userId')) if trip.get('userId') else None
        if user_id in likes or user_id in saved or owner == user_id:
            interacted.add(tid)

    trip_lookup = {_to_id(t.get('_id')): t for t in all_trips}
    scored = []
    for tid, j in item_index.items():
        if tid in interacted:
            continue
        trip = trip_lookup.get(tid)
        if not trip:
            continue
        # Skip own trips
        if _to_id(trip.get('userId')) == user_id:
            continue
        scored.append((scores[j], trip))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [t for _, t in scored[:top_k]]
