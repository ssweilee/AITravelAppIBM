// components/TripCard.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../config';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import ShareModal from './ItineraryComponents/ShareModal';
import MoreMenu from './MoreMenu';
import { useDeleteResource } from '../utils/useDeleteResource';
import { getAvatarUrl } from '../utils/getAvatarUrl';

const TripCard = ({ trip, onPress, onToggleSave, onDeleted }) => {
  console.log('Trip data in TripCard:', JSON.stringify(trip, null, 2));
  const navigation = useNavigation();
  const [userId, setUserId] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(trip.likes?.length || 0);
  const [saved, setSaved] = useState(false);
  const [commentsCount, setCommentsCount] = useState(trip.comments?.length || 0);
  const [commentsPreview, setCommentsPreview] = useState([]);

  // Share functionality state
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [selectedFollowers, setSelectedFollowers] = useState([]);

  // Repost functionality state
  const [repostModalVisible, setRepostModalVisible] = useState(false);
  const [repostText, setRepostText] = useState('');

  // Menu visibility
  const [menuVisible, setMenuVisible] = useState(false);

  const { deleteResource, loading: deleting, error: deleteError } = useDeleteResource();
  const [taggedUsers, setTaggedUsers] = useState([]); // Selected users to tag
    
  useEffect(() => {
    setTaggedUsers(trip.taggedUsers || []);
  }, [trip.taggedUsers]);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserId(payload.userId);
        setLiked(trip.likes?.includes(payload.userId));
        setSaved(trip.savedBy?.includes(payload.userId));
      } catch (e) {
        console.warn('Token parse error', e);
      }
    })();
  }, [trip]);

  useEffect(() => {
    if (userId) {
      setLiked(trip.likes?.includes(userId) || false);
      setLikesCount(trip.likes?.length || 0);
      setSaved(trip.savedBy?.includes(userId) || false);
      setCommentsCount(trip.comments?.length || 0);
    }
  }, [trip.likes, trip.savedBy, trip.comments, userId]);

  // Fetch latest 2 comments for preview
  useEffect(() => {
    let isMounted = true;
    const fetchCommentsPreview = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/trips/${trip._id}/comments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const sorted = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (isMounted) {
          setCommentsPreview(sorted.slice(0, 2));
          setCommentsCount(sorted.length);
        }
      } catch (err) {
        console.warn('Error fetching trip comments preview:', err);
      }
    };
    fetchCommentsPreview();
    return () => {
      isMounted = false;
    };
  }, [trip._id]);

  const toggleLike = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/interactions/trip/${trip._id}/like`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (res.ok) {
        setLiked(result.liked);
        setLikesCount(result.count);
        if (userId) {
          if (!trip.likes) trip.likes = [];
          if (result.liked) {
            if (!trip.likes.includes(userId)) trip.likes.push(userId);
          } else {
            trip.likes = trip.likes.filter((id) => id !== userId);
          }
        }
      } else {
        console.error('Failed to toggle like:', result);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const toggleSave = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/interactions/trip/${trip._id}/save`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const { saved: nowSaved } = await res.json();
      setSaved(nowSaved);
      if (userId) {
        if (!trip.savedBy) trip.savedBy = [];
        if (nowSaved) {
          if (!trip.savedBy.includes(userId)) trip.savedBy.push(userId);
        } else {
          trip.savedBy = trip.savedBy.filter((id) => id !== userId);
        }
      }
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
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24) + 1);
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
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setFollowers(data);
    } catch (error) {
      console.error('Error fetching followers:', error);
    }
  };

  const handleSharePress = () => {
    fetchFollowers();
    setShareModalVisible(true);
  };

  const toggleSelectFollower = (uid) => {
    setSelectedFollowers((prev) =>
      prev.includes(uid) ? prev.filter((i) => i !== uid) : [...prev, uid]
    );
  };

  const confirmShare = async () => {
    if (selectedFollowers.length === 0) {
      Alert.alert('Error', 'Please select at least one person to share with');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentUserResponse = await fetch(`${API_BASE_URL}/api/users/${payload.userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { user: currentUser } = await currentUserResponse.json();
      const senderName = currentUser.firstName || 'Someone';

      const sharePromises = selectedFollowers.map(async (uId) => {
        const chatResponse = await fetch(`${API_BASE_URL}/api/chats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ otherUserId: uId }),
        });
        if (chatResponse.ok) {
          const { chat } = await chatResponse.json();
          const messageResponse = await fetch(`${API_BASE_URL}/api/messages/${chat._id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              text: `${senderName} shared a trip to: ${trip.destination} with you!`,
              sharedTrip: trip._id,
            }),
          });
          return messageResponse.ok;
        }
        return false;
      });

      const results = await Promise.all(sharePromises);
      const successCount = results.filter(Boolean).length;
      if (successCount > 0) {
        Alert.alert(
          'Success',
          `Trip shared with ${successCount} ${successCount === 1 ? 'person' : 'people'}!`
        );
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
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to repost trip');
      }
    } catch (error) {
      console.error('Error reposting trip:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const canDelete = userId && trip.userId?._id?.toString() === userId?.toString();

  const confirmDeleteTrip = async () => {
    try {
      await deleteResource(`/api/trips/${trip._id}`);
      onDeleted && onDeleted(trip._id);
    } catch (e) {
      Alert.alert('Delete failed', e.message || 'Could not delete trip');
    }
  };

  console.log('JtaggedUsers:', trip.taggedUsers)

  return (
    <View style={styles.container}>
      {/* Top row: user + more menu */}
      <View style={[styles.userRow]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.avatarWrapper}>
            <Image
              source={
                trip.userId?.profilePicture
                  ? { uri: getAvatarUrl(trip.userId.profilePicture) }
                  : require('../assets/icon.png')
              }
              style={styles.avatar}
            />
          </View>
          <TouchableOpacity
            onPress={() => {
              if (trip.userId?._id) {
                if (userId === trip.userId._id) {
                  navigation.navigate('Profile');
                } else {
                  navigation.navigate('UserProfile', { userId: trip.userId._id });
                }
              }
            }}
          >
            <Text style={styles.username}>
              {(trip.userId?.firstName || '') +
                (trip.userId?.lastName ? ' ' + trip.userId.lastName : '') ||
                'User'}
            </Text>
          </TouchableOpacity>
        </View>
        {canDelete && (
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {deleting ? (
              <ActivityIndicator size="small" />
            ) : (
              <Feather name="more-vertical" size={20} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Trip content */}
      <TouchableOpacity onPress={() => (onPress ? onPress(trip) : goToTripDetail())}>
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

      {trip.taggedUsers && trip.taggedUsers.length > 0 && (
        <Text style={styles.taggedPeopleContainer}>
          {trip.taggedUsers.map((user, i) => (
            <Text
              key={user._id}
              style={[styles.taggedPersonName, { color: '#007AFF', fontWeight: 'bold' }]}
              onPress={() => {
                if (userId === user._id) {
                  navigation.navigate('Profile');
                } else {
                  navigation.navigate('UserProfile', { userId: user._id });
                }
              }}
            >
              @{user.firstName} {user.lastName}
              {i !== trip.taggedUsers.length - 1 ? ', ' : ''}
            </Text>  
          ))}  
        </Text>  
      )}  

        {trip.description && (
          <Text style={styles.description} numberOfLines={3}>
            {trip.description}
          </Text>
        )}

        {trip.posts && trip.posts.length > 0 && (
          <View style={styles.postsPreview}>
            <Text style={styles.postsPreviewTitle}>
              {trip.posts.length} post{trip.posts.length > 1 ? 's' : ''} in this trip
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.postsScroll}
            >
              {trip.posts.slice(0, 3).map((postItem, index) => (
                <View key={postItem._id || index} style={styles.postPreview}>
                  <Text numberOfLines={2} style={styles.postPreviewText}>
                    {postItem.content || 'Post content'}
                  </Text>
                  {postItem.images && postItem.images.length > 0 && (
                    <View style={styles.postImageContainer}>
                      {postItem.images.slice(0, 1).map((img, imgIndex) => {
                        let imageUrl;
                        if (img.url && img.url.includes('/uploads/')) {
                          const uploadsPath = img.url.substring(
                            img.url.indexOf('/uploads/')
                          );
                          imageUrl = `${API_BASE_URL}${uploadsPath}`;
                        } else {
                          imageUrl = img.url;
                        }
                        return (
                          <Image
                            key={imgIndex}
                            source={{ uri: imageUrl }}
                            style={styles.postPreviewImage}
                          />
                        );
                      })}
                      {trip.posts.length > 3 && (
                        <Text style={styles.moreImagesText}>
                          +{trip.posts.length - 3} more
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              ))}
              {trip.posts.length > 3 && (
                <View style={styles.morePostsIndicator}>
                  <Text style={styles.morePostsText}>
                    +{trip.posts.length - 3} more
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* Preview of itineraries in trip */}
        {trip.itineraries && trip.itineraries.length > 0 && (
          <View style={styles.itinerariesPreview}>
            <Text style={styles.itinerariesPreviewTitle}>
              {trip.itineraries.length} itinerary{trip.itineraries.length > 1 ? 's' : ''} in this trip
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.itinerariesScroll}
            >
              {trip.itineraries.slice(0, 3).map((itineraryItem, index) => (
                <View key={itineraryItem._id || index} style={styles.itineraryPreview}>
                  <View style={styles.itineraryPreviewHeader}>
                    <Ionicons name="map-outline" size={16} color="#007AFF" />
                    <Text numberOfLines={1} style={styles.itineraryPreviewTitle}>
                      {itineraryItem.title || itineraryItem.destination}
                    </Text>
                  </View>
                  <Text numberOfLines={1} style={styles.itineraryPreviewDestination}>
                    {itineraryItem.destination}
                  </Text>
                  {itineraryItem.description && (
                    <Text numberOfLines={2} style={styles.itineraryPreviewDescription}>
                      {itineraryItem.description}
                    </Text>
                  )}
                  <Text style={styles.itineraryPreviewDays}>
                    {itineraryItem.days?.length || 0} day{itineraryItem.days?.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              ))}
              {trip.itineraries.length > 3 && (
                <View style={styles.moreItinerariesIndicator}>
                  <Text style={styles.moreItinerariesText}>
                    +{trip.itineraries.length - 3} more
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* Trip Tags */}
        {trip.tags && trip.tags.length > 0 && (
          <View style={styles.tagContainer}>
            {trip.tags.map((tag, index) => (
              <View key={index} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.timestamp}>{new Date(trip.createdAt).toLocaleString()}</Text>

      {/* Actions row */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={toggleLike} style={styles.actionButton}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={24}
            color={liked ? '#e74c3c' : '#222'}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.actionText}>{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goToTripDetail} style={styles.actionButton}>
          <Ionicons
            name="chatbubble-outline"
            size={24}
            color="#222"
            style={{ marginRight: 4 }}
          />
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

      {/* Comments preview (static, no delete on hold) */}
      {commentsPreview.length > 0 && (
        <View style={styles.commentsPreviewContainer}>
          {commentsPreview.map((c) => (
            <View key={c._id} style={styles.commentRow}>
              <View style={{ flex: 1, flexDirection: 'row' }}>
                <Text style={styles.commentAuthor}>
                  {(c.userId?.firstName || '') +
                    (c.userId?.lastName ? ' ' + c.userId.lastName : '')}
                  :
                </Text>
                <Text style={styles.commentText} numberOfLines={1}>
                  {c.content}
                </Text>
              </View>
              <Text style={styles.commentTime}>
                {new Date(c.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          ))}
          <TouchableOpacity onPress={goToTripDetail}>
            <Text style={styles.viewAllCommentsText}>
              View all {commentsCount} comment{commentsCount !== 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
            <Text style={repostModalStyles.modalSubtitle}>
              Add your thoughts about this trip (optional)
            </Text>

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

      {/* Trip MoreMenu */}
      <MoreMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        options={[
          {
            label: 'Delete Trip',
            destructive: true,
            icon: <Feather name="trash-2" size={18} color="#d32f2f" />,
            onPress: () => {
              Alert.alert(
                'Delete trip',
                'Are you sure you want to delete this trip? This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: confirmDeleteTrip,
                  },
                ]
              );
            },
          },
        ]}
      />

      {deleteError && (
        <Text style={{ color: 'red', marginTop: 6 }}>
          Error deleting trip: {deleteError.message || 'Unknown error'}
        </Text>
      )}
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
    shadowOffset: { width: 0, height: 2 },
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  avatarWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: '#eee',
  },
  avatar: { width: 38, height: 38, borderRadius: 19, resizeMode: 'cover' },
  username: { fontWeight: 'bold', fontSize: 15, color: '#222' },
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
    color: '#666',
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
  // STYLES FOR ITINERARIES PREVIEW
  itinerariesPreview: {
    marginBottom: 12,
  },
  itinerariesPreviewTitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  itinerariesScroll: {
    flexDirection: 'row',
  },
  itineraryPreview: {
    backgroundColor: '#e6f3ff',
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
    width: 140,
    minHeight: 80,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  itineraryPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itineraryPreviewTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#222',
    marginLeft: 4,
    flex: 1,
  },
  itineraryPreviewDestination: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  itineraryPreviewDescription: {
    fontSize: 10,
    color: '#555',
    marginBottom: 4,
    lineHeight: 12,
  },
  itineraryPreviewDays: {
    fontSize: 10,
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 'auto',
  },
  moreItinerariesIndicator: {
    backgroundColor: '#e9ecef',
    padding: 8,
    borderRadius: 8,
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreItinerariesText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  // STYLES FOR TRIP TAGS
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    marginTop: 8,
  },
  tagChip: {
    backgroundColor: '#e6f0ff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 12,
    color: 'gray',
    marginTop: 8,
  },
  actions: { flexDirection: 'row', marginTop: 12, alignItems: 'center' },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 20, paddingVertical: 4 },
  actionText: { fontSize: 15, color: '#222' },
  commentsPreviewContainer: {
    marginTop: 12,
    backgroundColor: '#f4f7fa',
    borderRadius: 8,
    padding: 10,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: {
    fontWeight: '600',
    marginRight: 4,
    color: '#222',
  },
  commentText: {
    flex: 1,
    color: '#333',
  },
  commentTime: {
    fontSize: 10,
    color: '#888',
    marginLeft: 6,
  },
  viewAllCommentsText: {
    marginTop: 4,
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 13,
  },
});

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
    taggedPeopleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 12,
  },
  taggedPerson: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  taggedPersonAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  taggedPersonName: {
    marginLeft: 4,
    fontSize: 14,
    color: '#555',
  },
});

export default TripCard;