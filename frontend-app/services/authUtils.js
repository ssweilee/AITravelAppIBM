import AsyncStorage from '@react-native-async-storage/async-storage';
import jwtDecode from 'jwt-decode';

export async function getUserIdFromToken() {
  const token = await AsyncStorage.getItem('token');
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    const id = decoded.userId || decoded.id || decoded._id || null;
    if (!id) {
      console.log('[getUserIdFromToken] Decoded token but no user id field found. Keys:', Object.keys(decoded));
    }
    return id;
  } catch (e) {
    console.log('[getUserIdFromToken] Failed to decode token:', e.message);
    return null;
  }
}
