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
# Optional weights / bonuses for user-based CF
USERCF_FOLLOW_BONUS = float(os.environ.get('REC_USERCF_FOLLOW_BONUS', '0.05'))  # similarity bonus if the other user is followed
USERCF_MIN_OVERLAP = int(os.environ.get('REC_USERCF_MIN_OVERLAP', '1'))        # minimum overlapping trips to consider user similarity
USERCF_TOP_NEIGHBORS = int(os.environ.get('REC_USERCF_TOP_NEIGHBORS', '50'))   # cap neighbors

# Item-CF knobs
ITEMCF_POP_WEIGHT = float(os.environ.get('REC_ITEMCF_POP_WEIGHT', '0.05'))      # small popularity prior weight (reduce popularity dominance)
ITEMCF_USER_DAMPING = float(os.environ.get('REC_ITEMCF_USER_DAMPING', '1.0'))   # increase to dampen very active users more strongly
ITEMCF_MAX_CANDIDATES = int(os.environ.get('REC_ITEMCF_MAX_CANDIDATES', '5000'))# safety cap

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

def build_user_trip_index(all_trips: List[dict]):
    """Return mapping user_id -> set(trip_ids) they interacted with (like/save/own)."""
    user_map: Dict[str, Set[str]] = {}
    for trip in all_trips:
        tid = _to_str_id(trip.get('_id'))
        owner = _to_str_id(trip.get('userId')) if trip.get('userId') else None
        participants = set()
        for field in ('likes', 'savedBy'):
            vals = trip.get(field) or []
            for uid in vals:
                participants.add(_to_str_id(uid))
        if owner:
            participants.add(owner)
        for u in participants:
            user_map.setdefault(u, set()).add(tid)
    return user_map

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
        if DEBUG_LOG:
            print("[collab] No interacted trips; using popularity fallback")
        return popularity_fallback()

    interaction_index = build_interaction_index(all_trips)
    user_trip_index = build_user_trip_index(all_trips)

    # Pull explicit preferences (front-end form) to steer CF outputs
    explicit_tags = set((user_profile.get('tags') or {}).keys()) if isinstance(user_profile.get('tags'), dict) else set(user_profile.get('tags') or [])
    explicit_dests = set((user_profile.get('recentDestinations') or {}).keys()) if isinstance(user_profile.get('recentDestinations'), dict) else set(user_profile.get('recentDestinations') or [])
    explicit_style = user_profile.get('travelStyle')
    explicit_budget = user_profile.get('avgBudget')

    # Build quick lookup for trips
    trip_lookup = { _to_str_id(t.get('_id')): t for t in all_trips }

    # Neighbor users: anyone who interacted with the user's interacted trips
    neighbor_users: Set[str] = set()
    for t_id in interacted:
        neighbor_users |= interaction_index.get(t_id, set())
    neighbor_users.discard(_to_str_id(user_id))

    if DEBUG_LOG:
        print(f"[collab] neighbor_users={len(neighbor_users)} from interacted={len(interacted)}")

    # If no neighbor users, try classic item-based Jaccard as a fallback path
    if not neighbor_users:
        if DEBUG_LOG:
            print("[collab] No neighbor users; falling back to item-based Jaccard")
        # Precompute user sets for interacted items
        interacted_user_sets = { tid: interaction_index.get(tid, set()) for tid in interacted }
        scores: Dict[str, float] = {}
        for cand_id, cand_users in interaction_index.items():
            if cand_id in interacted:
                continue
            trip = trip_lookup.get(cand_id)
            if not trip:
                continue
            if _to_str_id(trip.get('userId')) == user_id:
                continue
            total_sim = 0.0
            for t_id, t_users in interacted_user_sets.items():
                if not t_users or not cand_users:
                    continue
                sim = jaccard(t_users, cand_users)
                if sim > 0:
                    total_sim += sim
            if total_sim == 0:
                continue
            pop = log(len(cand_users) + 1, 10)
            score = total_sim * (1 + ITEMCF_POP_WEIGHT * pop)
            random.seed(cand_id)
            score += random.random() * 1e-6
            scores[cand_id] = score
        if not scores:
            return popularity_fallback()
        ranked_ids = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
        return [trip_lookup[tid] for tid, _ in ranked_ids]

    # Co-occurrence CF: "people who liked your trips also liked …"
    followings = set(_to_str_id(u) for u in (user_profile.get('followings') or []))
    candidate_scores: Dict[str, float] = {}

    # Precompute activity counts for damping
    neighbor_activity = {u: len(user_trip_index.get(u, [])) for u in neighbor_users}

    for u in neighbor_users:
        trips_by_u = user_trip_index.get(u, set())
        if not trips_by_u:
            continue
        # Dampen very active users; add followings bonus as multiplier
        damp = 1.0 / (1.0 + ITEMCF_USER_DAMPING * log(neighbor_activity.get(u, 0) + 1, 10))
        if u in followings:
            damp *= (1.0 + USERCF_FOLLOW_BONUS)
        for tid in trips_by_u:
            if tid in interacted:
                continue
            trip = trip_lookup.get(tid)
            if not trip:
                continue
            if _to_str_id(trip.get('userId')) == user_id:
                continue
            # Preference steering: boost trips matching explicit prefs
            pref_boost = 1.0
            if explicit_style and trip.get('travelStyle') == explicit_style:
                pref_boost += 0.4
            if explicit_dests and trip.get('destination') in explicit_dests:
                pref_boost += 0.4
            if explicit_tags and any(tag in explicit_tags for tag in (trip.get('tags') or [])):
                pref_boost += 0.6
            # Light budget closeness boost
            try:
                if explicit_budget and trip.get('budget'):
                    eb = float(explicit_budget); tb = float(trip.get('budget'))
                    pref_boost += max(0.0, 0.5 * (1.0 - abs(eb - tb) / max(eb, tb)))
            except Exception:
                pass
            candidate_scores[tid] = candidate_scores.get(tid, 0.0) + damp * pref_boost
            if len(candidate_scores) > ITEMCF_MAX_CANDIDATES:
                break

    if not candidate_scores:
        if DEBUG_LOG:
            print("[collab] No co-occurrence candidates; using popularity fallback")
        return popularity_fallback()

    # Add a tiny popularity prior to break ties without dominating
    for tid in list(candidate_scores.keys()):
        cand_users = interaction_index.get(tid, set())
        pop = log(len(cand_users) + 1, 10)
        candidate_scores[tid] += ITEMCF_POP_WEIGHT * pop

    ranked = sorted(candidate_scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
    return [trip_lookup[tid] for tid, _ in ranked]

# --- User-based collaborative filtering ---
def user_based_collaborative_recommendations(user_profile: dict, all_trips: List[dict], top_k: int = TOP_K_DEFAULT):
    """Recommend trips using user-user similarity (overlap of interacted trips + follow bonus).

    Steps:
      1. Build user -> interacted trip set (likes OR savedBy OR ownership).
      2. Compute similarity between target user and others via Jaccard.
         similarity = |A∩B| / |A∪B| ; require at least USERCF_MIN_OVERLAP in intersection.
         If other user is in followings, add USERCF_FOLLOW_BONUS to similarity.
      3. Keep top USERCF_TOP_NEIGHBORS neighbors.
      4. Aggregate candidate trips = union of neighbor interacted trips not already in target interacted & not owned by target.
         Score(candidate) = Σ(sim(neighbor)) over neighbors who interacted with candidate (optionally weight by 1/log(freq)).
      5. Return top_k by score.
    """
    user_id = user_profile.get('userId')
    if not user_id:
        return []

    followings = set(user_profile.get('followings', []) or [])

    # Build user -> interacted trips mapping
    user_trip_sets: Dict[str, Set[str]] = {}
    trip_docs: Dict[str, dict] = {}

    for trip in all_trips:
        tid = _to_str_id(trip.get('_id'))
        owner = _to_str_id(trip.get('userId')) if trip.get('userId') else None
        trip_docs[tid] = trip
        participants = set()
        for field in ('likes', 'savedBy'):
            vals = trip.get(field) or []
            for u in vals:
                participants.add(_to_str_id(u))
        if owner:
            participants.add(owner)
        for u in participants:
            user_trip_sets.setdefault(u, set()).add(tid)

    target_set = user_trip_sets.get(user_id, set())
    if not target_set:
        # fallback: delegate to item popularity (reuse popularity_fallback from earlier)
        # Reuse lightweight method: count interactions size
        popularity_scores = []
        for t in all_trips:
            tid = _to_str_id(t.get('_id'))
            if _to_str_id(t.get('userId')) == user_id:
                continue
            users = 0
            for field in ('likes', 'savedBy'):
                users += len(t.get(field) or [])
            popularity_scores.append((users, tid))
        popularity_scores.sort(key=lambda x: x[0], reverse=True)
        return [trip_docs[tid] for _, tid in popularity_scores[:top_k]]

    # Compute similarities
    sims: List[tuple[str, float]] = []
    for other_user, trips in user_trip_sets.items():
        if other_user == user_id:
            continue
        inter = target_set & trips
        if len(inter) < USERCF_MIN_OVERLAP:
            continue
        union = target_set | trips
        if not union:
            continue
        j = len(inter) / len(union)
        if other_user in followings:
            j += USERCF_FOLLOW_BONUS
        if j > 0:
            sims.append((other_user, j))

    if not sims:
        return []

    sims.sort(key=lambda x: x[1], reverse=True)
    sims = sims[:USERCF_TOP_NEIGHBORS]
    neighbor_lookup = {u: s for u, s in sims}

    # Aggregate candidate scores
    candidate_scores: Dict[str, float] = {}
    for neighbor, sim in sims:
        trips = user_trip_sets.get(neighbor, set())
        for tid in trips:
            if tid in target_set:
                continue
            trip_doc = trip_docs.get(tid)
            if not trip_doc:
                continue
            if _to_str_id(trip_doc.get('userId')) == user_id:
                continue
            candidate_scores[tid] = candidate_scores.get(tid, 0.0) + sim

    if not candidate_scores:
        return []

    ranked = sorted(candidate_scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
    return [trip_docs[tid] for tid, _ in ranked]
