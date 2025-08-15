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
                Top recommendations for you [Hybrid: Content + UserCF + ItemCF]
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
                Based on your preferences [Content-based]
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
                Others like you liked these [Item-based CF]
              </Text>
              {preferenceProfile && Array.isArray(preferenceProfile.collaborative) && preferenceProfile.collaborative.length > 0 ? (
                preferenceProfile.collaborative.slice(0, 5).map((trip, idx) => (
                  <View key={trip._id || idx} style={{ marginBottom: 16, padding: 12, backgroundColor: '#fff7e6', borderRadius: 8 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{trip.title || 'Trip Title'}</Text>
                    <Text>Location: {trip.destination || 'N/A'}</Text>
                    <Text>Budget: {trip.budget ? `$${trip.budget}` : 'N/A'}</Text>
                    <Text>Travel Style: {trip.travelStyle || 'N/A'}</Text>
                  </View>
                ))
              ) : (
                <Text>No collaborative recommendations found.</Text>
              )}
              <Text style={{ fontSize: 22, fontWeight: 'bold', marginTop: 24, marginBottom: 12 }}>
                From similar users [User-based CF]
              </Text>
              {preferenceProfile && Array.isArray(preferenceProfile.userCollaborative) && preferenceProfile.userCollaborative.length > 0 ? (
                preferenceProfile.userCollaborative.slice(0, 5).map((trip, idx) => (
                  <View key={(trip._id || 'ucf') + idx} style={{ marginBottom: 16, padding: 12, backgroundColor: '#fff0f6', borderRadius: 8 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{trip.title || 'Trip Title'}</Text>
                    <Text>Location: {trip.destination || 'N/A'}</Text>
                    <Text>Budget: {trip.budget ? `$${trip.budget}` : 'N/A'}</Text>
                    <Text>Travel Style: {trip.travelStyle || 'N/A'}</Text>
                  </View>
                ))
              ) : (
                <Text>No user-based collaborative recommendations found.</Text>
              )}
              {preferenceProfile && Array.isArray(preferenceProfile.matrixFactorization) && preferenceProfile.matrixFactorization.length > 0 && (
                <>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8, marginTop: 8 }}>Personalized picks [XGBoost re-ranker]</Text>
                  {preferenceProfile.matrixFactorization.slice(0,5).map((trip, idx) => (
                    <View key={(trip._id || 'mf') + idx} style={{ marginBottom: 16, padding: 12, backgroundColor: '#f0e6ff', borderRadius: 8 }}>
                      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{trip.title || 'Trip Title'}</Text>
                      <Text>Location: {trip.destination || 'N/A'}</Text>
                      <Text>Budget: {trip.budget ? `$${trip.budget}` : 'N/A'}</Text>
                      <Text>Travel Style: {trip.travelStyle || 'N/A'}</Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

export default RecommendationScreen;