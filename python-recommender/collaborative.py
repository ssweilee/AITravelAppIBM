"""Collaborative filtering utilities for the travel recommender.

Approach: Lightweight item-based collaborative filtering using implicit feedback
(likes + saves). For each trip, we build the set of userIds who interacted
(liked or saved). Similarity between two trips = Jaccard similarity of these
user sets. A user's recommendation score for a candidate trip is the sum of its
similarities with the user's own interacted trips, optionally adjusted by a
popularity prior and minor freshness noise to break ties.

This is intentionally simple (no matrix factorization) to keep latency low and
avoid extra dependencies. Can be extended later with implicit ALS or LightFM.
"""
from __future__ import annotations
from math import log
from typing import Dict, List, Set, Any
from bson import ObjectId
import random
import os

TOP_K_DEFAULT = 10

DEBUG_LOG = os.environ.get('REC_DEBUG', 'false').lower() == 'true'

# --- Helpers ---

def _to_str_id(x):
    if isinstance(x, ObjectId):
        return str(x)
    return str(x)

def build_interaction_index(all_trips: List[dict]):
    """Return mapping trip_id -> set(user_ids) who liked or saved the trip."""
    index: Dict[str, Set[str]] = {}
    for trip in all_trips:
        tid = _to_str_id(trip.get('_id'))
        users = set()
        for field in ('likes', 'savedBy'):
            vals = trip.get(field) or []
            for uid in vals:
                users.add(_to_str_id(uid))
        index[tid] = users
    return index

def infer_user_interactions(user_id: str, all_trips: List[dict]):
    """Derive which trips the user has liked/saved from trip docs."""
    liked = []
    for trip in all_trips:
        tid = _to_str_id(trip.get('_id'))
        likes = { _to_str_id(u) for u in (trip.get('likes') or []) }
        saved = { _to_str_id(u) for u in (trip.get('savedBy') or []) }
        if user_id in likes or user_id in saved:
            liked.append(tid)
    return liked

def jaccard(a: Set[str], b: Set[str]) -> float:
    if not a and not b:
        return 0.0
    inter = a & b
    if not inter:
        return 0.0
    return len(inter) / len(a | b)

# --- Main collaborative recommendation function ---

def collaborative_recommendations(user_profile: dict, all_trips: List[dict], top_k: int = TOP_K_DEFAULT):
    user_id = user_profile.get('userId')
    if not user_id:
        return []

    def popularity_fallback():
        # Build interaction index (trip -> user set) and rank by size
        interaction_index_local = build_interaction_index(all_trips)
        trip_lookup_local = { _to_str_id(t.get('_id')): t for t in all_trips }
        ranked = []
        for tid, users in interaction_index_local.items():
            trip = trip_lookup_local.get(tid)
            if not trip:
                continue
            # Skip user's own trips
            if _to_str_id(trip.get('userId')) == user_id:
                continue
            ranked.append((len(users), tid))
        ranked.sort(key=lambda x: x[0], reverse=True)
        top = [trip_lookup_local[tid] for _, tid in ranked if trip_lookup_local.get(tid)]
        if DEBUG_LOG:
            print(f"[collab] Popularity fallback returning {len(top[:top_k])} trips")
        return top[:top_k]

    # Collect the user's interacted trip ids from profile (if provided)
    interacted = set()
    for key in ('likedTripsIds', 'savedTripsIds'):
        vals = user_profile.get(key)
        if isinstance(vals, list):
            interacted.update(_to_str_id(v) for v in vals)

    # Fallback: infer from trips if empty
    if not interacted:
        inferred = infer_user_interactions(user_id, all_trips)
        interacted.update(inferred)

    if DEBUG_LOG:
        print(f"[collab] user_id={user_id} interacted_count={len(interacted)}")

    if not interacted:
        # No signals -> popularity fallback
        return popularity_fallback()

    interaction_index = build_interaction_index(all_trips)

    # Build quick lookup for trips
    trip_lookup = { _to_str_id(t.get('_id')): t for t in all_trips }

    # Precompute user sets for interacted items
    interacted_user_sets = { tid: interaction_index.get(tid, set()) for tid in interacted }

    scores: Dict[str, float] = {}

    for cand_id, cand_users in interaction_index.items():
        if cand_id in interacted:
            continue  # skip already interacted
        trip = trip_lookup.get(cand_id)
        if not trip:
            continue
        # Skip user's own trips
        if _to_str_id(trip.get('userId')) == user_id:
            continue
        total_sim = 0.0
        # Sum similarities to each interacted item
        for t_id, t_users in interacted_user_sets.items():
            if not t_users or not cand_users:
                continue
            sim = jaccard(t_users, cand_users)
            if sim > 0:
                total_sim += sim
        if total_sim == 0:
            continue
        # Popularity prior (diminishing returns via log)
        pop = log(len(cand_users) + 1, 10)  # base 10 log for scale control
        score = total_sim * (1 + 0.15 * pop)
        # Add tiny noise for deterministic tie-breaking (seeded by id)
        random.seed(cand_id)
        score += random.random() * 1e-6
        scores[cand_id] = score

    if DEBUG_LOG:
        print(f"[collab] candidate_scored={len(scores)}")

    if not scores:
        # Nothing similar scored -> popularity fallback
        return popularity_fallback()

    ranked_ids = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
    ranked = [trip_lookup[tid] for tid, _ in ranked_ids]
    return ranked
