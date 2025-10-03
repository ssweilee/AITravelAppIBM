import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import PostCard from './PostCard';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const PostList = ({ refreshTrigger }) => {
  const [posts, setPosts] = useState([]);
  const navigation = useNavigation();

  const fetchPosts = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setPosts(data);
      } else {
        console.log('Failed to fetch posts:', data);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [refreshTrigger]);

  // Refetch posts when screen comes into focus (after returning from detail screen)
  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [])
  );

  const renderItem = ({ item }) => (
    <PostCard
      post={item}
      onPress={(post) => navigation.navigate('PostDetail', { post })}
    />
  );

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item._id}
      renderItem={renderItem}
      contentContainerStyle={{ marginTop: 10 }}
      ListEmptyComponent={<Text>No Posts Yet</Text>}
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

export default PostList;