import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';


function RecommendationScreen() {

  // ------->>>> ONLY USE FOR GET REQUEST TESTS <<<<<<--------
  const [preferenceProfile, setPreferenceProfile] = useState(null);
  const fetchPreferenceProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      // Fetch user's posts
      const preferenceProfileResponse = await fetch(`${API_BASE_URL}/api/recommend/recommendTrips`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const preferenceProfileData = await preferenceProfileResponse.json();

      if (preferenceProfileResponse.ok) setPreferenceProfile(preferenceProfileData);
    } catch (error) {
      console.error('Error fetching user content:', error);
    } finally {
      setContentLoading(false);
    }
  };
  useEffect(() => {
    fetchPreferenceProfile();
  }, []);
  console.log('Preference Profile:', preferenceProfile);
  // --------------->>>> ------------------ <<<<-----------------

  
  return (
    <View>
    </View>
  )
}

export default RecommendationScreen;