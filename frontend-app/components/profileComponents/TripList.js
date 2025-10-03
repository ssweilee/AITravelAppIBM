// components/TripList.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config';
import TripCard from '../TripCard';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const TripList = ({ refreshTrigger, userId, onPress }) => {
  const [trips, setTrips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const fetchTrips = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      let endpoint;
      if (userId) {
        endpoint = `${API_BASE_URL}/api/trips/user/${userId}`;
      } else {
        endpoint = `${API_BASE_URL}/api/trips/mine`;
      }

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setTrips(data);
      } else {
        console.warn('Failed to fetch trips:', data);
      }
    } catch (err) {
      console.error('Error fetching trips:', err);
    }
  }, [userId]);

  useEffect(() => {
    fetchTrips();
  }, [refreshTrigger, userId, fetchTrips]);

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [fetchTrips])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTrips();
    setRefreshing(false);
  };

  const handleTripDeleted = (deletedId) => {
    setTrips((prev) => prev.filter((t) => t._id !== deletedId));
  };

  const renderItem = ({ item }) => (
    <TripCard
      trip={item}
      onPress={onPress || ((trip) => navigation.navigate('TripDetail', { trip }))}
      onDeleted={handleTripDeleted}
    />
  );

  return (
    <FlatList
      data={trips}
      keyExtractor={(item) => item._id}
      renderItem={renderItem}
      contentContainerStyle={{ marginTop: 10 }}
      ListEmptyComponent={<Text style={styles.emptyText}>No Trips Yet</Text>}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    />
  );
};

const styles = StyleSheet.create({
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
});

export default TripList;