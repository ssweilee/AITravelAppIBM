import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
//import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import PostCard from './PostCard'; 
import TripCard from './TripCard';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const FeedList = ({ refreshTrigger }) => {
  const { token, isLoading: isAuthLoading } = useAuth();
  const [feedItems, setFeedItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    console.log('[FeedList] Auth State Update:', { 
      isAuthLoading, 
      token: token ? `Token exists (length: ${token.length})` : null 
    });
  }, [token, isAuthLoading]);

  const fetchFeedContent = useCallback(async () => {
    if (isAuthLoading || !token) {
      console.log('Auth is loading or no token, skipping feed fetch.');
      setIsFeedLoading(false); 
      setFeedItems([]); 
      return;
    }

    setIsFeedLoading(true);

    try {
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
    } finally {
      setIsFeedLoading(false); 
    }
  }, [token, isAuthLoading]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFeedContent();
    setRefreshing(false);
  }, [fetchFeedContent]);

  useEffect(() => {
    fetchFeedContent();
  }, [fetchFeedContent, refreshTrigger]);

  if (isFeedLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00c7be" />
      </View>
    );
  }
  
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  }
});

export default FeedList;