const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001/api'; 
const PYTHON_RECOMMENDER_URL = 'http://localhost:5001/recommend';

async function signupAndLogin() {
  const email = `dummy${Date.now()}@test.com`;
  const password = 'Test123!';
  // 1. Signup
  await fetch(`${API_BASE_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email, password,
      firstName: 'Test', lastName: 'User',
      dob: '1990-01-01', country: 'Testland',
      travelStyle: 'budget'
    })
  });
  // 2. Login
  const loginRes = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const loginData = await loginRes.json();
  if (!loginData.token) throw new Error('Login failed');
  return { token: loginData.token, email, password };
}

async function updatePreferences(token, updates) {
  // Get userId from /users/profile
  const profileRes = await fetch(`${API_BASE_URL}/users/profile`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const user = await profileRes.json();
  console.log('Fetched user profile (pre-update):', user); // Debug
  const userObj = user.user || user;
  const userId = userObj._id || userObj.userId;
  if (!userId) throw new Error('UserId not found');
  // Update preferences (FIX route to plural)
  const editRes = await fetch(`${API_BASE_URL}/users/edit/${userId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  const editData = await editRes.json();
  console.log('Update HTTP status:', editRes.status);
  console.log('Update response:', editData);
  // Fetch again to confirm persistence
  const postProfileRes = await fetch(`${API_BASE_URL}/users/profile`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const updatedUser = await postProfileRes.json();
  console.log('Fetched user profile (post-update):', updatedUser);
  return editData;
}

async function printAllTrips(token) {
  const res = await fetch(`${API_BASE_URL}/trips`, { headers: { 'Authorization': `Bearer ${token}` } });
  const trips = await res.json();
  console.log('Raw trips response:', trips);
  const tripArr = Array.isArray(trips) ? trips : (trips.trips || []);
  console.log('All trips in DB:', tripArr.map(t => ({
    destination: t.destination,
    tags: t.tags,
    travelStyle: t.travelStyle,
    budget: t.budget
  })));
  return tripArr;
}

async function getRecommendationsDirectPython(token) {
  // Get user profile for recommender
  const profileRes = await fetch(`${API_BASE_URL}/users/profile`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const userProfileRaw = await profileRes.json();
  const user = userProfileRaw.user || userProfileRaw;

  const recommenderProfile = {
    userId: user._id,
    travelStyle: user.travelStyle || null,
    tags: Array.isArray(user.tags)
      ? Object.fromEntries(user.tags.map(tag => [tag, 1]))
      : (user.tags || {}),
    avgBudget: typeof user.avgBudget === 'number' ? user.avgBudget : null,
    recentDestinations: Array.isArray(user.recentDestinations)
      ? Object.fromEntries(user.recentDestinations.map(dest => [dest, 1]))
      : (user.recentDestinations || {}),
  };

  console.log('[DirectPython] Sending to recommender:', recommenderProfile);

  const recRes = await fetch(PYTHON_RECOMMENDER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recommenderProfile)
  });
  return await recRes.json();
}

async function getRecommendationsViaBackend(token) {
  const res = await fetch(`${API_BASE_URL}/recommend/python`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  console.log('[Backend] Recommendation response:', data.topTenPicks?.map(t => t.destination));
  return data;
}

(async () => {
  const { token } = await signupAndLogin();
  await printAllTrips(token);

  // Initial recommendations (direct + backend)
  const directBefore = await getRecommendationsDirectPython(token);
  console.log('Initial (direct) recommendations:', directBefore.topTenPicks?.map(t => t.destination));
  const backendBefore = await getRecommendationsViaBackend(token);

  // Update preferences
  await updatePreferences(token, {
    travelStyle: 'luxury',
    avgBudget: 5000,
    recentDestinations: ['Paris', 'Tokyo'],
    tags: { Foodie: 1, Adventure: 1 }
  });

  // Re-run recommendations
  const directAfter = await getRecommendationsDirectPython(token);
  console.log('After update (direct) recommendations:', directAfter.topTenPicks?.map(t => t.destination));
  const backendAfter = await getRecommendationsViaBackend(token);

  const changedDirect = JSON.stringify(directBefore.topTenPicks) !== JSON.stringify(directAfter.topTenPicks);
  const changedBackend = JSON.stringify(backendBefore.topTenPicks) !== JSON.stringify(backendAfter.topTenPicks);
  console.log(changedDirect ? 'Direct Python recommendations changed.' : 'Direct Python recommendations unchanged.');
  console.log(changedBackend ? 'Backend recommendations changed.' : 'Backend recommendations unchanged.');
})();