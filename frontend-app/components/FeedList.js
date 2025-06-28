// components/FeedList.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import PostCard from './PostCard';
import TripCard from './TripCard';
import { useNavigation } from '@react-navigation/native';

const FeedList = ({ refreshTrigger }) => {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const fetchFeed = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      // 1) Fetch posts
      const postsRes = await fetch(`${API_BASE_URL}/api/posts/feed`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const postsData = postsRes.ok ? await postsRes.json() : [];

      // 2) Fetch trips
      const tripsRes = await fetch(`${API_BASE_URL}/api/trips`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const tripsData = tripsRes.ok ? await tripsRes.json() : [];

      // 3) Tag each item with its type
      const taggedPosts = postsData.map(p => ({ ...p, type: 'post' }));
      const taggedTrips = tripsData.map(t => ({ ...t, type: 'trip' }));

      // 4) Merge & sort by createdAt descending
      const merged = [...taggedPosts, ...taggedTrips].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setItems(merged);
    } catch (err) {
      console.error('Error fetching feed:', err);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFeed();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [refreshTrigger]);

  const renderItem = ({ item }) => {
    if (item.type === 'post') {
      return (
        <PostCard
          post={item}
          onPress={p => navigation.navigate('PostDetail', { post: p })}
        />
      );
    }
    return (
      <TripCard
        trip={item}
        onPress={() => navigation.navigate('Trip', { tripId: item._id })}
      />
    );
  };

  return (
    <FlatList
      data={items}
      keyExtractor={item => `${item.type}-${item._id}`}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text>No items yet.</Text>
        </View>
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    />
  );
};

const styles = StyleSheet.create({
  list: {
    marginTop: 10,
    paddingHorizontal: 16
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  }
});

export default FeedList;
