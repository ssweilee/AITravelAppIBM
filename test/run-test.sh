npx artillery run \
--record \
--key a9_nmmk8cj62ptbshl3xspm1rqzefyt8lrr \
--name "Load Test - Login, Search, Notifi, Recommend_Mac" \
-o "result_$(date +%Y%m%d_%H%M%S).json" \
test-load.yml