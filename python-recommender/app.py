from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
import os

app = Flask(__name__)
CORS(app)

# Use your MongoDB URI from the Node.js .env
MONGO_URI = "mongodb://appuser1:appuser1@ac-pzmwfhj-shard-00-00.jxzjzuo.mongodb.net:27017,ac-pzmwfhj-shard-00-01.jxzjzuo.mongodb.net:27017,ac-pzmwfhj-shard-00-02.jxzjzuo.mongodb.net:27017/recommendation_dataset?ssl=true&replicaSet=atlas-tq5bms-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client.get_database('recommendation_dataset')

def serialize_doc(doc):
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    if isinstance(doc, dict):
        return {k: serialize_doc(v) for k, v in doc.items()}
    if isinstance(doc, ObjectId):
        return str(doc)
    return doc

@app.route('/recommend', methods=['POST'])
def recommend():
    user_id = request.json.get('userId')
    try:
        user_obj_id = ObjectId(user_id)
    except Exception:
        return jsonify({'error': 'Invalid userId format'}), 400
    user = db.users.find_one({'_id': user_obj_id})
    trips = list(db.trips.find({}))
    #recommendation logic
    recommendations = trips[:5]  # Dummy: return first 5 trips
    return jsonify({'recommendations': serialize_doc(recommendations)})

if __name__ == '__main__':
    app.run(port=5001, debug=True)