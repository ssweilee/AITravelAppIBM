// screens/SavedPostsScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PostCard from '../components/PostCard';
import TripCard from '../components/TripCard';
import { API_BASE_URL } from '../config';
import { useNavigation } from '@react-navigation/native';

export default function SavedPostsScreen() {
  const navigation = useNavigation();
  const [posts, setPosts]     = useState([]);
  const [trips, setTrips]     = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const [pRes, tRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/users/savedPosts`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/users/savedTrips`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      const [pData, tData] = await Promise.all([
        pRes.ok ? pRes.json() : [],
        tRes.ok ? tRes.json() : []
      ]);
      setPosts(pData);
      setTrips(tData);
    } catch (err) {
      console.error('Error loading saved content:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSaved(); }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionHeader}>Saved Posts</Text>
      {posts.length > 0 ? (
        <FlatList
          data={posts}
          keyExtractor={item => item._id.toString()}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={() =>
                navigation.navigate('PostDetail', { post: item })
              }
            />
          )}
          scrollEnabled={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
        <Text style={styles.emptyText}>
          You haven’t saved any posts yet.
        </Text>
      )}

      <Text style={styles.sectionHeader}>Saved Trips</Text>
      {trips.length > 0 ? (
        <FlatList
          data={trips}
          keyExtractor={item => item._id.toString()}
          renderItem={({ item }) => (
            <TripCard
              trip={item}
              onPress={() =>
                navigation.navigate('Trip', { tripId: item._id })
              }
            />
          )}
          scrollEnabled={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
        <Text style={styles.emptyText}>
          You haven’t saved any trips yet.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, padding: 10 },
  centered:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginVertical: 8 },
  emptyText:     { textAlign: 'center', color: 'gray', marginBottom: 12 }
});
