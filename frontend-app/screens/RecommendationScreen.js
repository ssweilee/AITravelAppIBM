import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';


function RecommendationScreen() {
  const [preferenceProfile, setPreferenceProfile] = useState(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPreferenceProfile = async () => {
    try {
      setContentLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('token');

      // // Fetch user's posts
      // const preferenceProfileResponse = await fetch(`${API_BASE_URL}/api/recommend/recommendTrips`, {
      //   headers: { Authorization: `Bearer ${token}` }

      // Use POST to Python recommender endpoint
      const preferenceProfileResponse = await fetch(`${API_BASE_URL}/api/recommend/python`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        // body: JSON.stringify({}) // Add body if needed by backend
      });
      const preferenceProfileData = await preferenceProfileResponse.json();
      if (preferenceProfileResponse.ok) {
        setPreferenceProfile(preferenceProfileData);
      } else {
        setError(preferenceProfileData?.message || 'Failed to fetch recommendations.');
      }
    } catch (error) {
      setError('Error fetching user content: ' + error.message);
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
    <View style={{ padding: 16 }}>
      {contentLoading ? (
        <Text>Loading recommendations...</Text>
      ) : error ? (
        <Text style={{ color: 'red' }}>{error}</Text>
      ) : (
        <>
          <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>
            Top 10 Hybrid Recommendations
          </Text>
          {/* {preferenceProfile && Array.isArray(preferenceProfile) && preferenceProfile.length > 0 ? ( */}
            {/* // preferenceProfile.slice(0, 5).map((trip, idx) => ( */}
          {preferenceProfile && Array.isArray(preferenceProfile.recommendations) && preferenceProfile.recommendations.length > 0 ? (
            preferenceProfile.recommendations.slice(0, 5).map((trip, idx) => (
              <View key={trip._id || idx} style={{ marginBottom: 16, padding: 12, backgroundColor: '#f2f2f2', borderRadius: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{trip.title || 'Trip Title'}</Text>
                //<Text>Location: {trip.location || 'N/A'}</Text>
                <Text>Location: {trip.destination || 'N/A'}</Text>
                <Text>Budget: {trip.budget ? `$${trip.budget}` : 'N/A'}</Text>
                <Text>Travel Style: {trip.travelStyle || 'N/A'}</Text>
              </View>
            ))
          ) : (
            <Text>No recommendations found.</Text>
          )}

          <Text style={{ fontSize: 22, fontWeight: 'bold', marginTop: 24, marginBottom: 12 }}>
            Content-Based Recommendations
          </Text>
          <View style={{ minHeight: 60, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#888' }}>[Coming soon]</Text>
          </View>

          <Text style={{ fontSize: 22, fontWeight: 'bold', marginTop: 24, marginBottom: 12 }}>
            Collaborative Filtering Recommendations
          </Text>
          <View style={{ minHeight: 60, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#888' }}>[Coming soon]</Text>
          </View>
        </>
      )}
    </View>
  )
}

export default RecommendationScreen;