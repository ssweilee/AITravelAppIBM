// authFetch.js
// A global fetch wrapper that handles token expiry and auto-logout/redirect
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import { Alert } from 'react-native';

/**
 * Usage: await authFetch(url, options, { logout, navigation })
 * - logout: function from AuthContext
 * - navigation: navigation object (for reset)
 */
export async function authFetch(url, options = {}, { logout, navigation } = {}) {
  let token = await AsyncStorage.getItem('token');
  let refreshToken = await AsyncStorage.getItem('refreshToken');
  if (!options.headers) options.headers = {};
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';

  let response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    Alert.alert('Network Error', err.message);
    throw err;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = await response.text();
  }

  // Handle token expiry or invalid token globally
  if (
    response.status === 401 ||
    response.status === 403 ||
    (typeof data === 'object' && (data.message === 'Invalid token' || data.message === 'Access token missing'))
  ) {
    // Try to refresh the token if refreshToken exists
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const refreshData = await refreshRes.json();
        if (refreshRes.ok && refreshData.token) {
          await AsyncStorage.setItem('token', refreshData.token);
          // Retry original request with new token
          options.headers['Authorization'] = `Bearer ${refreshData.token}`;
          const retryRes = await fetch(url, options);
          let retryData;
          try {
            retryData = await retryRes.json();
          } catch {
            retryData = await retryRes.text();
          }
          return retryRes.ok ? { success: true, data: retryData } : { success: false, error: retryData };
        } else {
          // Refresh failed, force logout
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('refreshToken');
          await AsyncStorage.removeItem('userInfoCache');
          if (logout) await logout();
          if (navigation && navigation.reset) {
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }
          Alert.alert('Session Expired', 'Please log in again.');
          return { success: false, error: 'Invalid token, logged out.' };
        }
      } catch (refreshErr) {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refreshToken');
        await AsyncStorage.removeItem('userInfoCache');
        if (logout) await logout();
        if (navigation && navigation.reset) {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }
        Alert.alert('Session Expired', 'Please log in again.');
        return { success: false, error: 'Invalid token, logged out.' };
      }
    } else {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('userInfoCache');
      if (logout) await logout();
      if (navigation && navigation.reset) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
      Alert.alert('Session Expired', 'Please log in again.');
      return { success: false, error: 'Invalid token, logged out.' };
    }
  }

  return response.ok ? { success: true, data } : { success: false, error: data };
}