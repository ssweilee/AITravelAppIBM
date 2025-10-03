import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

export const fetchUserProfile = async (navigation) => {
  try {
    let token = await AsyncStorage.getItem('token');
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    console.log('fetchUserProfile - Token:', token);
    console.log('fetchUserProfile - API_BASE_URL:', API_BASE_URL);
    if (!token && !refreshToken) {
      throw new Error('No auth token found');
    }

    const url = `${API_BASE_URL}/api/users/profile`;
    console.log('fetchUserProfile - Request URL:', url);

    let response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    let data = await response.json();
    console.log('fetchUserProfile - Response:', JSON.stringify(data, null, 2));
    console.log('fetchUserProfile - Status:', response.status);

    // If token invalid, try refresh ONCE
    if ((response.status === 401 || response.status === 403 || data.message === 'Invalid token') && refreshToken) {
      // Try to refresh JWT
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/api/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        const refreshData = await refreshRes.json();
        if (refreshRes.ok && refreshData.token) {
          token = refreshData.token;
          await AsyncStorage.setItem('token', token);
          // Retry profile fetch ONCE
          response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          data = await response.json();
          if (response.ok) {
            return { success: true, user: data.user };
          }
        }
      } catch (refreshErr) {
        console.log('fetchUserProfile - Refresh token error:', refreshErr);
      }
      // If refresh fails, fall through to logout
    }

    if (response.status === 401 || response.status === 403 || data.message === 'Invalid token') {
      await AsyncStorage.removeItem('token');
      if (navigation) navigation.reset?.({ index: 0, routes: [{ name: 'Login' }] });
      return { success: false, error: 'Invalid token, logged out.' };
    }

    if (response.ok) {
      return { success: true, user: data.user };
    } else {
      return { success: false, error: data };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// 👇 NEW: fetch any user by ID
export const fetchUserById = async (userId, navigation) => {
  try {
    const token = await AsyncStorage.getItem('token');
    console.log('fetchUserById - Token:', token);
    console.log('fetchUserById - API_BASE_URL:', API_BASE_URL);
    if (!token) {
      throw new Error('No auth token found');
    }

    const url = `${API_BASE_URL}/api/users/${userId}`;
    console.log('fetchUserById - Request URL:', url);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('fetchUserById - Response:', JSON.stringify(data, null, 2));
    console.log('fetchUserById - Status:', response.status);
    
    if (response.status === 401 || response.status === 403 || data.message === 'Invalid token') {
      await AsyncStorage.removeItem('token');
      if (navigation) navigation.reset?.({ index: 0, routes: [{ name: 'Login' }] });
      return { success: false, error: 'Invalid token, logged out.' };
    }

    if (response.ok) {
      return { success: true, user: data.user };
    } else {
      return { success: false, error: data };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
};