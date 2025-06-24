import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const ShareItineraryCard = ({ itinerary }) => {
  const navigation = useNavigation();

  if (!itinerary) return null;

  const start = new Date(itinerary.startDate).toLocaleDateString('en-UK', {
    month: 'short',
    day: 'numeric'
  });
  const end = new Date(itinerary.endDate).toLocaleDateString('en-UK', {
    month: 'short',
    day: 'numeric'
  });

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('ItineraryDetail', { itinerary })}
      style={styles.card}
    >
      <Image source={{ uri: itinerary.coverImage }} style={styles.image} />
      <View style={styles.text}>
        <Text style={styles.title}>{itinerary.title}</Text>
        <Text style={styles.destination}>{itinerary.destination}</Text>
        <Text style={styles.dates}>{start} – {end}</Text>
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
  },
  image: {
    height: 60,
    width: 80,
  },
  text: {
    padding: 8,
    flex: 1,
  },
  title: { fontWeight: 'bold', fontSize: 14 },
  destination: { fontSize: 13, color: '#555' },
  dates: { fontSize: 12, color: '#888' },
});

export default ShareItineraryCard;