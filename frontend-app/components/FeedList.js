import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import PostCard from './PostCard'; 
import { useNavigation } from '@react-navigation/native';

const FeedList = ({ refreshTrigger }) => {
  const [ posts, setPosts ] = useState([]);
  const [ refreshing, setRefreshing ] = useState(false);

  const fetchPosts = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('User is not authenticated');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/posts/feed`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setPosts(data);
      } else {
        console.log('Failed to fetch posts: ', data);
      }
    } catch (err) {
      console.log('Error fetching posts: ', err);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [refreshTrigger]);

const navigation = useNavigation();
const renderItem = ({item}) => (
  <PostCard
    post={item}
    onPress={p => navigation.navigate('PostDetail', {post: p})}
  />
);
  
  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item._id}
      renderItem={renderItem}
      contentContainerStyle={{ marginTop: 10 }}
      ListEmptyComponent={<Text>No Posts Yet</Text>}
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