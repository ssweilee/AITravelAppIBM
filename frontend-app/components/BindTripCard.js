import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BindTripCard = ({ trip, onPress }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-UK', {
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateDuration = () => {
    if (!trip.startDate || !trip.endDate) return '';
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.repostCard}
      activeOpacity={0.9}
    >
      <View style={styles.cardContentContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="airplane" size={32} color="#007AFF" />
        </View>

        <View style={styles.textColumn}>
          <Text style={styles.title}>{trip.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.destination}>{trip.destination}</Text>
          </View>
          <Text style={styles.dates}>
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)} • {calculateDuration()}
          </Text>
          <Text style={styles.budget}>Budget: ${trip.budget}</Text>
          <Text style={styles.sharedBy}>
            Sharing {trip.userId?.firstName} {trip.userId?.lastName}'s trip
          </Text>
        </View>

        <View style={styles.buttonColumn}>
          <View style={styles.tripActionButton}>
            <Ionicons name="heart-outline" size={18} color="#555" />
            <Text style={styles.repostMeta}>{trip.likes?.length || 0}</Text>
          </View>
          <View style={styles.tripActionButton}>
            <Ionicons name="repeat-outline" size={18} color="#555" />
            <Text style={styles.repostMeta}>{trip.repostCount?.length || 0}</Text>
          </View>
          <View style={styles.tripActionButton}>
            <Ionicons name="chatbubble-outline" size={18} color="#555" />
            <Text style={styles.repostMeta}>{trip.comments?.length || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  repostCard: {
    width: '98%',
    backgroundColor: '#e6f3ff', // Light blue background for trips
    borderRadius: 12,
    marginTop: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  cardContentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    gap: 10,
  },
  iconContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    borderRadius: 25,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#222',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  destination: {
    fontSize: 14,
    color: '#555',
    marginLeft: 4,
  },
  dates: {
    fontSize: 13,
    color: '#777',
    marginBottom: 2,
  },
  budget: {
    fontSize: 13,
    color: '#28a745',
    fontWeight: '500',
    marginBottom: 4,
  },
  buttonColumn: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 8,
  },
  tripActionButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
  },
  repostMeta: {
    marginTop: 2,
    fontSize: 11,
    color: '#555',
  },
  sharedBy: {
    paddingTop: 6,
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default BindTripCard;