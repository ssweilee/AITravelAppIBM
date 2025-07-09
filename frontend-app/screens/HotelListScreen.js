import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';

// Dummy hotel data (in future, fetch from dataset/API)
const DUMMY_HOTELS = [
  {
    id: '1',
    name: 'Grand Palace Hotel',
    location: 'London, UK',
    price: 180,
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '2',
    name: 'Seaside Resort',
    location: 'Barcelona, Spain',
    price: 140,
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '3',
    name: 'Mountain View Inn',
    location: 'York, England',
    price: 120,
    rating: 4.2,
    image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80',
  },
];

const HotelListScreen = ({ route }) => {
  // Accept params for future use
  const { where, guests, selectedDates } = route?.params || {};
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Hotels</Text>
      {/* Optionally show search params for demo */}
      {where && (
        <Text style={{ color: '#888', marginBottom: 8 }}>Destination: {where}</Text>
      )}
      {selectedDates && selectedDates.length > 0 && (
        <Text style={{ color: '#888', marginBottom: 8 }}>Dates: {selectedDates.join(', ')}</Text>
      )}
      {guests && (
        <Text style={{ color: '#888', marginBottom: 8 }}>
          Guests: {Object.entries(guests).map(([k, v]) => `${k}: ${v}`).join(', ')}
        </Text>
      )}
      <FlatList
        data={DUMMY_HOTELS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.location}>{item.location}</Text>
              <Text style={styles.price}>${item.price} / night</Text>
              <Text style={styles.rating}>⭐ {item.rating}</Text>
              <TouchableOpacity style={styles.bookBtn}>
                <Text style={styles.bookBtnText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 18, color: '#222' },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    marginBottom: 18,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    overflow: 'hidden',
  },
  image: { width: 110, height: 110, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  info: { flex: 1, padding: 12, justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  location: { color: '#666', marginTop: 2, marginBottom: 6 },
  price: { color: '#00C7BE', fontWeight: 'bold', marginBottom: 4 },
  rating: { color: '#f5a623', marginBottom: 8 },
  bookBtn: {
    backgroundColor: '#00C7BE',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  bookBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});

export default HotelListScreen;
