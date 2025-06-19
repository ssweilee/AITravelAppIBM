// components/PostCard.js
// components/PostCard.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../config';

const PostCard = ({ post, onPress }) => {
  const navigation = useNavigation();
  const [userId, setUserId]       = useState(null);
  const [liked, setLiked]         = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [saved, setSaved]             = useState(false);
  const [savedCount, setSavedCount]   = useState(post.savedBy?.length || 0);

 
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserId(payload.userId);
      setLiked(post.likes?.includes(payload.userId));
    })();
  }, [post]);

  
  const toggleLike = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        `${API_BASE_URL}/api/interactions/post/${post._id}/like`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const result = await res.json();
      if (res.ok) {
        setLiked(result.liked);
        setLikesCount(result.count);
      } else {
        console.error('Failed to toggle like:', result);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };
  const toggleSave = async () => {
    const token = await AsyncStorage.getItem('token');
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/interaction/post/${post._id}/save`,
        { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }
      );
      const { saved: nowSaved, count } = await res.json();
      setSaved(nowSaved);
      setSavedCount(count);
    } catch (err) {
      console.error('Error toggling save:', err);
    }
  };

  // 3️⃣ Navigate to detail/comments
  const goToComments = () =>
    navigation.navigate('PostDetail', { post });

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => onPress?.(post) ?? goToComments()}>
        <Text style={styles.content}>{post.content}</Text>
      </TouchableOpacity>

      <Text style={styles.timestamp}>
        {new Date(post.createdAt).toLocaleString()}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={toggleLike}
          style={styles.actionButton}
        >
          <Text style={styles.like}>
            {liked ? '❤️' : '🤍'} {likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goToComments}
          style={styles.actionButton}
        >
          <Text style={styles.comment}>💬 Comment</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleSave} style={styles.actionButton}>
        <Text style={styles.save}>{saved ? '💾 Saved' : '💾 Save'} {savedCount}</Text>
       </TouchableOpacity>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container:   { padding: 10, backgroundColor: '#fff', marginBottom: 10, borderRadius: 8, elevation: 2 },
  content:     { fontSize: 16 },
  timestamp:   { fontSize: 12, color: 'gray', marginTop: 4 },
  actions:     { flexDirection: 'row', marginTop: 8 },
  actionButton:{ marginRight: 16 },
  like:        { fontSize: 16 },
  comment:     { fontSize: 16, color: '#007AFF' },
  save: { fontSize: 16, color: '#444' },

});

export default PostCard;
