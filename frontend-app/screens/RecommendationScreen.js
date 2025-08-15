import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import TripCard from '../components/TripCard';

function RecommendationScreen() {
  const [preferenceProfile, setPreferenceProfile] = useState(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletedTripIds, setDeletedTripIds] = useState(new Set());
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
      if (seq !== requestSeq.current) return;
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

  // Refetch when screen gains focus OR when refreshTs param changes
  useFocusEffect(
    React.useCallback(() => {
      fetchPreferenceProfile();
    }, [route.params?.refreshTs])
  );

  const handleTripDeleted = (tripId) => {
    setDeletedTripIds(prev => new Set([...prev, tripId]));
  };

  const filterDeleted = (trips) => {
    if (!Array.isArray(trips)) return [];
    return trips.filter(trip => !deletedTripIds.has(trip._id));
  };

  const renderTripSection = (title, trips, backgroundColor = '#f8f9fa') => {
    const filteredTrips = filterDeleted(trips);
    
    if (!filteredTrips || filteredTrips.length === 0) {
      return (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.noDataText}>No recommendations found.</Text>
        </View>
      );
    }

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {filteredTrips.slice(0, 5).map((trip, idx) => (
          <View key={trip._id || idx} style={styles.tripCardWrapper}>
            <TripCard
              trip={trip}
              onPress={(tripData) => navigation.navigate('TripDetail', { trip: tripData })}
              onDeleted={handleTripDeleted}
            />
          </View>
        ))}
      </View>
    );
  };

  if (contentLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00C7BE" />
        <Text style={styles.loadingText}>Loading recommendations...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchPreferenceProfile}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <TouchableOpacity
        style={styles.preferencesButton}
        onPress={() => navigation.navigate('PreferencesScreen')}
      >
        <Text style={styles.preferencesButtonText}>Edit Preferences</Text>
      </TouchableOpacity>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Hybrid Recommendations */}
        {renderTripSection(
          '🌟 Top Picks For You',
          preferenceProfile?.topTenPicks,
          '#fff3e0'
        )}

        {/* Content-Based Recommendations */}
        {renderTripSection(
          '📍 Based on Your Interests',
          preferenceProfile?.contentBased,
          '#e6f7ff'
        )}

        {/* Collaborative Filtering Recommendations */}
        {renderTripSection(
          '👥 Popular with Similar Travelers',
          preferenceProfile?.collaborative,
          '#f0f5ff'
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#00C7BE',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  preferencesButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  preferencesButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
    color: '#222',
  },
  tripCardWrapper: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    fontStyle: 'italic',
  },
});

export default RecommendationScreen;