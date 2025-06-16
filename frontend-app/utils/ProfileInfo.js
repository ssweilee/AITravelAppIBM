import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

export const fetchUserProfile = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    console.log('fetchUserProfile - Token:', token);
    console.log('fetchUserProfile - API_BASE_URL:', API_BASE_URL);
    if (!token) {
      throw new Error('No auth token found');
    }

    const url = `${API_BASE_URL}/api/users/profile`;
    console.log('fetchUserProfile - Request URL:', url);

    const response = await fetch(url, {
      method: 'GET', 
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('fetchUserProfile - Response:', JSON.stringify(data, null, 2));
    console.log('fetchUserProfile - Status:', response.status);

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
export const fetchUserById = async (userId) => {
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
    
    if (response.ok) {
      return { success: true, user: data.user };
    } else {
      return { success: false, error: data };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
};