import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Button,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Modal,
  Dimensions,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../config';
import MoreMenu from '../components/MoreMenu'; // adjust path if needed
import { getAvatarUrl } from '../utils/getAvatarUrl';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

const PostDetailScreen = ({ route }) => {
  const { post: initialPost } = route.params;
  const navigation = useNavigation();

  const [post, setPost] = useState(initialPost);
  const [userId, setUserId] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [saved, setSaved] = useState(false);

  // Comment menu state
  const [commentMenuVisible, setCommentMenuVisible] = useState(false);
  const [menuComment, setMenuComment] = useState(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const [commentDeleteError, setCommentDeleteError] = useState(null);
  const [taggedUsers, setTaggedUsers] = useState([]); // Selected users to tag

  useLayoutEffect(() => {
      navigation.setOptions({
        headerShown: true,
        headerStyle: {
          backgroundColor: '#00c7be',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
          shadowColor: 'transparent',
        },
        headerTintColor: '#fff',
        headerShadowVisible: false,
        headerTitle: 'Post Details',
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: 'bold',
        },
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        ),
        headerRight: () => <View style={{ width: 24, marginRight: 16 }} />,
      });
    }, [navigation]);
  
    useEffect(() => {
      StatusBar.setBarStyle('light-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#00c7be');
        //StatusBar.setTranslucent(false);
      }
    }, []);
  
  // Initialise user and post metadata
  useEffect(() => {
    const initializeData = async () => {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const payload = parseJwt(token);
        if (payload?.userId) {
          setUserId(payload.userId);
          setLiked(initialPost.likes?.includes(payload.userId) || false);
          setLikesCount(initialPost.likes?.length || 0);
          setSaved(initialPost.savedBy?.includes(payload.userId) || false);
        }
      }
    };

    initializeData();
    fetchComments();
    fetchPostDetails();
  }, []);

  // Sync like/save when post updates
  useEffect(() => {
    if (userId) {
      setLiked(post.likes?.includes(userId) || false);
      setLikesCount(post.likes?.length || 0);
      setSaved(post.savedBy?.includes(userId) || false);
    }
  }, [post, userId]);

  useEffect(() => {
    setTaggedUsers(post.taggedUsers || []);
  }, [post.taggedUsers]);

  const fetchPostDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/posts/${post._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
      }
    } catch (error) {
      console.error('Error fetching post details:', error);
    }
  };

  const fetchComments = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/posts/${post._id}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        // Normalise shape if needed
        const normalized = data.map((c) => ({
          ...c,
          content: c.content ?? c.text ?? '',
        }));
        // sort descending
        normalized.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setComments(normalized);
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
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/posts/${post._id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: newComment.trim() }),
      });
      const payload = await res.json();
      if (res.ok) {
        setNewComment('');
        // Optimistically prepend
        const newC = {
          ...payload,
          content: payload.content ?? payload.text ?? '',
        };
        setComments((prev) => [newC, ...prev]);
      } else {
        console.error('Comment failed:', payload);
        Alert.alert('Error', payload.message || 'Failed to add comment');
      }
    } catch (err) {
      console.error('Network error posting comment:', err);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLike = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/interactions/post/${post._id}/like`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (res.ok) {
        setLiked(result.liked);
        setLikesCount(result.count);
        // Optionally update post locally
        setPost((p) => {
          const updated = { ...p };
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
      const res = await fetch(`${API_BASE_URL}/api/interactions/post/${post._id}/save`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const { saved: nowSaved } = await res.json();
      setSaved(nowSaved);
      setPost((p) => {
        const updated = { ...p };
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

  const openImageModal = (index) => {
    setCurrentImageIndex(index);
    setImageModalVisible(true);
  };

  const closeImageModal = () => setImageModalVisible(false);

  const navigateImage = (direction) => {
    if (direction === 'next' && currentImageIndex < (post.images?.length || 0) - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    } else if (direction === 'prev' && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const getImageUrl = (imgUrl) => {
    if (imgUrl && imgUrl.includes('/uploads/')) {
      const uploadsPath = imgUrl.substring(imgUrl.indexOf('/uploads/'));
      return `${API_BASE_URL}${uploadsPath}`;
    }
    return imgUrl;
  };

  // Comment menu handlers
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
                `${API_BASE_URL}/api/posts/${post._id}/comment/${menuComment._id}`,
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

  console.log('taggedUsers:', post.taggedUsers);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'android' ? 25 : 80}
      >
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
          <View style={styles.userInfo}>
            <TouchableOpacity
              onPress={() => {
                if (post.userId?._id) {
                  if (userId === post.userId._id) {
                    navigation.navigate('Profile');
                  } else {
                    navigation.navigate('UserProfile', { userId: post.userId._id });
                  }
                }
              }}
            >
              <Text style={styles.username}>
                {(post.userId?.firstName || '') +
                  (post.userId?.lastName ? ' ' + post.userId.lastName : '') ||
                  'User'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.postDate}>
              {new Date(post.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.postBox}>
            <Text style={styles.content}>{post.content}</Text>

            {taggedUsers.length > 0 && (
  <View style={styles.taggedPeopleContainer}>
  {taggedUsers.map((user, i) => (
    <Text
      key={user._id}
      style={styles.taggedPersonName}
      onPress={() => {
        console.log('JClicked userId:', user._id);
        if (userId === user._id) {
          navigation.navigate('Profile');
        } else {
          navigation.navigate('UserProfile', { userId: user._id });
        }
      }}
    >
      @{user.firstName} {user.lastName}
      {i !== taggedUsers.length - 1 && ', '}
    </Text>
  ))}
</View>
)}
            {post.images && post.images.length > 0 && (
              <ScrollView
                horizontal
                style={styles.imagesContainer}
                showsHorizontalScrollIndicator={false}
              >
                {post.images.map((img, index) => {
                  const imageUrl = getImageUrl(img.url);
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => openImageModal(index)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.postImage}
                        onError={() => console.log(`Failed to load image: ${imageUrl}`)}
                        onLoad={() => console.log(`Successfully loaded: ${imageUrl}`)}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <Text style={styles.timestamp}>
              {new Date(post.createdAt).toLocaleString()}
            </Text>
          </View>

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
                color="#222"
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

          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>

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
                  submitting && styles.addCommentButtonDisabled,
                ]}
                onPress={submitComment}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator style={styles.loadingIndicator} />
            ) : comments.length === 0 ? (
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
                        {new Date(comment.createdAt).toLocaleDateString('en-UK', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Image Lightbox Modal */}
        <Modal
          visible={imageModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeImageModal}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalCloseArea}
              onPress={closeImageModal}
            />

            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeImageModal}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>

              {post.images && post.images.length > 1 && (
                <View style={styles.imageCounter}>
                  <Text style={styles.imageCounterText}>
                    {currentImageIndex + 1} / {post.images.length}
                  </Text>
                </View>
              )}

              {post.images && post.images[currentImageIndex] && (
                <Image
                  source={{
                    uri: getImageUrl(post.images[currentImageIndex].url),
                  }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              )}

              {post.images && post.images.length > 1 && (
                <>
                  {currentImageIndex > 0 && (
                    <TouchableOpacity
                      style={[styles.navButton, styles.prevButton]}
                      onPress={() => navigateImage('prev')}
                    >
                      <Ionicons name="chevron-back" size={30} color="#fff" />
                    </TouchableOpacity>
                  )}
                  {currentImageIndex < post.images.length - 1 && (
                    <TouchableOpacity
                      style={[styles.navButton, styles.nextButton]}
                      onPress={() => navigateImage('next')}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={30}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </Modal>

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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginTop: 0,
    marginBottom: 0,
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
  postBox: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  content: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  imagesContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  postImage: {
    width: 250,
    height: 250,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
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
  commentsSection: {
    padding: 16,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 16,
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
    backgroundColor: '#00c7be',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCommentButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loadingIndicator: {
    marginTop: 20,
  },
  noComments: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: -50,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  imageCounter: {
    position: 'absolute',
    top: -50,
    left: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -25 }],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
  taggedPersonName: {
  fontWeight: 'bold',
  color: '#007AFF',
  fontSize: 16,
},
taggedPeopleContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
},
});

export default PostDetailScreen;
