import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import moment from 'moment';
import { useNavigation } from '@react-navigation/native';

const MessageItem = ({ message, currentUserId, isGroup }) => {
  const navigation = useNavigation();
  const [showTimestamp, setShowTimestamp] = useState(false);
  const isCurrentUser =
    (message.senderId && message.senderId._id === currentUserId) ||
    message.senderId === currentUserId;

  // Only show sender name in group chats, and not for current user's own messages
  const showSenderName = isGroup && !isCurrentUser;

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
      {showSenderName && (
        <TouchableOpacity onPress={() => {
          if (message.senderId?._id && message.senderId._id !== currentUserId) {
            navigation.navigate('UserProfile', { userId: message.senderId._id });
          }
        }} activeOpacity={0.7}>
          <Text style={styles.senderName}>
            {message.senderId?.firstName
              ? `${message.senderId.firstName} ${message.senderId.lastName ?? ''}`
              : 'User'}
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        <View
          style={[
            styles.bubble,
            isCurrentUser ? styles.bubbleCurrentUser : styles.bubbleOtherUser,
          ]}
        >
          <Text style={[styles.messageText, isCurrentUser && { color: '#fff' }]}>{message.text}</Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.timestamp}>
        {moment(message.createdAt).format('hh:mm A')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  messageWrapper: {
    marginBottom: 14,
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
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginBottom: 2,
  },
  bubbleCurrentUser: {
    backgroundColor: '#1877f2',
    borderTopRightRadius: 6,
  },
  bubbleOtherUser: {
    backgroundColor: '#f0f0f0',
    borderTopLeftRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)', // Mostly transparent black border
  },
  messageText: {
    fontSize: 16,
    color: '#222',
  },
  senderName: {
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#000', // changed from blue to black
    fontSize: 13,
  },
  timestamp: {
    marginTop: 2,
    fontSize: 11,
    color: '#888',
    alignSelf: 'flex-end',
  },
});

export default MessageItem;