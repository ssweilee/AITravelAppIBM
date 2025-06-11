// components/AddPost.js
import React, { useState } from 'react';
import { View, TextInput, Button, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const AddPost = ({ onPostCreated }) => {
  const [content, setContent] = useState('');

  const handlePostSubmit = async () => {
    if (!content) {
      Alert.alert('Post content cannot be empty');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('You are not logged in.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });

      const data = await response.json();
      if (!response.ok) {
        console.log('Server error:', data);
        Alert.alert('Failed to create post');
      } else {
        Alert.alert('Post created!');
        setContent('');
        onPostCreated(); // Refresh posts
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Failed to create post');
    }
  };

  return (
    <View>
      <TextInput
        placeholder="What's on your mind?"
        value={content}
        onChangeText={setContent}
        style={styles.input}
        multiline
      />
      <Button title="Post" onPress={handlePostSubmit} />
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    height: 50,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    marginTop: 10,
    borderRadius: 20,
    textAlignVertical: 'top'
  }
});

export default AddPost;