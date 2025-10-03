// components/CommentItem.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MoreMenu from './MoreMenu'; // adjust if in different folder
import { API_BASE_URL } from '../config';

const CommentItem = ({
  comment,
  parentType, // 'post' or 'trip'
  parentId,
  currentUserId,
  onDeleted, // callback (commentId) => void
  style,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const isOwner = currentUserId && comment.userId?._id?.toString() === currentUserId?.toString();

  const handleDelete = async () => {
    Alert.alert(
      'Delete comment',
      'Are you sure you want to delete this comment? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) throw new Error('No auth token');

              const endpoint =
                parentType === 'post'
                  ? `${API_BASE_URL}/api/posts/${parentId}/comment/${comment._id}`
                  : `${API_BASE_URL}/api/trips/${parentId}/comment/${comment._id}`;

              const res = await fetch(endpoint, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (res.ok) {
                onDeleted && onDeleted(comment._id);
              } else {
                const err = await res.json();
                Alert.alert('Failed to delete', err.message || 'Unknown error');
              }
            } catch (err) {
              console.error('delete comment error:', err);
              Alert.alert('Error', 'Network error. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <TouchableOpacity
        onLongPress={() => {
          if (isOwner) setMenuVisible(true);
        }}
        activeOpacity={0.8}
        style={[styles.container, style]}
      >
        <View style={styles.contentRow}>
          <Text style={styles.name}>
            {comment.userId?.firstName || ''}{' '}
            {comment.userId?.lastName ? comment.userId.lastName : ''}:
          </Text>
          <Text style={styles.text}>{comment.content || comment.content === '' ? comment.content : comment.text}</Text>
        </View>
      </TouchableOpacity>

      <MoreMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        options={[
          {
            label: 'Delete Comment',
            destructive: true,
            iconName: 'trash-2',
            onPress: handleDelete,
          },
        ]}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    backgroundColor: '#f8f8f8',
  },
  contentRow: {
    flexDirection: 'row',
    flex: 1,
    flexWrap: 'wrap',
    gap: 4,
  },
  name: {
    fontWeight: '600',
    color: '#1877f2',
    marginRight: 4,
  },
  text: {
    flex: 1,
    color: '#222',
  },
});

export default CommentItem;

