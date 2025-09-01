import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import { authFetch } from '../utils/authFetch';
import { getUserIdFromToken } from './authUtils';

export async function getUserProfile(navigation) {
  const token = await AsyncStorage.getItem('token');
  // use plural /api/users/profile (backend mounts userRoutes at /api/users)
  const res = await authFetch(`${API_BASE_URL}/api/users/profile`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  }, { navigation });
  if (res.success) {
    const user = res.data.user || res.data;
    // Debug what is returned from backend
    console.log('[getUserProfile] raw user:', user);
    // Convert tags object to array for UI
    let tagsArr = [];
    if (user?.tags && typeof user.tags === 'object' && !Array.isArray(user.tags)) {
      tagsArr = Object.keys(user.tags);
    } else if (Array.isArray(user?.tags)) {
      tagsArr = user.tags;
    }
    // Always return a flat object with all expected fields
    return {
      travelStyle: user?.travelStyle || '',
      tags: tagsArr,
      avgBudget: user?.avgBudget || '',
      recentDestinations: Array.isArray(user?.recentDestinations) ? user.recentDestinations : [],
    };
  } else {
    return { travelStyle: '', tags: [], avgBudget: '', recentDestinations: [] };
  }
}

export async function updateUserProfile(profile, navigation) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('Missing auth token');
  let userId = await getUserIdFromToken();
  // Normalise outbound payload: convert tags object back to array (backend expects array & normalises object->array anyway)
  const outbound = { ...profile };
  if (outbound.tags && typeof outbound.tags === 'object' && !Array.isArray(outbound.tags)) {
    outbound.tags = Object.keys(outbound.tags);
  }
  if (outbound.recentDestinations && typeof outbound.recentDestinations === 'object' && !Array.isArray(outbound.recentDestinations)) {
    outbound.recentDestinations = Object.keys(outbound.recentDestinations);
  }
  let url;
  if (userId) {
    url = `${API_BASE_URL}/api/users/edit/${userId}`;
  } else {
    console.log('[userService.updateUserProfile] userId decode failed, falling back to token-based /api/users/edit');
    url = `${API_BASE_URL}/api/users/edit`;
  }
  const res = await authFetch(url, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(outbound),
  }, { navigation });
  if (!res.success) throw new Error(res.error?.message || 'Failed to update profile');
  return res.data;
}
