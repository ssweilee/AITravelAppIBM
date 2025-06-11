import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

export const fetchUserProfile = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
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
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (response.ok) {
      return { success: true, user: data.user };
    } else {
      return { success: false, error: data };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
};