import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Alert, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../config';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import ShareModal from './ItineraryComponents/ShareModal';

const TripCard = ({ trip, onPress, onToggleSave }) => {
  const navigation = useNavigation();
  const [userId, setUserId] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(trip.likes?.length || 0);
  const [saved, setSaved] = useState(false);
  const [commentsCount, setCommentsCount] = useState(trip.comments?.length || 0);
  
  // Share functionality state
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [selectedFollowers, setSelectedFollowers] = useState([]);
  
  // Repost functionality state
  const [repostModalVisible, setRepostModalVisible] = useState(false);
  const [repostText, setRepostText] = useState('');

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserId(payload.userId);
      setLiked(trip.likes?.includes(payload.userId));
      setSaved(trip.savedBy?.includes(payload.userId));
    })();
  }, [trip]);

  const toggleLike = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        `${API_BASE_URL}/api/interactions/trip/${trip._id}/like`,
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
        `${API_BASE_URL}/api/interactions/trip/${trip._id}/save`,
        { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }
      );
      const { saved: nowSaved } = await res.json();
      
      // Update local state
      setSaved(nowSaved);
      
      // Update the trip object's savedBy array to keep it in sync
      if (userId) {
        if (!trip.savedBy) {
          trip.savedBy = [];
        }
        
        if (nowSaved) {
          if (!trip.savedBy.includes(userId)) {
            trip.savedBy.push(userId);
          }
        } else {
          trip.savedBy = trip.savedBy.filter(id => id !== userId);
        }
      }

      // Call the onToggleSave callback if provided (for SavedPostsScreen)
      if (typeof onToggleSave === 'function') {
        onToggleSave(trip._id, nowSaved);
      }

    } catch (err) {
      console.error('Error toggling save:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-UK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateTripDuration = () => {
    if (!trip.startDate || !trip.endDate) return '';
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  };

  const goToTripDetail = () => {
    navigation.navigate('TripDetail', { trip });
  };

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
          
          // Send message with shared trip
          const messageResponse = await fetch(`${API_BASE_URL}/api/messages/${chat._id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ 
              text: `${senderName} shared a trip to: ${trip.destination} with you!`,
              sharedTrip: trip._id
            })
          });

          return messageResponse.ok;
        }
        return false;
      });

      const results = await Promise.all(sharePromises);
      const successCount = results.filter(Boolean).length;

      if (successCount > 0) {
        Alert.alert('Success', `Trip shared with ${successCount} ${successCount === 1 ? 'person' : 'people'}!`);
        setShareModalVisible(false);
        setSelectedFollowers([]);
      } else {
        Alert.alert('Error', 'Failed to share trip. Please try again.');
      }
    } catch (error) {
      console.error('Error sharing trip:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  // Repost functionality
  const handleRepost = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: repostText.trim() || `Check out this amazing trip to ${trip.destination}!`,
          bindTrip: trip._id,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Trip reposted successfully!');
        setRepostModalVisible(false);
        setRepostText('');
        // Optionally refresh the feed or navigate somewhere
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to repost trip');
      }
    } catch (error) {
      console.error('Error reposting trip:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* User info row */}
      <View style={styles.userRow}>
        <View style={styles.avatarWrapper}>
          <Image
            source={require('../assets/icon.png')}
            style={styles.avatar}
          />
        </View>
        <TouchableOpacity onPress={() => {
          if (trip.userId?._id) {
            if (userId === trip.userId._id) {
              navigation.navigate('Profile');
            } else {
              navigation.navigate('UserProfile', { userId: trip.userId._id });
            }
          }
        }}>
          <Text style={styles.username}>
            {(trip.userId?.firstName || '') + (trip.userId?.lastName ? ' ' + trip.userId.lastName : '') || 'User'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Trip content */}
      <TouchableOpacity onPress={() => onPress?.(trip) ?? goToTripDetail()}>
        <View style={styles.tripHeader}>
          <Text style={styles.tripTitle}>{trip.title}</Text>
          <View style={styles.tripMeta}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.destination}>{trip.destination}</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.duration}>{calculateTripDuration()}</Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <Text style={styles.dateText}>
            {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
          </Text>
          <Text style={styles.budget}>Budget: ${trip.budget}</Text>
        </View>

        {trip.description && (
          <Text style={styles.description} numberOfLines={3}>
            {trip.description}
          </Text>
        )}

        {/* Preview of posts in trip - UPDATED WITH IMAGES */}
        {trip.posts && trip.posts.length > 0 && (
          <View style={styles.postsPreview}>
            <Text style={styles.postsPreviewTitle}>
              {trip.posts.length} post{trip.posts.length > 1 ? 's' : ''} in this trip
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.postsScroll}>
              {trip.posts.slice(0, 3).map((post, index) => (
                <View key={post._id || index} style={styles.postPreview}>
                  <Text numberOfLines={2} style={styles.postPreviewText}>
                    {post.content || 'Post content'}
                  </Text>
                  {/* Add image rendering for posts */}
                  {post.images && post.images.length > 0 && (
                    <View style={styles.postImageContainer}>
                      {post.images.slice(0, 1).map((img, imgIndex) => {
                        // Use the same image URL logic as PostCard
                        let imageUrl;
                        if (img.url && img.url.includes('/uploads/')) {
                          const uploadsPath = img.url.substring(img.url.indexOf('/uploads/'));
                          imageUrl = `${API_BASE_URL}${uploadsPath}`;
                        } else {
                          imageUrl = img.url;
                        }
                        
                        return (
                          <Image
                            key={imgIndex}
                            source={{ uri: imageUrl }}
                            style={styles.postPreviewImage}
                            onError={() => {
                              // Fallback for dead ngrok URLs
                              if (img.url.startsWith('http') && img.url !== imageUrl) {
                                // Could add fallback logic here if needed
                              }
                            }}
                          />
                        );
                      })}
                      {post.images.length > 1 && (
                        <Text style={styles.moreImagesText}>+{post.images.length - 1}</Text>
                      )}
                    </View>
                  )}
                </View>
              ))}
              {trip.posts.length > 3 && (
                <View style={styles.morePostsIndicator}>
                  <Text style={styles.morePostsText}>+{trip.posts.length - 3} more</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.timestamp}>
        {new Date(trip.createdAt).toLocaleString()}
      </Text>

      {/* Actions row (like, comment, save, share, repost) */}
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
          onPress={goToTripDetail}
          style={styles.actionButton}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#007AFF" style={{ marginRight: 4 }} />
          <Text style={styles.actionText}>{commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleSave} style={styles.actionButton}>
          <MaterialIcons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={saved ? '#007AFF' : '#444'}
            style={{ marginRight: 4 }}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSharePress} style={styles.actionButton}>
          <Ionicons
            name="share-outline"
            size={24}
            color="#444"
            style={{ marginRight: 4 }}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setRepostModalVisible(true)} style={styles.actionButton}>
          <Ionicons
            name="repeat-outline"
            size={24}
            color="#444"
            style={{ marginRight: 4 }}
          />
        </TouchableOpacity>
      </View>

      {/* Repost Modal */}
      <Modal
        visible={repostModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRepostModalVisible(false)}
      >
        <View style={repostModalStyles.modalOverlay}>
          <View style={repostModalStyles.modalContent}>
            <Text style={repostModalStyles.modalTitle}>Repost Trip</Text>
            <Text style={repostModalStyles.modalSubtitle}>Add your thoughts about this trip (optional)</Text>
            
            <TextInput
              style={repostModalStyles.textInput}
              value={repostText}
              onChangeText={setRepostText}
              placeholder={`What do you think about this trip to ${trip.destination}?`}
              multiline
              maxLength={500}
            />
            
            <View style={repostModalStyles.buttonRow}>
              <TouchableOpacity
                style={[repostModalStyles.button, repostModalStyles.cancelButton]}
                onPress={() => {
                  setRepostModalVisible(false);
                  setRepostText('');
                }}
              >
                <Text style={repostModalStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[repostModalStyles.button, repostModalStyles.repostButton]}
                onPress={handleRepost}
              >
                <Text style={repostModalStyles.repostButtonText}>Repost</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
        contentType="trip"
        styles={shareModalStyles}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    padding: 14, 
    backgroundColor: '#fff', 
    marginBottom: 14, 
    borderRadius: 12, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOpacity: 0.06, 
    shadowRadius: 6, 
    shadowOffset: { width: 0, height: 2 } 
  },
  userRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  avatarWrapper: { 
    width: 38, 
    height: 38, 
    borderRadius: 19, 
    overflow: 'hidden', 
    marginRight: 10, 
    backgroundColor: '#eee' 
  },
  avatar: { 
    width: 38, 
    height: 38, 
    borderRadius: 19, 
    resizeMode: 'cover' 
  },
  username: { 
    fontWeight: 'bold', 
    fontSize: 15, 
    color: '#222' 
  },
  tripHeader: {
    marginBottom: 8,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  tripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  destination: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  separator: {
    fontSize: 14,
    color: '#999',
    marginHorizontal: 8,
  },
  duration: {
    fontSize: 14,
    color: '#666',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  budget: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
  },
  description: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  postsPreview: {
    marginBottom: 12,
  },
  postsPreviewTitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  postsScroll: {
    flexDirection: 'row',
  },
  postPreview: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
    width: 120,
    minHeight: 60,
  },
  postPreviewText: {
    fontSize: 12,
    color: '#555',
  },
  // NEW STYLES FOR IMAGES
  postImageContainer: {
    marginTop: 4,
    position: 'relative',
  },
  postPreviewImage: {
    width: '100%',
    height: 60,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  moreImagesText: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    fontSize: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  morePostsIndicator: {
    backgroundColor: '#e9ecef',
    padding: 8,
    borderRadius: 8,
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  morePostsText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  timestamp: { 
    fontSize: 12, 
    color: 'gray', 
    marginTop: 8 
  },
  actions: { 
    flexDirection: 'row', 
    marginTop: 12, 
    alignItems: 'center' 
  },
  actionButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginRight: 20, 
    paddingVertical: 4 
  },
  actionText: { 
    fontSize: 15, 
    color: '#222' 
  },
});

// Repost Modal Styles
const repostModalStyles = StyleSheet.create({
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
    width: '90%',
    maxHeight: '60%',
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
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  repostButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  repostButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
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

export default TripCard;