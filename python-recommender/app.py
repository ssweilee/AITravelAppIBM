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
DEST_DUPLICATE_DECAY = float(os.environ.get('REC_DEST_DUP_DECAY', '0.15'))  # penalty per prior occurrence in selected list
MMR_LAMBDA = float(os.environ.get('REC_MMR_LAMBDA', '0.7'))  # trade-off between relevance and diversity (0..1)
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