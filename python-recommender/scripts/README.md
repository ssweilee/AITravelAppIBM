# Training dataset builder

This script joins your `data_testathon` CSVs with MongoDB users/trips to build a
supervised Learning-to-Rank dataset with rich features from user preferences and
trip attributes.

## Files
- `build_training_dataset.py` — reads `relevance-*.csv` and `eval-*.csv`, queries Mongo,
  computes features, and writes `data_testathon/training_dataset.csv`.

## Inputs
- `data_testathon/relevance-*.csv` — labels per (userId, tripId): 1 if liked, 0 otherwise.
- `data_testathon/eval-*.csv` — recommendation exposures per user (used as candidate pairs).
- MongoDB collections:
  - Users: `_id`, `followings`, `preferences { tags, travelStyle, avgBudget, recentDestinations, favoriteDestinations }`
  - Trips: `_id`, `userId`, `tags`, `destination`, `travelStyle`, `budget`, `likes[]`, `savedBy[]`, `createdAt`

## Output
- `data_testathon/training_dataset.csv` with columns:
  - `userId, tripId, label`
  - Features: `tag_overlap_count, tag_overlap_weighted, travel_style_match, budget_similarity, recent_dest_weight, favorite_dest_match, trip_likes_count, trip_saved_count, creator_followed, social_lift, content_score, recency_days`
  - A few raw fields for analysis (`user_avgBudget`, etc.).

## Config
Environment variables (optional):
- `MONGO_URI` — connection string (defaults to the value used in `app.py`).
- `MONGO_DB_NAME` — database name (default `recommendation_dataset`).
- `MONGO_USERS_COLL` — users collection (default `users`).
- `MONGO_TRIPS_COLL` — trips collection (default `trips`).
- `REC_WEIGHT_TAG`, `REC_WEIGHT_BUDGET`, `REC_WEIGHT_DESTINATION`, `REC_WEIGHT_STYLE` — weights used to compute `content_score` feature.

## Run
Use the workspace Python environment. Example:

```powershell
# Optional: set custom connection
$env:MONGO_URI = "mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority"

# Run the builder
python .\python-recommender\scripts\build_training_dataset.py
```

The script prints summary stats and writes the output CSV.

## Notes
- We maximize coverage by using every pair in `eval-*.csv` as an exposure; if a
  matching row exists in `relevance-*.csv` with label 1, we mark it positive; otherwise 0.
- Pairs with missing user or trip docs in Mongo are skipped.
- We exclude user-owned trips from training pairs.
- Consider a time-based split after building the dataset for model evaluation.
