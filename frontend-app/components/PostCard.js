import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../config';
import ShareTab from './ShareTab';

export default function PostCard({ post, onPress }) {
  const navigation = useNavigation();
  const [userId, setUserId] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [saved, setSaved] = useState(false);
  const [savedCount, setSavedCount] = useState(post.savedBy?.length || 0);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Initialize user-specific state (liked, saved)
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserId(payload.userId);
      setLiked(post.likes?.includes(payload.userId));
      setSaved(post.savedBy?.includes(payload.userId));
    })();
  }, [post]);

  // Toggle like/unlike
  const toggleLike = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        `${API_BASE_URL}/api/interactions/post/${post._id}/like`,
        { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }
      );
      const { liked: nowLiked, count } = await res.json();
      setLiked(nowLiked);
      setLikesCount(count);
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  // Toggle save/unsave
  const toggleSave = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        `${API_BASE_URL}/api/interactions/post/${post._id}/save`,
        { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }
      );
      const { saved: nowSaved, count } = await res.json();
      setSaved(nowSaved);
      setSavedCount(count);
    } catch (err) {
      console.error('Failed to toggle save:', err);
    }
  };

  // Navigate to comments/detail view
  const goToComments = () => navigation.navigate('PostDetail', { post });

  // Open share modal
  const onShareToChat = () => setPickerVisible(true);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => onPress?.(post) ?? goToComments()}
      >
        <Text style={styles.content}>{post.content}</Text>
      </TouchableOpacity>

      <Text style={styles.timestamp}>
        {new Date(post.createdAt).toLocaleString()}
      </Text>

      <View style={styles.actions}>
        {/* Like button */}
        <TouchableOpacity onPress={toggleLike} style={styles.actionButton}>
          <Text style={styles.like}>{liked ? '❤️' : '🤍'} {likesCount}</Text>
        </TouchableOpacity>

        {/* Comment button */}
        <TouchableOpacity onPress={goToComments} style={styles.actionButton}>
          <Text style={styles.comment}>💬 Comment</Text>
        </TouchableOpacity>

        {/* Save button */}
        <TouchableOpacity onPress={toggleSave} style={styles.actionButton}>
          <Text style={styles.save}>{saved ? '💾 Saved' : '💾 Save'} {savedCount}</Text>
        </TouchableOpacity>

        {/* Share into Chat */}
        <TouchableOpacity onPress={onShareToChat} style={styles.actionButton}>
          <Text>✉️ Share</Text>
        </TouchableOpacity>
      </View>

      {/* ShareTab modal for choosing chat */}
      <ShareTab
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        postId={post._id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { padding: 10, backgroundColor: '#fff', marginBottom: 10, borderRadius: 8 },
  content:     { fontSize: 16 },
  timestamp:   { fontSize: 12, color: 'gray', marginTop: 4 },
  actions:     { flexDirection: 'row', marginTop: 8 },
  actionButton:{ marginRight: 16 },
  like:        { fontSize: 16 },
  comment:     { fontSize: 16, color: '#007AFF' },
  save:        { fontSize: 16, color: '#444' },
});
