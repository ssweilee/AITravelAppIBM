import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';

function RecommendationScreen() {
  const [preferenceProfile, setPreferenceProfile] = useState(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();
  const route = useRoute();
  const requestSeq = useRef(0);

  const fetchPreferenceProfile = async () => {
    const seq = ++requestSeq.current;
    try {
      setContentLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('token');
      const preferenceProfileResponse = await fetch(`${API_BASE_URL}/api/recommend/python`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
      });
      const preferenceProfileData = await preferenceProfileResponse.json();
      if (seq !== requestSeq.current) return; // ignore out-of-date response
      if (preferenceProfileResponse.ok) {
        setPreferenceProfile(preferenceProfileData);
      } else {
        setError(preferenceProfileData?.message || 'Failed to fetch recommendations.');
      }
    } catch (error) {
      if (seq !== requestSeq.current) return;
      setError('Error fetching user content: ' + error.message);
    } finally {
      if (seq === requestSeq.current) setContentLoading(false);
    }
  };

  // Remove initial useEffect fetch to avoid double fetch race (focus effect covers initial mount)
  // useEffect(() => { fetchPreferenceProfile(); }, []);

  // Refetch when screen gains focus OR when refreshTs param changes
  useFocusEffect(
    React.useCallback(() => {
      fetchPreferenceProfile();
    }, [route.params?.refreshTs])
  );

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        style={{ backgroundColor: '#007AFF', padding: 12, borderRadius: 8, margin: 16, alignItems: 'center' }}
        onPress={() => navigation.navigate('PreferencesScreen')}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Edit Preferences</Text>
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {contentLoading ? (
            <Text>Loading recommendations...</Text>
          ) : error ? (
            <Text style={{ color: 'red' }}>{error}</Text>
          ) : (
            <>
              <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>
                Top Hybrid Recommendations
              </Text>
              {preferenceProfile && Array.isArray(preferenceProfile.topTenPicks) && preferenceProfile.topTenPicks.length > 0 ? (
                preferenceProfile.topTenPicks.slice(0, 5).map((trip, idx) => (
                  <View key={trip._id || idx} style={{ marginBottom: 16, padding: 12, backgroundColor: '#f2f2f2', borderRadius: 8 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{trip.title || 'Trip Title'}</Text>
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
              {preferenceProfile && Array.isArray(preferenceProfile.contentBased) && preferenceProfile.contentBased.length > 0 ? (
                preferenceProfile.contentBased.slice(0, 5).map((trip, idx) => (
                  <View key={trip._id || idx} style={{ marginBottom: 16, padding: 12, backgroundColor: '#e6f7ff', borderRadius: 8 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{trip.title || 'Trip Title'}</Text>
                    <Text>Location: {trip.destination || 'N/A'}</Text>
                    <Text>Budget: {trip.budget ? `$${trip.budget}` : 'N/A'}</Text>
                    <Text>Travel Style: {trip.travelStyle || 'N/A'}</Text>
                  </View>
                ))
              ) : (
                <Text>No content-based recommendations found.</Text>
              )}

              <Text style={{ fontSize: 22, fontWeight: 'bold', marginTop: 24, marginBottom: 12 }}>
                Collaborative Filtering Recommendations
              </Text>
              <View style={{ minHeight: 60, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#888' }}>[Coming soon]</Text>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

export default RecommendationScreen;