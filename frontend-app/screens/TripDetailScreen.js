// screens/TripDetailScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import MoreMenu from '../components/MoreMenu';
import PostCard from '../components/PostCard';
import { getAvatarUrl } from '../utils/getAvatarUrl';

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

const TripDetailScreen = ({ route, navigation }) => {
  const { trip: initialTrip } = route.params;
  const [trip, setTrip] = useState(initialTrip);
  const [loading, setLoading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // Comment menu state
  const [commentMenuVisible, setCommentMenuVisible] = useState(false);
  const [menuComment, setMenuComment] = useState(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const [commentDeleteError, setCommentDeleteError] = useState(null);

  useEffect(() => {
    const initializeData = async () => {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const payload = parseJwt(token);
        if (payload?.userId) {
          setUserId(payload.userId);
          setLiked(trip.likes?.includes(payload.userId) || false);
          setLikesCount(trip.likes?.length || 0);
          setSaved(trip.savedBy?.includes(payload.userId) || false);
        }
      }
    };

    initializeData();
    fetchTripDetails();
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip._id]);

  const fetchComments = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/trips/${trip._id}/comments`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        let commentsData = await response.json();
        if (Array.isArray(commentsData)) {
          // Normalize shape
          commentsData = commentsData.map((c) => ({
            ...c,
            content: c.content ?? c.text ?? '',
          }));
          commentsData.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
          setComments(commentsData);
        }
      } else {
        const err = await response.text();
        console.warn('Failed to fetch trip comments:', err);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    setCommentLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/trips/${trip._id}/comment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: newComment.trim() }),
        }
      );

      const payload = await response.json();
      if (response.ok) {
        // Optimistically prepend
        const newC = {
          ...payload,
          content: payload.content ?? payload.text ?? '',
        };
        setComments((prev) => [newC, ...prev]);
        setNewComment('');
        // Optionally refresh to get full nested user info
        fetchComments();
      } else {
        Alert.alert('Error', payload.message || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setCommentLoading(false);
    }
  };

  const fetchTripDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/trips/${trip._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const updatedTrip = await response.json();
        setTrip(updatedTrip);
      }
    } catch (error) {
      console.error('Error fetching trip details:', error);
    } finally {
      setLoading(false);
    }
  };

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
        setTrip((t) => {
          const updated = { ...t };
          if (!updated.likes) updated.likes = [];
          if (result.liked) {
            if (!updated.likes.includes(userId)) updated.likes.push(userId);
          } else {
            updated.likes = updated.likes.filter((id) => id !== userId);
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const toggleSave = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        `${API_BASE_URL}/api/interactions/trip/${trip._id}/save`,
        { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }
      );
      const { saved: nowSaved } = await res.json();
      setSaved(nowSaved);
      setTrip((t) => {
        const updated = { ...t };
        if (!updated.savedBy) updated.savedBy = [];
        if (nowSaved) {
          if (!updated.savedBy.includes(userId)) updated.savedBy.push(userId);
        } else {
          updated.savedBy = updated.savedBy.filter((id) => id !== userId);
        }
        return updated;
      });
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

  const getImageUrl = (imgUrl) => {
    if (imgUrl && imgUrl.includes('/uploads/')) {
      const uploadsPath = imgUrl.substring(imgUrl.indexOf('/uploads/'));
      return `${API_BASE_URL}${uploadsPath}`;
    }
    return imgUrl;
  };

  const onCommentLongPress = (comment) => {
    if (userId && comment.userId?._id?.toString() === userId.toString()) {
      setMenuComment(comment);
      setCommentMenuVisible(true);
      setCommentDeleteError(null);
    }
  };

  const handleDeleteComment = async () => {
    if (!menuComment) return;
    if (!userId) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }
    if (menuComment.userId?._id?.toString() !== userId.toString()) {
      Alert.alert('Cannot delete', 'You can only delete your own comment.');
      return;
    }

    Alert.alert(
      'Delete comment',
      'Are you sure you want to delete this comment? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingComment(true);
            try {
              const token = await AsyncStorage.getItem('token');
              const res = await fetch(
                `${API_BASE_URL}/api/trips/${trip._id}/comment/${menuComment._id}`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              const body = await res.json();
              if (res.ok) {
                setComments((prev) =>
                  prev.filter((c) => c._id !== menuComment._id)
                );
                setCommentMenuVisible(false);
                setMenuComment(null);
              } else {
                console.error('Delete comment failed:', body);
                setCommentDeleteError(body.message || 'Failed to delete');
                Alert.alert('Delete failed', body.message || 'Could not delete comment');
              }
            } catch (err) {
              console.error('Error deleting comment:', err);
              setCommentDeleteError(err.message);
              Alert.alert('Error', 'Network error. Please try again.');
            } finally {
              setDeletingComment(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !trip.posts) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User info row */}
        <View style={styles.userRow}>
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
          <View style={styles.userInfo}>
            <Text style={styles.username}>
              {(trip.userId?.firstName || '') +
                (trip.userId?.lastName ? ' ' + trip.userId.lastName : '') ||
                'User'}
            </Text>
            <Text style={styles.postDate}>
              {new Date(trip.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Trip Info */}
        <View style={styles.tripInfo}>
          <Text style={styles.tripTitle}>{trip.title}</Text>

          <View style={styles.tripMeta}>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={18} color="#666" />
              <Text style={styles.destination}>{trip.destination}</Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={18} color="#666" />
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
            <Text style={styles.description}>{trip.description}</Text>
          )}
        </View>

        {/* Trip Posts Grid */}
        {trip.posts && trip.posts.length > 0 && (
          <View style={styles.postsSection}>
            <Text style={styles.sectionTitle}>
              Posts in this trip ({trip.posts.length})
            </Text>
            <View style={styles.postsGrid}>
              {trip.posts.map((post, index) => (
                <TouchableOpacity
                  key={post._id || `post-${index}`}
                  style={styles.postBox}
                  onPress={() => navigation.navigate('PostDetail', { post })}
                  activeOpacity={0.7}
                >
                  <View style={styles.postBoxContent}>
                    {post.images && post.images.length > 0 ? (
                      <>
                        <Text
                          style={styles.postBoxTextWithImage}
                          numberOfLines={2}
                        >
                          {post.content || 'Post content'}
                        </Text>
                        <View style={styles.postImageContainer}>
                          <Image
                            source={{ uri: getImageUrl(post.images[0].url) }}
                            style={styles.postBoxImage}
                            onError={() =>
                              console.log(
                                `Failed to load image: ${getImageUrl(
                                  post.images[0].url
                                )}`
                              )
                            }
                          />
                          {post.images.length > 1 && (
                            <View style={styles.imageCountBadge}>
                              <Text style={styles.imageCountText}>
                                +{post.images.length - 1}
                              </Text>
                            </View>
                          )}
                        </View>
                      </>
                    ) : (
                      <Text style={styles.postBoxText} numberOfLines={4}>
                        {post.content || 'Post content'}
                      </Text>
                    )}

                    <View style={styles.postBoxFooter}>
                      <Text style={styles.postBoxDate}>
                        {new Date(post.createdAt).toLocaleDateString(
                          'en-UK',
                          {
                            day: 'numeric',
                            month: 'short',
                          }
                        )}
                      </Text>
                      {post.likes && post.likes.length > 0 && (
                        <View style={styles.postBoxLikes}>
                          <Ionicons name="heart" size={12} color="#e74c3c" />
                          <Text style={styles.postBoxLikesText}>
                            {post.likes.length}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Trip Actions */}
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

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons
              name="chatbubble-outline"
              size={24}
              color="#007AFF"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.actionText}>{comments.length}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleSave} style={styles.actionButton}>
            <MaterialIcons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={saved ? '#007AFF' : '#444'}
              style={{ marginRight: 4 }}
            />
          </TouchableOpacity>
        </View>

        {/* Comments section */}
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>
            Comments ({comments.length})
          </Text>

          <View style={styles.addCommentContainer}>
            <TextInput
              style={styles.commentInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Write a comment..."
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.addCommentButton,
                commentLoading && styles.addCommentButtonDisabled,
              ]}
              onPress={addComment}
              disabled={commentLoading}
            >
              {commentLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {comments.length === 0 ? (
            <Text style={styles.noComments}>
              No comments yet. Be the first to comment!
            </Text>
          ) : (
            <View style={styles.commentsList}>
              {comments.map((comment, index) => {
                const isOwner =
                  userId &&
                  comment.userId?._id?.toString() === userId.toString();
                return (
                  <TouchableOpacity
                    key={comment._id || `comment-${index}`}
                    style={styles.commentItem}
                    onLongPress={() => onCommentLongPress(comment)}
                    delayLongPress={400}
                    activeOpacity={0.8}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        if (comment.userId?._id) {
                          if (userId === comment.userId._id) {
                            navigation.navigate('Profile');
                          } else {
                            navigation.navigate('UserProfile', {
                              userId: comment.userId._id,
                            });
                          }
                        }
                      }}
                    >
                      <Text style={styles.commentAuthor}>
                        {comment.userId?.firstName || ''}{' '}
                        {comment.userId?.lastName || ''}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.commentContent}>
                      {comment.content}
                    </Text>
                    <Text style={styles.commentDate}>
                      {new Date(comment.createdAt).toLocaleDateString(
                        'en-UK',
                        {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Comment MoreMenu */}
      {menuComment && (
        <MoreMenu
          visible={commentMenuVisible}
          onClose={() => {
            setCommentMenuVisible(false);
            setMenuComment(null);
          }}
          options={[
            {
              label: 'Delete Comment',
              destructive: true,
              icon: <Feather name="trash-2" size={18} color="#d32f2f" />,
              onPress: handleDeleteComment,
            },
          ]}
        />
      )}
      {commentDeleteError && (
        <View style={{ padding: 8, backgroundColor: '#ffecec' }}>
          <Text style={{ color: '#d32f2f' }}>
            Error deleting comment: {commentDeleteError}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  headerRight: {
    width: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: '#eee',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    resizeMode: 'cover',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#222',
    marginBottom: 2,
  },
  postDate: {
    fontSize: 11,
    color: '#888',
  },
  tripInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tripTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
  },
  tripMeta: {
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  destination: {
    fontSize: 16,
    color: '#666',
    marginLeft: 6,
  },
  duration: {
    fontSize: 16,
    color: '#666',
    marginLeft: 6,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  budget: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: '500',
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 15,
    color: '#222',
  },
  postsSection: {
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 16,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginHorizontal: -4,
  },
  postBox: {
    width: '31.33%',
    aspectRatio: 1,
    margin: '1%',
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  postBoxContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'flex-start',
  },
  postImageContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  postBoxImage: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  imageCountBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  postBoxTextWithImage: {
    fontSize: 11,
    color: '#333',
    lineHeight: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  postBoxText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 16,
    flex: 1,
  },
  postBoxFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  postBoxDate: {
    fontSize: 10,
    color: '#666',
  },
  postBoxLikes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postBoxLikesText: {
    fontSize: 10,
    color: '#e74c3c',
    marginLeft: 2,
  },
  commentsSection: {
    padding: 16,
    backgroundColor: '#fff',
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  commentInput: {
    flex: 1,
    borderWidth: 0,
    fontSize: 14,
    maxHeight: 100,
    paddingRight: 10,
    color: '#333',
  },
  addCommentButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCommentButtonDisabled: {
    backgroundColor: '#ccc',
  },
  commentsList: {
    marginTop: 10,
  },
  commentItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  commentAuthor: {
    fontWeight: 'bold',
    color: '#1877f2',
    fontSize: 14,
    marginBottom: 4,
  },
  commentContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
    marginBottom: 6,
  },
  commentDate: {
    fontSize: 12,
    color: '#666',
  },
  noComments: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default TripDetailScreen;
