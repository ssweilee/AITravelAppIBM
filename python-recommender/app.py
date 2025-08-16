from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
import os
from math import sqrt
from collaborative import collaborative_recommendations, user_based_collaborative_recommendations
from content import content_based_recommendations
from ranker import recommend_by_ranker

app = Flask(__name__)
CORS(app)

# Use your MongoDB URI from the Node.js .env
MONGO_URI = "mongodb://appuser1:appuser1@ac-pzmwfhj-shard-00-00.jxzjzuo.mongodb.net:27017,ac-pzmwfhj-shard-00-01.jxzjzuo.mongodb.net:27017,ac-pzmwfhj-shard-00-02.jxzjzuo.mongodb.net:27017/recommendation_dataset?ssl=true&replicaSet=atlas-tq5bms-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client.get_database('recommendation_dataset')

# === Weight / boost configuration (env override-able) ===
WEIGHT_TAG = float(os.environ.get('REC_WEIGHT_TAG', '2.0'))
WEIGHT_BUDGET = float(os.environ.get('REC_WEIGHT_BUDGET', '1.0'))
WEIGHT_DESTINATION = float(os.environ.get('REC_WEIGHT_DESTINATION', '1.5'))
WEIGHT_TRAVEL_STYLE = float(os.environ.get('REC_WEIGHT_STYLE', '1.0'))
BOOST_LIKED = float(os.environ.get('REC_BOOST_LIKED', '1.0'))
BOOST_SAVED = float(os.environ.get('REC_BOOST_SAVED', '0.7'))
DEST_DUPLICATE_DECAY = float(os.environ.get('REC_DEST_DUP_DECAY', '0.15'))
MMR_LAMBDA = float(os.environ.get('REC_MMR_LAMBDA', '0.7'))
TOP_K = int(os.environ.get('REC_TOP_K', '10'))
DEBUG_LOG = os.environ.get('REC_DEBUG', 'false').lower() == 'true'
WEIGHT_USERCF = float(os.environ.get('REC_WEIGHT_USERCF', '0.5'))  # weight for user-based CF in hybrid
WEIGHT_ITEMCF = float(os.environ.get('REC_WEIGHT_ITEMCF', '0.7'))  # weight for item-based CF in hybrid

def serialize_doc(doc):
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    if isinstance(doc, dict):
        return {k: serialize_doc(v) for k, v in doc.items()}
    if isinstance(doc, ObjectId):
        return str(doc)
    return doc



def populate_trip_with_user(trip):
    """Populate the userId field with user information for TripCard component."""
    if not trip:
        return trip
    
    # If userId is an ObjectId, fetch the user details
    user_id = trip.get('userId')
    if user_id:
        # Convert to ObjectId if it's a string
        if isinstance(user_id, str):
            try:
                user_id = ObjectId(user_id)
            except:
                pass
        
        # Fetch user from users collection
        user = db.users.find_one({'_id': user_id})
        if user:
            # Include only necessary user fields for TripCard
            trip['userId'] = {
                '_id': serialize_doc(user.get('_id')),
                'firstName': user.get('firstName', 'Unknown'),
                'lastName': user.get('lastName', ''),
                'profilePicture': user.get('profilePicture', '')
            }
        else:
            # Fallback if user not found
            trip['userId'] = {
                '_id': serialize_doc(user_id),
                'firstName': 'Unknown',
                'lastName': 'User',
                'profilePicture': ''
            }
    
    # Populate taggedUsers if they exist
    if 'taggedUsers' in trip and trip['taggedUsers']:
        populated_tagged = []
        for tagged_id in trip['taggedUsers']:
            if isinstance(tagged_id, str):
                try:
                    tagged_id = ObjectId(tagged_id)
                except:
                    continue
            
            tagged_user = db.users.find_one({'_id': tagged_id})
            if tagged_user:
                populated_tagged.append({
                    '_id': serialize_doc(tagged_user.get('_id')),
                    'firstName': tagged_user.get('firstName', 'Unknown'),
                    'lastName': tagged_user.get('lastName', '')
                })
        trip['taggedUsers'] = populated_tagged
    
    # Ensure these arrays exist even if empty (for TripCard compatibility)
    trip.setdefault('likes', [])
    trip.setdefault('savedBy', [])
    trip.setdefault('comments', [])
    trip.setdefault('posts', [])
    trip.setdefault('itineraries', [])
    trip.setdefault('repostCount', [])
    
    return trip

def content_based_recommendations(user_profile, all_trips):
    """Return diversified top K recommendations using weighted content score + MMR."""
    user_id = user_profile.get('userId')
    liked_ids = set(user_profile.get('likedTripsIds', []) or [])
    saved_ids = set(user_profile.get('savedTripsIds', []) or [])

    # Helper: normalize user tags & destinations (accept dict or list)
    def to_count_dict(val):
        if isinstance(val, dict):
            return {k: v for k, v in val.items() if k}
        if isinstance(val, list):
            return {k: 1 for k in val if k}
        return {}

    user_tags = to_count_dict(user_profile.get('tags', {}))
    user_dests = to_count_dict(user_profile.get('recentDestinations', {}))
    user_budget = user_profile.get('avgBudget')
    user_style = user_profile.get('travelStyle')

    # Exclude ONLY the user's own trips
    base_candidates = [t for t in all_trips if str(t.get('userId')) != user_id]

    def tag_overlap_score(trip_tags):
        if not trip_tags:
            return 0.0
        return sum(user_tags.get(tag, 0) for tag in trip_tags)

    def budget_similarity(user_b, trip_b):
        if not user_b or not trip_b:
            return 0.0
        return 1 - abs(user_b - trip_b) / max(user_b, trip_b, 1)

    def compute_raw_content_score(trip):
        score = 0.0
        # Tags
        score += WEIGHT_TAG * tag_overlap_score(trip.get('tags', []))
        # Budget
        score += WEIGHT_BUDGET * budget_similarity(user_budget, trip.get('budget'))
        # Destination match
        dest = trip.get('destination')
        if dest and dest in user_dests:
            score += WEIGHT_DESTINATION * user_dests[dest]
        # Travel style
        if user_style and trip.get('travelStyle') and user_style == trip.get('travelStyle'):
            score += WEIGHT_TRAVEL_STYLE
        # Liked / Saved boosts
        _id_str = str(trip.get('_id'))
        if _id_str in liked_ids:
            score += BOOST_LIKED
        if _id_str in saved_ids:
            score += BOOST_SAVED
        return score

    # Precompute base scores
    scored = []
    for trip in base_candidates:
        s = compute_raw_content_score(trip)
        if s > 0:  # keep only positive-scoring trips to reduce noise
            scored.append((s, trip))
    scored.sort(key=lambda x: x[0], reverse=True)

    if not scored:
        return []

    # Diversification via simple MMR (Max Marginal Relevance)
    # Similarity metric: Jaccard over tags + destination match bonus
    def similarity(t1, t2):
        tags1 = set(t1.get('tags', []) or [])
        tags2 = set(t2.get('tags', []) or [])
        tag_sim = len(tags1 & tags2) / len(tags1 | tags2) if (tags1 or tags2) else 0.0
        dest_sim = 1.0 if t1.get('destination') and t1.get('destination') == t2.get('destination') else 0.0
        # Weighted combination; destination considered moderately
        return 0.7 * tag_sim + 0.3 * dest_sim

    # Map trip id to base relevance
    relevance = {str(trip.get('_id')): base for base, trip in scored}

    selected = []
    selected_ids = set()
    # Keep counts for destination duplicate decay
    dest_counts = {}

    # Seed with highest score
    first_score, first_trip = scored[0]
    selected.append(first_trip)
    selected_ids.add(str(first_trip.get('_id')))
    dest = first_trip.get('destination')
    if dest:
        dest_counts[dest] = 1

    while len(selected) < TOP_K and len(selected_ids) < len(scored):
        best_candidate = None
        best_mmr = -1e9
        for base_score, trip in scored:
            tid = str(trip.get('_id'))
            if tid in selected_ids:
                continue
            # Diversity penalty (max similarity to already selected)
            if selected:
                max_sim = max(similarity(trip, s) for s in selected)
            else:
                max_sim = 0.0
            mmr_score = MMR_LAMBDA * base_score - (1 - MMR_LAMBDA) * max_sim
            # Destination duplicate decay
            d = trip.get('destination')
            if d and dest_counts.get(d, 0) > 0:
                mmr_score -= DEST_DUPLICATE_DECAY * dest_counts[d]
            if mmr_score > best_mmr:
                best_mmr = mmr_score
                best_candidate = trip
        if not best_candidate:
            break
        selected.append(best_candidate)
        selected_ids.add(str(best_candidate.get('_id')))
        d = best_candidate.get('destination')
        if d:
            dest_counts[d] = dest_counts.get(d, 0) + 1

    # Fallback if diversification returned fewer than needed (add remaining highest)
    if len(selected) < TOP_K:
        for base_score, trip in scored:
            if len(selected) >= TOP_K:
                break
            tid = str(trip.get('_id'))
            if tid not in selected_ids:
                selected.append(trip)
                selected_ids.add(tid)

    # Populate user data for each trip and serialize
    populated_trips = [populate_trip_with_user(trip) for trip in selected[:TOP_K]]
    return [serialize_doc(t) for t in populated_trips]
  
## content_based_recommendations now lives in content.py and is imported above

def hybrid_recommendations(content_recs, item_collab_recs, user_collab_recs):
    """Additive blending of content + user-based CF + item-based CF."""
    score = {}
    trip_lookup = {}
    # Base content scores (descending weight)
    for i, t in enumerate(content_recs):
        tid = str(t.get('_id'))
        trip_lookup[tid] = t
        score[tid] = score.get(tid, 0) + (1.0 - i / (len(content_recs) + 1))
    # User CF contribution
    for j, t in enumerate(user_collab_recs):
        tid = str(t.get('_id'))
        trip_lookup.setdefault(tid, t)
        score[tid] = score.get(tid, 0) + WEIGHT_USERCF * (1.0 - j / (len(user_collab_recs) + 1))
    # Item CF contribution
    for k, t in enumerate(item_collab_recs):
        tid = str(t.get('_id'))
        trip_lookup.setdefault(tid, t)
        score[tid] = score.get(tid, 0) + WEIGHT_ITEMCF * (1.0 - k / (len(item_collab_recs) + 1))
    ranked = sorted(score.items(), key=lambda x: x[1], reverse=True)[:TOP_K]
    return [trip_lookup[tid] for tid, _ in ranked]

@app.route('/recommend', methods=['POST'])
def recommend():
    user_profile = request.json
    if DEBUG_LOG:
        print('User preference profile received by recommender:', user_profile)
    if not user_profile or not user_profile.get('userId'):
        return jsonify({'error': 'Missing userId'}), 400

    all_trips = list(db.trips.find({}))

    # Run each recommendation strategy
    content_recs_raw = content_based_recommendations(user_profile, all_trips)
    content_recs = [serialize_doc(t) for t in content_recs_raw]
    # Item-based collaborative (existing)
    item_collab_raw = []
    try:
        item_collab_raw = collaborative_recommendations(user_profile, all_trips)
        item_collab_recs = [serialize_doc(t) for t in item_collab_raw]

        collab_recs_raw = collaborative_recommendations(user_profile, all_trips)
        # Populate user data for collaborative recommendations
        collab_recs_populated = [populate_trip_with_user(trip) for trip in collab_recs_raw]
        collab_recs = [serialize_doc(t) for t in collab_recs_populated]

    except Exception as e:
        if DEBUG_LOG:
            print('[recommend] collaborative error:', e)
        item_collab_recs = []
    # User-based collaborative
    user_collab_raw = []
    try:
        user_collab_raw = user_based_collaborative_recommendations(user_profile, all_trips)
        user_collab_recs = [serialize_doc(t) for t in user_collab_raw]
    except Exception as e:
        if DEBUG_LOG:
            print('[recommend] user_collaborative error:', e)
        user_collab_recs = []
    # Ranker-based supervised re-ranker
    ranker_recs_raw = []
    try:
        # Load user doc minimally from profile shape
        user_stub = {
            '_id': user_profile.get('userId'),
            'preferences': {
                'tags': user_profile.get('tags', {}),
                'travelStyle': user_profile.get('travelStyle'),
                'avgBudget': user_profile.get('avgBudget'),
                'recentDestinations': user_profile.get('recentDestinations', {}),
                'favoriteDestinations': user_profile.get('favoriteDestinations', [])
            },
            'followings': user_profile.get('followings', [])
        }
        # Build candidate pool: union of content + item CF + user CF
        cand_map = {}
        for lst in (content_recs_raw or [] , item_collab_raw or [] , user_collab_raw or []):
            for t in lst:
                tid = str(t.get('_id'))
                cand_map[tid] = t
        candidates = list(cand_map.values())
        # Backfill to a minimum pool size while preserving current candidates
        min_pool = max(TOP_K * 2, 50)
        if len(candidates) < min_pool:
            backfill = [t for t in all_trips if str(t.get('_id')) not in cand_map]
            need = min_pool - len(candidates)
            candidates.extend(backfill[:max(0, need)])
        if DEBUG_LOG:
            print(f"[ranker] candidate_pool_size={len(candidates)} (content+CF union, backfilled if needed)")
        ranker_recs_raw = recommend_by_ranker(user_stub, all_trips, top_k=TOP_K, candidates=candidates)
        ranker_recs = [serialize_doc(t) for t in ranker_recs_raw]
    except Exception as e:
        if DEBUG_LOG:
            print('[recommend] ranker error:', e)
        ranker_recs = []
    if DEBUG_LOG:
        print(f"[recommend] content={len(content_recs)} itemCF={len(item_collab_recs)} userCF={len(user_collab_recs)} ranker={len(ranker_recs)}")
    # Compute hybrid from raw docs to keep scoring consistent, then serialize
    hybrid_recs_raw = hybrid_recommendations(content_recs_raw, item_collab_raw, user_collab_raw)
    hybrid_recs = [serialize_doc(t) for t in hybrid_recs_raw]

    response = {
        'topTenPicks': hybrid_recs,
    'contentBased': content_recs,
    'collaborative': item_collab_recs,
    'userCollaborative': user_collab_recs,
    'matrixFactorization': ranker_recs,
        'config': {
            'WEIGHT_TAG': WEIGHT_TAG,
            'WEIGHT_BUDGET': WEIGHT_BUDGET,
            'WEIGHT_DESTINATION': WEIGHT_DESTINATION,
            'WEIGHT_TRAVEL_STYLE': WEIGHT_TRAVEL_STYLE,
            'BOOST_LIKED': BOOST_LIKED,
            'BOOST_SAVED': BOOST_SAVED,
            'MMR_LAMBDA': MMR_LAMBDA,
            'DEST_DUPLICATE_DECAY': DEST_DUPLICATE_DECAY,
            'WEIGHT_USERCF': WEIGHT_USERCF,
            'WEIGHT_ITEMCF': WEIGHT_ITEMCF
        }
    }
    if DEBUG_LOG:
        print('Recommendation response (truncated ids):', [r.get('_id') for r in hybrid_recs])
    return jsonify(response)

if __name__ == '__main__':
    app.run(port=5001, debug=True)