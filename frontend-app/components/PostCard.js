import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../config';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import BindItineraryCard from './ItineraryComponents/BindItineraryCard';
import ShareModal from './ItineraryComponents/ShareModal';
import BindTripCard from './BindTripCard';


const PostCard = ({ post, onPress, onToggleSave }) => {
  const navigation = useNavigation();
  const [userId, setUserId] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [saved, setSaved] = useState(false);
  const [commentsPreview, setCommentsPreview] = useState([]);
  
  // Share functionality state
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [selectedFollowers, setSelectedFollowers] = useState([]);

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
        `${API_BASE_URL}/api/interactions/post/${post._id}/save`,
        { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }
      );
      const { saved: nowSaved } = await res.json();
      
      // Update local state
      setSaved(nowSaved);
      
      // Update the post object's savedBy array to keep it in sync
      if (userId) {
        if (!post.savedBy) {
          post.savedBy = [];
        }
        
        if (nowSaved) {
          // Add userId to savedBy if not already present
          if (!post.savedBy.includes(userId)) {
            post.savedBy.push(userId);
          }
        } else {
          // Remove userId from savedBy
          post.savedBy = post.savedBy.filter(id => id !== userId);
        }
      }
      
      // Call the onToggleSave callback if provided (for SavedPostsScreen)
      if (typeof onToggleSave === 'function') {
        onToggleSave(post._id, nowSaved);
      }

    } catch (err) {
      console.error('Error toggling save:', err);
    }
  };

  // Navigate to detail/comments
  const goToComments = () =>
    navigation.navigate('PostDetail', { post });

  // Share functionality
  const fetchFollowers = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/followers-following`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setFollowers(data);
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
    }
  };

  const handleSharePress = () => {
    fetchFollowers();
    setShareModalVisible(true);
  };

  const toggleSelectFollower = (userId) => {
    setSelectedFollowers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const confirmShare = async () => {
  if (selectedFollowers.length === 0) {
    Alert.alert('Error', 'Please select at least one person to share with');
    return;
  }

  try {
    const token = await AsyncStorage.getItem('token');
    
    // Get current user's name for the message
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentUserResponse = await fetch(`${API_BASE_URL}/api/users/${payload.userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const { user: currentUser } = await currentUserResponse.json();
    const senderName = currentUser.firstName || 'Someone';
    
    const sharePromises = selectedFollowers.map(async (userId) => {
      // Use existing chat endpoint
      const chatResponse = await fetch(`${API_BASE_URL}/api/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ otherUserId: userId })
      });

      if (chatResponse.ok) {
        const { chat } = await chatResponse.json();
        
        // Send message with shared post
        const messageResponse = await fetch(`${API_BASE_URL}/api/messages/${chat._id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ 
            text: `${senderName} shared a post with you!`,
            sharedPost: post._id
          })
        });

        return messageResponse.ok;
      }
      return false;
    });

    const results = await Promise.all(sharePromises);
    const successCount = results.filter(Boolean).length;

    if (successCount > 0) {
      Alert.alert('Success', `Post shared with ${successCount} ${successCount === 1 ? 'person' : 'people'}!`);
      setShareModalVisible(false);
      setSelectedFollowers([]);
    } else {
      Alert.alert('Error', 'Failed to share post. Please try again.');
    }
  } catch (error) {
    console.error('Error sharing post:', error);
    Alert.alert('Error', 'Network error. Please try again.');
  }
};

  return (
    <View style={styles.container}>
      {/* User info row */}
      <View style={styles.userRow}>
        <View style={styles.avatarWrapper}>
          <Image
            source={require('../assets/icon.png')} // Dummy profile photo
            style={styles.avatar}
          />
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
      console.log('Original image url:', img.url);
      
      // Smart URL conversion: use current user's API_BASE_URL with the filename
      let imageUrl;
      
      if (img.url.includes('/uploads/')) {
        // Extract the /uploads/filename part from any URL format
        const uploadsPath = img.url.substring(img.url.indexOf('/uploads/'));
        // Use current user's server base URL
        imageUrl = `${API_BASE_URL}${uploadsPath}`;
      } else {
        // Fallback: use as is
        imageUrl = img.url;
      }
      
      console.log('Converted to:', imageUrl);

      return (
        <Image
          key={index}
          source={{ uri: imageUrl }}
          style={{ width: 200, height: 200, borderRadius: 8, marginRight: 10 }}
          onError={() => console.log(`Failed to load image: ${imageUrl}`)}
          onLoad={() => console.log(`Successfully loaded: ${imageUrl}`)}
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
      {post.bindTrip && (
        <BindTripCard
          trip={post.bindTrip}
          onPress={() =>
          navigation.navigate('TripDetail', { trip: post.bindTrip })
          }
        />
      )}
      <Text style={styles.timestamp}>
        {new Date(post.createdAt).toLocaleString()}
      </Text>

      {/* Actions row (like, comment, save, share) ABOVE comments preview */}
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
            style={{ marginRight: 4 }}/>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSharePress} style={styles.actionButton}>
          <Ionicons
            name="share-outline"
            size={24}
            color="#444"
            style={{ marginRight: 4 }}
          />
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
      
      {/* Share Modal */}
      <ShareModal
        visible={shareModalVisible}
        onClose={() => {
          setShareModalVisible(false);
          setSelectedFollowers([]);
        }}
        onConfirm={confirmShare}
        users={followers}
        selectedFollowers={selectedFollowers}
        toggleSelectFollower={toggleSelectFollower}
        contentType="post"
        styles={shareModalStyles}
      />
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
  username: { fontWeight: 'bold', fontSize: 15, color: '#222' },
  commentsPreviewRow: { marginTop: 6, marginBottom: 2, backgroundColor: '#f8f8f8', borderRadius: 8, padding: 8 },
  commentPreviewItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  commentPreviewNameRow: { fontWeight: 'bold', color: '#1877f2', fontSize: 14, marginRight: 4 },
  commentPreviewTextRow: { fontSize: 14, color: '#222', flexShrink: 1 },
  viewAllCommentsRow: { marginTop: 4 },
  viewAllCommentsText: { color: '#888', fontSize: 13, fontWeight: 'bold' },
});

// Share Modal Styles
const shareModalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalUserName: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkboxBox: {
    marginLeft: 'auto',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  modalCloseButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default PostCard;