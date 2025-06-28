import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const PostDetailScreen = ({ route }) => {
  const { post } = route.params;
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

const fetchComments = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/api/posts/${post._id}/comments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      setComments(data);
    } else {
      console.error('Failed to load comments:', data);
    }
  } catch (err) {
    console.error('Error fetching comments:', err);
  } finally {
    setLoading(false);
  }
};


 const submitComment = async () => {
  if (!newComment.trim()) return;
  setSubmitting(true);
  try {
    const token = await AsyncStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/api/posts/${post._id}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text: newComment })
    });
    const payload = await res.json();
    if (res.ok) {
      setNewComment('');
      fetchComments();
    } else {
      console.error('Comment failed:', payload);
    }
  } catch (err) {
    console.error('Network error posting comment:', err);
  } finally {
    setSubmitting(false);
  }
};


  useEffect(() => {
    fetchComments();
  }, []);

  return (
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={{ flex: 1 }}
    keyboardVerticalOffset={Platform.OS === 'android' ? 25 : 80}
  >
    <View style={styles.container}>
      <View style={styles.postBox}>
        <Text style={styles.content}>{post.content}</Text>
        <Text style={styles.timestamp}>{new Date(post.createdAt).toLocaleString()}</Text>
      </View>
      <Text style={styles.commentsHeader}>Comments</Text>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.commentBox}>
              <Text style={styles.commentAuthor}>
                 {item.userId?.firstName || 'User'}
                 {' '}
                 {item.userId?.lastName || ''}
              </Text>
              <Text>{item.content}</Text>
            </View>
          )}
        />
      )}
      <View style={styles.inputBox}>
        <TextInput
          value={newComment}
          onChangeText={setNewComment}
          placeholder="Write a comment..."
          style={styles.input}
        />
        <Button title="Send" onPress={submitComment} disabled={submitting} />
      </View>
    </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  postBox: { marginBottom: 20 },
  content: { fontSize: 16 },
  timestamp: { fontSize: 12, color: 'gray' },
  commentsHeader: { fontWeight: 'bold', fontSize: 16, marginBottom: 10 },
  commentBox: { marginBottom: 10 },
  commentAuthor: { fontWeight: 'bold' },
  inputBox: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 10,
  paddingHorizontal: 10,
  backgroundColor: '#fff',
  paddingBottom: Platform.OS === 'android' ? 60 : 10, // Adjusted padding for Android to avoid keyboard overlap
  paddingTop: 6,
},

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 4,
    marginRight: 8,
  },
});

export default PostDetailScreen;
