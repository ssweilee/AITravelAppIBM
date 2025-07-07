import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config';
import TripCard from '../TripCard';
import { useNavigation } from '@react-navigation/native';

const TripList = ({ refreshTrigger, userId }) => {
  const [trips, setTrips] = useState([]);
  const navigation = useNavigation();

  const fetchTrips = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const endpoint = userId
        ? `${API_BASE_URL}/api/trips/user/${userId}`
        : `${API_BASE_URL}/api/trips/mine`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setTrips(data);
      } else {
        console.log('Failed to fetch trips:', data);
      }
    } catch (err) {
      console.error('Error fetching trips:', err);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [refreshTrigger, userId]);

  const renderItem = ({ item }) => (
    <TripCard
      trip={item}
      onPress={(trip) => navigation.navigate('TripDetail', { trip })}
    />
  );

  return (
    <FlatList
      data={trips}
      keyExtractor={(item) => item._id}
      renderItem={renderItem}
      contentContainerStyle={{ marginTop: 10 }}
      ListEmptyComponent={<Text>No Trips Yet</Text>}
    />
  );
};

const styles = StyleSheet.create({
  tripItem: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5
  },
  tripAuthor: {
    fontWeight: 'bold',
    marginBottom: 5
  }
});

export default TripList;