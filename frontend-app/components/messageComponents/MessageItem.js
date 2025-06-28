// components/messageComponents/MessageItem.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import moment from 'moment';
// we import PostCard from two levels up because MessageItem lives in "components/messageComponents"
import PostCard from '../PostCard';

/**
 * Renders either a plain text message or, for share-messages,
 * the full PostCard preview inside the chat.
 */
const MessageItem = ({ message, currentUserId, navigation }) => {
  const [showTimestamp, setShowTimestamp] = useState(false);

  const isCurrentUser =
    (message.senderId && message.senderId._id === currentUserId) ||
    message.senderId === currentUserId;

  const handlePress = () => {
    setShowTimestamp((prev) => !prev);
  };

  // If this is a share-type message, render the PostCard instead of plain text
  if (message.type === 'share' && message.sharedContent?.itemId) {
    return (
      <View
        style={[
          styles.messageWrapper,
          isCurrentUser ? styles.currentUser : styles.otherUser,
        ]}
      >
        <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
          <View style={styles.bubble}>
            <Text style={styles.senderName}>
              {message.senderId?.firstName
                ? `${message.senderId.firstName} ${message.senderId.lastName ?? ''}`
                : 'User'}
            </Text>
            {/* Render the shared post preview */}
            <PostCard
              post={message.sharedContent.itemId}
              onPress={() => navigation.navigate('PostDetail', { post: message.sharedContent.itemId })}
            />
          </View>
        </TouchableOpacity>

        {showTimestamp && (
          <Text style={styles.timestamp}>
            {moment(message.createdAt).format('hh:mm A')}
          </Text>
        )}
      </View>
    );
  }

  // Otherwise, render a normal text message bubble
  return (
    <View
      style={[
        styles.messageWrapper,
        isCurrentUser ? styles.currentUser : styles.otherUser,
      ]}
    >
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        <View style={styles.bubble}>
          <Text style={styles.senderName}>
            {message.senderId?.firstName
              ? `${message.senderId.firstName} ${message.senderId.lastName ?? ''}`
              : 'User'}
          </Text>
          <Text>{message.text}</Text>
        </View>
      </TouchableOpacity>

      {showTimestamp && (
        <Text style={styles.timestamp}>
          {moment(message.createdAt).format('hh:mm A')}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  messageWrapper: {
    marginBottom: 8,
    paddingHorizontal: 10,
    alignItems: 'flex-start',
  },
  currentUser: {
    alignItems: 'flex-end',
  },
  otherUser: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#e1e1e1',
  },
  senderName: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  timestamp: {
    marginTop: 2,
    fontSize: 11,
    color: '#666',
  },
});

export default MessageItem;
