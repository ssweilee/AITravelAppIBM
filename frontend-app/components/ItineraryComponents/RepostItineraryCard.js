// components/RepostItineraryCard.js
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RepostItineraryCard = ({ itinerary, onPress }) => {
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
      style={styles.card}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Image
        source={{ uri: itinerary.coverImage || 'https://via.placeholder.com/300x180.png?text=Cover+Image' }}
        style={styles.image}
      />
      <View style={styles.cardContentRow}>
        <View style={styles.textColumn}>
          <Text style={styles.title}>{itinerary.title}</Text>
          <Text style={styles.destination}>{itinerary.destination}</Text>
          <Text style={styles.dates}>
            {formatDate(itinerary.startDate)} – {formatDate(itinerary.endDate)}
          </Text>
        </View>

        <View style={styles.buttonColumn}>
          <View style={styles.metaButton}>
            <Ionicons name="heart-outline" size={18} color="#555" />
            <Text style={styles.metaText}>{itinerary.likes?.length || 0}</Text>
          </View>
          <View style={styles.metaButton}>
            <Ionicons name="repeat-outline" size={18} color="#555" />
            <Text style={styles.metaText}>{itinerary.repostCount?.length || 0}</Text>
          </View>
          <View style={styles.metaButton}>
            <Ionicons name="paper-plane-outline" size={18} color="#555" />
            <Text style={styles.metaText}>0</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fbc',
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    marginTop: 12,
    padding: 10,
    width: '98%'
  },
  image: {
    width: '100%',
    height: 160,
  },
  cardContentRow: {
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
    alignItems: 'center',
    gap: 10,
  },
  metaButton: {
    alignItems: 'center',
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#555',
  },
});

export default RepostItineraryCard;