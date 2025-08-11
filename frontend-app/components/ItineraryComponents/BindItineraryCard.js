import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const dummyImage = 'https://via.placeholder.com/600x320/1F2A37/FFFFFF?text=Itinerary';

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
    <TouchableOpacity onPress={onPress} style={styles.repostCard} activeOpacity={0.9}>
      <Image
        source={{ uri: itinerary.coverImage || dummyImage }}
        style={styles.image}
      />

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
          <View style={styles.actionButton}>
            <Ionicons name="heart-outline" size={18} color="#555" />
            <Text style={styles.repostMeta}>{itinerary.likes?.length || 0}</Text>
          </View>
          <View style={styles.actionButton}>
            <Ionicons name="repeat-outline" size={18} color="#555" />
            <Text style={styles.repostMeta}>{itinerary.repostCount?.length || 0}</Text>
          </View>
          <View style={styles.actionButton}>
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
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: '#E6F2F1',
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: '#1F2A37', //default
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
  sharedBy: {
    paddingTop: 8,
    fontSize: 11,
    color: '#555',
  },
  buttonColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#F7FCFC',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E6F2F1',
  },
  repostMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#444',
  },
});

export default BindItineraryCard;
