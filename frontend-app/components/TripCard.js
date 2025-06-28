// components/TripCard.js
import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { API_BASE_URL } from '../config';

export default function TripCard({ trip, onPress }) {
  const navigation = useNavigation();
  const [userId, setUserId]   = useState(null);
  const [liked, setLiked]     = useState(false);
  const [likeCount, setLikes] = useState(trip.likedBy?.length || 0);
  const [saved, setSaved]     = useState(false);
  const [saveCount, setSaves] = useState(trip.savedBy?.length || 0);
  const [commentCount]        = useState(trip.comments?.length || 0);

  // Seed userId, liked & saved from the JWT (same as PostCard)
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      // decode the JWT payload
      const base64Payload = token.split('.')[1];
      const payload = JSON.parse(atob(base64Payload));
      setUserId(payload.userId);
      setLiked(trip.likedBy?.includes(payload.userId));
      setSaved(trip.savedBy?.includes(payload.userId));
    })();
  }, [trip]);

  // Toggle like or save
  const handleToggle = async (action) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res   = await fetch(
        `${API_BASE_URL}/api/interactions/trip/${trip._id}/${action}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Toggle failed');

      if (action === 'like') {
        setLiked(data.liked);
        setLikes(data.count);
      } else if (action === 'save') {
        setSaved(data.saved);
        setSaves(data.count);
      }
    } catch (err) {
      console.error(`Failed to toggle ${action}:`, err);
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.title}>{trip.title}</Text>
        <Text style={styles.subtitle}>{trip.destination}</Text>
      </View>
      <Text style={styles.date}>
        {new Date(trip.startDate).toLocaleDateString()} –{' '}
        {new Date(trip.endDate).toLocaleDateString()}
      </Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.btn} onPress={() => handleToggle('like')}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? 'red' : 'gray'}
          />
          <Text style={styles.count}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate('Trip', { tripId: trip._id })}
        >
          <Ionicons name="chatbubble-outline" size={20} color="gray" />
          <Text style={styles.count}>{commentCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => handleToggle('save')}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={saved ? 'blue' : 'gray'}
          />
          <Text style={styles.count}>{saveCount}</Text>
        </TouchableOpacity>

        
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth:    1,
    borderColor:    '#ccc',
    borderRadius:   6,
    padding:        12,
    marginBottom:   12,
    backgroundColor:'#fff'
  },
  header:   { marginBottom: 8 },
  title:    { fontSize: 16, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#555' },
  date:     { fontSize: 12, color: '#777', marginBottom: 8 },
  actionsRow:{ flexDirection: 'row', justifyContent: 'space-around' },
  btn:        { flexDirection: 'row', alignItems: 'center' },
  count:      { marginLeft: 4, fontSize: 12, color: '#333' }
});
