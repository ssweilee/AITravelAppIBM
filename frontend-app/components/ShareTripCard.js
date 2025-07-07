import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const ShareTripCard = ({ trip }) => {
  const navigation = useNavigation();

  if (!trip) return null;

  const start = new Date(trip.startDate).toLocaleDateString('en-UK', {
    month: 'short',
    day: 'numeric'
  });
  const end = new Date(trip.endDate).toLocaleDateString('en-UK', {
    month: 'short',
    day: 'numeric'
  });

  const calculateDuration = () => {
    if (!trip.startDate || !trip.endDate) return '';
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  };

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('TripDetail', { trip })}
      style={styles.card}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="airplane" size={24} color="#007AFF" />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{trip.title}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.destination}>{trip.destination}</Text>
        </View>
        <Text style={styles.dates}>{start} – {end} • {calculateDuration()}</Text>
        <Text style={styles.budget}>Budget: ${trip.budget}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  iconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
  },
  content: {
    padding: 8,
    flex: 1,
  },
  title: { 
    fontWeight: 'bold', 
    fontSize: 14,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  destination: { 
    fontSize: 13, 
    color: '#555',
    marginLeft: 2,
  },
  dates: { 
    fontSize: 12, 
    color: '#888',
    marginBottom: 2,
  },
  budget: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
  },
});

export default ShareTripCard;