import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BindItineraryCard = ({ itinerary, onPress }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-UK', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.repostCard}
      activeOpacity={0.9}
    >
      <Image source={{ uri: itinerary.coverImage }} style={styles.image} />

      <View style={styles.cardContentContainer}>
        <View style={styles.textColumn}>
          <Text style={styles.title}>{itinerary.title}</Text>
          <Text style={styles.destination}>{itinerary.destination}</Text>
          <Text style={styles.dates}>
            {formatDate(itinerary.startDate)} – {formatDate(itinerary.endDate)}
          </Text>
          <Text style={styles.sharedBy}>
            Sharing {itinerary.createdBy?.firstName} {itinerary.createdBy?.lastName}'s itinerary
          </Text>
        </View>

        <View style={styles.buttonColumn}>
          <View style={styles.itineraryActionButton}>
            <Ionicons name="heart-outline" size={18} color="#555" />
            <Text style={styles.repostMeta}>{itinerary.likes?.length || 0}</Text>
          </View>
          <View style={styles.itineraryActionButton}>
            <Ionicons name="repeat-outline" size={18} color="#555" />
            <Text style={styles.repostMeta}>{itinerary.repostCount?.length || 0}</Text>
          </View>
          <View style={styles.itineraryActionButton}>
            <Ionicons name="paper-plane-outline" size={18} color="#555" />
            <Text style={styles.repostMeta}>0</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  repostCard: {
    width: '98%',
    backgroundColor: '#fbc',
    borderRadius: 12,
    marginTop: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  image: {
    width: '100%',
    height: 160,
  },
  cardContentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  destination: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  dates: {
    fontSize: 13,
    color: '#777',
  },
  buttonColumn: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 10,
  },
  itineraryActionButton: {
    alignItems: 'center',
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  repostMeta: {
    marginLeft: 1,
    fontSize: 12,
    color: '#555',
  },
  sharedBy: {
    paddingTop: 8,
    fontSize: 11,
  },
});

export default BindItineraryCard;