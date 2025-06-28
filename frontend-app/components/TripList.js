import React, { useEffect, useState, useCallback } from 'react';
import {
  FlatList, Text, RefreshControl, StyleSheet, View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../config';
import TripCard from './TripCard';

const TripList = ({ userId, refreshTrigger }) => {
  const [trips, setTrips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const fetchTrips = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/trips`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        // if userId passed, filter to only their trips
        setTrips(userId ? data.filter(t => t.userId === userId) : data);
      }
    } catch (err) {
      console.error('Fetching trips failed', err);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrips();
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchTrips(); }, [refreshTrigger]);

  const renderItem = ({ item }) => (
    <TripCard
      trip={item}
      onViewItinerary={() => navigation.navigate('Trip', { tripId: item._id, view: 'itinerary' })}
      onViewPosts={()     => navigation.navigate('Trip', { tripId: item._id, view: 'posts' })}
    />
  );

  if (!trips.length) {
    return <View style={styles.empty}><Text>No trips yet.</Text></View>;
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={trips}
      keyExtractor={t => t._id}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}
    />
  );
};

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  empty: { flex:1, justifyContent:'center', alignItems:'center', marginTop:40 }
});

export default TripList;
