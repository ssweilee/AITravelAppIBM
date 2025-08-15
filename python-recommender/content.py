from __future__ import annotations
import os
from datetime import datetime, timezone
from math import exp

# Environment-driven weights (with sane fallbacks)
WEIGHT_TAG = float(os.environ.get('REC_WEIGHT_TAG', '3.0'))
WEIGHT_BUDGET = float(os.environ.get('REC_WEIGHT_BUDGET', '1.5'))
WEIGHT_DESTINATION = float(os.environ.get('REC_WEIGHT_DESTINATION', '2.5'))
WEIGHT_TRAVEL_STYLE = float(os.environ.get('REC_WEIGHT_STYLE', '3.0'))
BOOST_LIKED = float(os.environ.get('REC_BOOST_LIKED', '1.0'))
BOOST_SAVED = float(os.environ.get('REC_BOOST_SAVED', '0.7'))
DEST_DUPLICATE_DECAY = float(os.environ.get('REC_DEST_DUP_DECAY', '0.15'))
MMR_LAMBDA = float(os.environ.get('REC_MMR_LAMBDA', '0.7'))
TOP_K = int(os.environ.get('REC_TOP_K', '10'))
DEBUG_LOG = os.environ.get('REC_DEBUG', 'false').lower() == 'true'

# New: popularity and recency blending to support cold start
WEIGHT_POPULARITY = float(os.environ.get('REC_WEIGHT_POP', '0.3'))
WEIGHT_RECENCY = float(os.environ.get('REC_WEIGHT_RECENCY', '0.2'))
RECENCY_HALF_LIFE_DAYS = float(os.environ.get('REC_RECENCY_HALF_LIFE_DAYS', '30'))


def _to_count_dict(val):
    if isinstance(val, dict):
        return {k: v for k, v in val.items() if k}
    if isinstance(val, list):
        return {k: 1 for k in val if k}
    return {}


def _budget_similarity(user_b, trip_b):
    try:
        if user_b is None or trip_b is None:
            return 0.0
        ub = float(user_b)
        tb = float(trip_b)
        if ub <= 0 or tb <= 0:
            return 0.0
        return max(0.0, 1 - abs(ub - tb) / max(ub, tb))
    except Exception:
        return 0.0


def _popularity_score(trip):
    likes = trip.get('likes') or []
    saved = trip.get('savedBy') or []
    return len(likes) + 0.5 * len(saved)


def _recency_score(trip):
    created = trip.get('createdAt')
    dt = None
    if isinstance(created, datetime):
        dt = created
    elif isinstance(created, str):
        # Try ISO parse
        try:
            dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
        except Exception:
            dt = None
    if not dt:
        return 0.0
    days = max(0.0, (datetime.now(timezone.utc) - dt.replace(tzinfo=timezone.utc)).days)
    # Exponential decay: score=exp(-ln(2)*days/half_life)
    if RECENCY_HALF_LIFE_DAYS <= 0:
        return 0.0
    return exp(-0.69314718056 * (days / RECENCY_HALF_LIFE_DAYS))


def content_based_recommendations(user_profile, all_trips):
    """Return diversified top K using weighted content score with cold-start support.

    Enhancements:
    - Always include popularity and recency components so new users get non-zero scores.
    - If user has travelStyle, it provides positive weight even without other prefs.
    - MMR diversification to avoid duplicates by tags/destination.
    """
    user_id = user_profile.get('userId')
    liked_ids = set(user_profile.get('likedTripsIds', []) or [])
    saved_ids = set(user_profile.get('savedTripsIds', []) or [])

    # Pull explicit preferences first (from top-level), fallback to derived prefs
    explicit_tags = _to_count_dict(user_profile.get('tags', {}))
    fallback_tags = _to_count_dict((user_profile.get('preferences', {}) or {}).get('tags', {}))
    user_tags = explicit_tags or fallback_tags

    explicit_dests = _to_count_dict(user_profile.get('recentDestinations', {}))
    fallback_dests = _to_count_dict((user_profile.get('preferences', {}) or {}).get('recentDestinations', {}))
    user_dests = explicit_dests or fallback_dests

    explicit_budget = user_profile.get('avgBudget')
    fallback_budget = (user_profile.get('preferences', {}) or {}).get('avgBudget')
    user_budget = explicit_budget if explicit_budget not in (None, 0) else fallback_budget

    explicit_style = user_profile.get('travelStyle')
    fallback_style = (user_profile.get('preferences', {}) or {}).get('travelStyle')
    user_style = explicit_style or fallback_style

    # If user provided explicit preferences in the app, amplify their influence
    has_explicit = bool(explicit_style or explicit_budget or explicit_tags or explicit_dests)
    tag_w = WEIGHT_TAG * (1.6 if explicit_tags else 1.0)
    dest_w = WEIGHT_DESTINATION * (1.6 if explicit_dests else 1.0)
    style_w = WEIGHT_TRAVEL_STYLE * (1.5 if explicit_style else 1.0)
    budget_w = WEIGHT_BUDGET * (1.4 if explicit_budget else 1.0)
    pop_w = WEIGHT_POPULARITY * (0.5 if has_explicit else 1.0)
    rec_w = WEIGHT_RECENCY * (0.5 if has_explicit else 1.0)

    # Exclude ONLY the user's own trips
    base_candidates = [t for t in all_trips if str(t.get('userId')) != user_id]

    def tag_overlap_score(trip_tags):
        if not trip_tags:
            return 0.0
        return sum(user_tags.get(tag, 0) for tag in trip_tags)

    def compute_base_score(trip):
        score = 0.0
        # Content-based components
        score += tag_w * tag_overlap_score(trip.get('tags', []))
        score += budget_w * _budget_similarity(user_budget, trip.get('budget'))
        dest = trip.get('destination')
        if dest and dest in user_dests:
            score += dest_w * user_dests[dest]
        if user_style and trip.get('travelStyle') and user_style == trip.get('travelStyle'):
            score += style_w
        # Implicit boosts if already liked/saved (keeps consistency when re-scoring)
        tid = str(trip.get('_id'))
        if tid in liked_ids:
            score += BOOST_LIKED
        if tid in saved_ids:
            score += BOOST_SAVED
        # Cold-start helpers: popularity and recency
        pop = _popularity_score(trip)
        rec = _recency_score(trip)
        score += pop_w * pop + rec_w * rec
        return score

    # Precompute base scores for all candidates
    scored = [(compute_base_score(t), t) for t in base_candidates]
    # Keep those with positive score; but if none, keep top by popularity
    positives = [st for st in scored if st[0] > 0]
    if positives:
        scored = positives
    else:
        if DEBUG_LOG:
            print('[content] No positive scores; falling back to popularity-only ranking')
        scored.sort(key=lambda x: _popularity_score(x[1]), reverse=True)

    # Sort by score desc initially
    scored.sort(key=lambda x: x[0], reverse=True)
    if not scored:
        return []

    # Diversification via MMR (tags + destination)
    def similarity(t1, t2):
        tags1 = set(t1.get('tags', []) or [])
        tags2 = set(t2.get('tags', []) or [])
        tag_sim = len(tags1 & tags2) / len(tags1 | tags2) if (tags1 or tags2) else 0.0
        dest_sim = 1.0 if t1.get('destination') and t1.get('destination') == t2.get('destination') else 0.0
        return 0.7 * tag_sim + 0.3 * dest_sim

    relevance = {str(trip.get('_id')): base for base, trip in scored}
    selected = []
    selected_ids = set()
    dest_counts = {}

    first_score, first_trip = scored[0]
    selected.append(first_trip)
    selected_ids.add(str(first_trip.get('_id')))
    d = first_trip.get('destination')
    if d:
        dest_counts[d] = 1

    while len(selected) < TOP_K and len(selected_ids) < len(scored):
        best_candidate = None
        best_mmr = -1e9
        for base_score, trip in scored:
            tid = str(trip.get('_id'))
            if tid in selected_ids:
                continue
            max_sim = max((similarity(trip, s) for s in selected), default=0.0)
            mmr_score = MMR_LAMBDA * base_score - (1 - MMR_LAMBDA) * max_sim
            dd = trip.get('destination')
            if dd and dest_counts.get(dd, 0) > 0:
                mmr_score -= DEST_DUPLICATE_DECAY * dest_counts[dd]
            if mmr_score > best_mmr:
                best_mmr = mmr_score
                best_candidate = trip
        if not best_candidate:
            break
        selected.append(best_candidate)
        selected_ids.add(str(best_candidate.get('_id')))
        dd = best_candidate.get('destination')
        if dd:
            dest_counts[dd] = dest_counts.get(dd, 0) + 1

    if len(selected) < TOP_K:
        for base_score, trip in scored:
            if len(selected) >= TOP_K:
                break
            tid = str(trip.get('_id'))
            if tid not in selected_ids:
                selected.append(trip)
                selected_ids.add(tid)

    return selected[:TOP_K]
