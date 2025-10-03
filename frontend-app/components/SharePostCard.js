import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../config';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import BindItineraryCard from './ItineraryComponents/BindItineraryCard';
import ShareTripCard from './ShareTripCard';
import { getAvatarUrl } from '../utils/getAvatarUrl';

const SharePostCard = ({ post }) => {
  const navigation = useNavigation();
  const [userId, setUserId] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [saved, setSaved] = useState(false);

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
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const toggleSave = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        `${API_BASE_URL}/api/interactions/post/${post._id}/save`,
        { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }
      );
      const { saved: nowSaved } = await res.json();
      setSaved(nowSaved);
    } catch (err) {
      console.error('Error toggling save:', err);
    }
  };

  const goToPostDetail = () => {
    navigation.navigate('PostDetail', { post });
  };

  if (!post) return null;

  return (
    <View style={styles.container}>
      {/* Shared post indicator */}
      <View style={styles.sharedIndicator}>
        <Ionicons name="share-outline" size={14} color="#666" />
        <Text style={styles.sharedText}>Shared Post</Text>
      </View>

      {/* User info row */}
      <View style={styles.userRow}>
        <View style={styles.avatarWrapper}>
        <Image
              source={
                post.userId?.profilePicture
                ? { uri: getAvatarUrl(post.userId.profilePicture) }
                  : require('../assets/icon.png')
              }
              style={styles.avatar}
            />
        </View>
        <TouchableOpacity onPress={() => {
          if (post.userId?._id) {
            if (userId === post.userId._id) {
              navigation.navigate('Profile');
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

      {/* Post content */}
      <TouchableOpacity onPress={goToPostDetail}>
        <Text style={styles.content}>{post.content}</Text>
        
        {/* Post Images */}
        {post.images && post.images.length > 0 && (
          <ScrollView horizontal style={styles.imagesContainer} showsHorizontalScrollIndicator={false}>
            {post.images.map((img, index) => {
              console.log('SharePostCard image url:', img.url);
              
              // Smart URL conversion: use current user's API_BASE_URL with the filename
              let imageUrl;
              
              if (img.url && img.url.includes('/uploads/')) {
                // Extract the /uploads/filename part from any URL format
                const uploadsPath = img.url.substring(img.url.indexOf('/uploads/'));
                // Use current user's server base URL
                imageUrl = `${API_BASE_URL}${uploadsPath}`;
              } else {
                // Fallback: use as is
                imageUrl = img.url;
              }
              
              console.log('SharePostCard converted to:', imageUrl);

              return (
                <Image
                  key={index}
                  source={{ uri: imageUrl }}
                  style={styles.postImage}
                  onError={() => console.log(`Failed to load image: ${imageUrl}`)}
                  onLoad={() => console.log(`Successfully loaded: ${imageUrl}`)}
                />
              );
            })}
          </ScrollView>
        )}
      </TouchableOpacity>

      {/* Render bound itinerary */}
      {post.bindItinerary && (
        <BindItineraryCard
          itinerary={post.bindItinerary}
          onPress={() =>
            navigation.navigate('ItineraryDetail', { itinerary: post.bindItinerary })
          }
        />
      )}

      {/* Render bound trip */}
      {post.bindTrip && (
        <ShareTripCard trip={post.bindTrip} />
      )}

      <Text style={styles.timestamp}>
        {new Date(post.createdAt).toLocaleString()}
      </Text>

      {/* Actions row */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={toggleLike} style={styles.actionButton}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? '#e74c3c' : '#222'}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.actionText}>{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goToPostDetail} style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color="#007AFF" style={{ marginRight: 4 }} />
          <Text style={styles.actionText}>Comments</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleSave} style={styles.actionButton}>
          <MaterialIcons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={saved ? '#007AFF' : '#444'}
            style={{ marginRight: 4 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#28a745',
  },
  sharedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sharedText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 8,
    backgroundColor: '#eee',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    resizeMode: 'cover',
  },
  username: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#222',
  },
  content: {
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 18,
  },
  imagesContainer: {
    marginTop: 6,
    marginBottom: 6,
  },
  postImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  timestamp: {
    fontSize: 11,
    color: 'gray',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    paddingVertical: 2,
  },
  actionText: {
    fontSize: 13,
    color: '#222',
  },
});

export default SharePostCard;