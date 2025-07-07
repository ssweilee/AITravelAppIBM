import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, Modal, TouchableOpacity, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const PostDetailScreen = ({ route }) => {
  const { post } = route.params;
  const navigation = useNavigation();
  const [userId, setUserId] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserId(payload.userId);
    })();
  }, []);

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

  const openImageModal = (index) => {
    setCurrentImageIndex(index);
    setImageModalVisible(true);
  };

  const closeImageModal = () => {
    setImageModalVisible(false);
  };

  const navigateImage = (direction) => {
    if (direction === 'next' && currentImageIndex < post.images.length - 1) {
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
      {/* User info row - EXACT SAME AS POSTCARD */}
      <View style={styles.userRow}>
        <View style={styles.avatarWrapper}>
          <Image
            source={require('../assets/icon.png')} // Dummy profile photo - SAME AS POSTCARD
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

      <View style={styles.postBox}>
        <Text style={styles.content}>{post.content}</Text>
        
        {/* Render post images */}
        {post.images && post.images.length > 0 && (
          <ScrollView horizontal style={styles.imagesContainer} showsHorizontalScrollIndicator={false}>
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
              <Text style={styles.commentAuthor}>{item.userId?.firstName || 'User'}:</Text>
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

      {/* Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseArea} onPress={closeImageModal} />
          
          <View style={styles.modalContent}>
            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={closeImageModal}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            
            {/* Image counter */}
            {post.images && post.images.length > 1 && (
              <View style={styles.imageCounter}>
                <Text style={styles.imageCounterText}>
                  {currentImageIndex + 1} / {post.images.length}
                </Text>
              </View>
            )}
            
            {/* Current image */}
            {post.images && post.images[currentImageIndex] && (
              <Image
                source={{ uri: getImageUrl(post.images[currentImageIndex].url) }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
            
            {/* Navigation arrows */}
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
                    <Ionicons name="chevron-forward" size={30} color="#fff" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  // EXACT SAME STYLING AS POSTCARD
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatarWrapper: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', marginRight: 10, backgroundColor: '#eee' },
  avatar: { width: 38, height: 38, borderRadius: 19, resizeMode: 'cover' },
  username: { fontWeight: 'bold', fontSize: 15, color: '#222' },
  // END POSTCARD STYLING
  postBox: { marginBottom: 20 },
  content: { fontSize: 16, marginBottom: 8 },
  imagesContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  postImage: {
    width: 250,
    height: 250,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
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
  // Image Modal Styles
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
});

export default PostDetailScreen;