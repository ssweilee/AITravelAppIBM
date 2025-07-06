// components/PostCard.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../config';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import BindItineraryCard from './ItineraryComponents/BindItineraryCard';
import { useAuth } from '../contexts/AuthContext';

const PostCard = ({ post, onPress }) => {
  const navigation = useNavigation();
  const [userId, setUserId]       = useState(null);
  const [liked, setLiked]         = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [saved, setSaved]             = useState(false);
  const [savedCount, setSavedCount]   = useState(post.savedBy?.length || 0);
  const [commentsPreview, setCommentsPreview] = useState([]);

 
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserId(payload.userId);
      setLiked(post.likes?.includes(payload.userId));
    })();
  }, [post]);

  // Fetch latest comments for this post (show top 2, no mutual filter)
  useEffect(() => {
    let isMounted = true;
    const fetchComments = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/posts/${post._id}/comments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        let allComments = await res.json();
        // Sort comments by createdAt descending (most recent first)
        if (Array.isArray(allComments)) {
          allComments = allComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        if (isMounted && Array.isArray(allComments)) setCommentsPreview(allComments.slice(0, 2));
      } catch (err) {
        // Ignore errors for preview
      }
    };
    fetchComments();
    return () => { isMounted = false; };
  }, [post._id, post.comments?.length]);

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

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-UK', {
      month: 'short',
      day: 'numeric',
    });
  };


  // 3️⃣ Navigate to detail/comments
  const goToComments = () =>
    navigation.navigate('PostDetail', { post });

  return (
    <View style={styles.container}>
      {/* User info row */}
      <View style={styles.userRow}>
        <View style={styles.avatarWrapper}>
        {post.userId?.profilePicture ? (
            <Image
              source={{ uri: post.userId.profilePicture }}
              style={styles.avatar}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {post.userId?.firstName?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => {
          if (post.userId?._id) {
            if (userId === post.userId._id) {
              navigation.navigate('Profile'); // Go to own profile
            } else {
              navigation.navigate('UserProfile', { userId: post.userId._id });
            }
          }
        }}>
          <Text style={styles.username}>
            {(post.userId?.firstName || '') + (post.userId?.lastName ? ' ' + post.userId.lastName : '') || 'User'}
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => onPress?.(post) ?? goToComments()}>
        <Text style={styles.content}>{post.content}</Text>
        {post.images && post.images.length > 0 && (
          <ScrollView horizontal style={{ marginTop: 8 }}>
          {post.images.map((img, index) => {
            console.log('Post image url:', img.url); 

            return (
              <Image
                key={index}
                source={{ uri: `${API_BASE_URL}${img.url}` }}
                style={{ width: 200, height: 200, borderRadius: 8, marginRight: 10 }}
                onError={() => console.log(`Failed to load image: ${img.url}`)}
              />
            );
          })}
  </ScrollView>
)}

      </TouchableOpacity>

      {post.bindItinerary && (
        <BindItineraryCard
          itinerary={post.bindItinerary}
          onPress={() =>
            navigation.navigate('ItineraryDetail', { itinerary: post.bindItinerary })
          }
        />
      )}
      <Text style={styles.timestamp}>
        {new Date(post.createdAt).toLocaleString()}
      </Text>

      

      {/* Actions row (like, comment, save) ABOVE comments preview */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={toggleLike}
          style={styles.actionButton}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={24}
            color={liked ? '#e74c3c' : '#222'}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.actionText}>{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goToComments}
          style={styles.actionButton}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#007AFF" style={{ marginRight: 4 }} />
          <Text style={styles.actionText}>Comments</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleSave} style={styles.actionButton}>
          <MaterialIcons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={saved ? '#007AFF' : '#444'}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.actionText}>{savedCount}</Text>
        </TouchableOpacity>
      </View>

      {/* Comments preview (now below actions) */}
      {commentsPreview.length > 0 && (
        <View style={styles.commentsPreviewRow}>
          {commentsPreview.map((c) => (
            <View key={c._id} style={styles.commentPreviewItemRow}>
              <TouchableOpacity
                onPress={() => {
                  if (c.userId?._id) {
                    if (userId === c.userId._id) {
                      navigation.navigate('Profile');
                    } else {
                      navigation.navigate('UserProfile', { userId: c.userId._id });
                    }
                  }
                }}
              >
                <Text style={styles.commentPreviewNameRow}>
                  {c.userId?.firstName || ''}{c.userId?.lastName ? ` ${c.userId.lastName}` : ''}:
                </Text>
              </TouchableOpacity>
              <Text style={styles.commentPreviewTextRow} numberOfLines={1}>
                {c.content}
              </Text>
            </View>
          ))}
          <TouchableOpacity onPress={goToComments} style={styles.viewAllCommentsRow}>
            <Text style={styles.viewAllCommentsText}>
              View all {post.comments?.length || 0} comments
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container:   { padding: 14, backgroundColor: '#fff', marginBottom: 14, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  content:     { fontSize: 16, marginBottom: 6 },
  timestamp:   { fontSize: 12, color: 'gray', marginTop: 2 },
  actions:     { flexDirection: 'row', marginTop: 10, alignItems: 'center' },
  actionButton:{ flexDirection: 'row', alignItems: 'center', marginRight: 24, paddingVertical: 4 },
  actionText:  { fontSize: 15, color: '#222' },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatarWrapper: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', marginRight: 10, backgroundColor: '#eee' },
  avatar: { width: 38, height: 38, borderRadius: 19, resizeMode: 'cover' },
  avatarPlaceholder: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
  avatarPlaceholderText: { color: '#fff', fontWeight: 'bold' },
  username: { fontWeight: 'bold', fontSize: 15, color: '#222' },
  commentsPreviewRow: { marginTop: 6, marginBottom: 2, backgroundColor: '#f8f8f8', borderRadius: 8, padding: 8 },
  commentPreviewItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  commentPreviewNameRow: { fontWeight: 'bold', color: '#1877f2', fontSize: 14, marginRight: 4 },
  commentPreviewTextRow: { fontSize: 14, color: '#222', flexShrink: 1 },
  viewAllCommentsRow: { marginTop: 4 },
  viewAllCommentsText: { color: '#888', fontSize: 13, fontWeight: 'bold' },
});

export default PostCard;
