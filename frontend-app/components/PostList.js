import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const PostList = ({ refreshTrigger }) => {
  const [posts, setPosts] = useState([]);

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

  const renderItem = ({ item }) => (
    <View style={styles.postItem}>
      <Text style={styles.postAuthor}>
        {item.userId?.firstName || 'Unknown'} {item.userId?.lastName || ''}
      </Text>
      <Text>{item.content}</Text>
    </View>
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