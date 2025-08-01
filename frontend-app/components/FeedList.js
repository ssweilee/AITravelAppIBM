import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import PostCard from './PostCard'; 
import TripCard from './TripCard';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const FeedList = ({ refreshTrigger }) => {
  const [feedItems, setFeedItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const fetchFeedContent = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('User is not authenticated');
        return;
      }

      // Use your existing endpoints - no new backend code needed!
      const [postsResponse, tripsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/posts/feed`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/trips`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        // Add itineraries later when you want them in the feed
      ]);

      const [postsData, tripsData] = await Promise.all([
        postsResponse.ok ? postsResponse.json() : [],
        tripsResponse.ok ? tripsResponse.json() : []
      ]);

      // Combine and add type identifiers
      const allContent = [
        ...postsData.map(item => ({ ...item, contentType: 'post' })),
        ...tripsData.map(item => ({ ...item, contentType: 'trip' }))
      ];

      // Sort by creation date (most recent first)
      allContent.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setFeedItems(allContent);
    } catch (err) {
      console.log('Error fetching feed content:', err);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFeedContent();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchFeedContent();
  }, [refreshTrigger]);

  // Refetch feed when screen comes into focus (after returning from detail screen)
  useFocusEffect(
    useCallback(() => {
      console.log('[FeedList] Screen focused, refreshing feed...');
      fetchFeedContent();
    }, [])
  );

  const renderItem = ({ item }) => {
    if (item.contentType === 'trip') {
      return (
        <TripCard
          trip={item}
          onPress={trip => navigation.navigate('TripDetail', { trip })}
        />
      );
    } else {
      // Default to PostCard for posts (and any other content)
      return (
        <PostCard
          post={item}
          onPress={p => navigation.navigate('PostDetail', { post: p })}
        />
      );
    }
  };

  const keyExtractor = (item) => `${item.contentType}-${item._id}`;
  
  return (
    <FlatList
      data={feedItems}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={{ marginTop: 10 }}
      ListEmptyComponent={<Text>No posts or trips yet</Text>}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    />
  );
};

const styles = StyleSheet.create({
  postItem: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5
  },
  postAuthor: {
    fontWeight: 'bold',
    marginBottom: 5
  }
});

export default FeedList;