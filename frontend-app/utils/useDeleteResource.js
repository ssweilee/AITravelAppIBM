// utils/useDeleteResource.js
import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

export const useDeleteResource = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const deleteResource = useCallback(async (relativePath) => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No auth token');

      const res = await fetch(`${API_BASE_URL}${relativePath}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // robust JSON parse fallback
      let data;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        const msg = data?.message || `Delete failed (${res.status})`;
        throw new Error(msg);
      }
      return data;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteResource, loading, error };
};



