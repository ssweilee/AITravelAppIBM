// components/UserPostList.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import PostCard from './PostCard';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const UserPostList = ({ userId }) => {
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const fetchPosts = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/posts/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) {
        setPosts(data);
      } else {
        console.warn('Failed to fetch posts:', data);
      }
    } catch (err) {
      console.warn('Error fetching posts:', err);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchPosts();
    }
  }, [userId, fetchPosts]);

  // Refetch when screen regains focus
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchPosts();
      }
    }, [userId, fetchPosts])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const handlePostDeleted = (deletedId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedId));
  };

  const renderItem = ({ item }) => (
    <PostCard
      post={item}
      onPress={(p) => navigation.navigate('PostDetail', { post: p })}
      onDeleted={handlePostDeleted}
    />
  );

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item._id}
      renderItem={renderItem}
      contentContainerStyle={{ marginTop: 10 }}
      ListEmptyComponent={<Text style={styles.emptyText}>No Posts Yet</Text>}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    />
  );
};

const styles = StyleSheet.create({
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
});

export default UserPostList;
