import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import moment from 'moment';

const MessageItem = ({ message, currentUserId }) => {
  const [showTimestamp, setShowTimestamp] = useState(false);
 const isCurrentUser =
  (message.senderId && message.senderId._id === currentUserId) ||
  message.senderId === currentUserId;

  const handlePress = () => {
    setShowTimestamp((prev) => !prev);
  };

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