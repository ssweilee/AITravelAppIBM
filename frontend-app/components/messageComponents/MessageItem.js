import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import moment from 'moment';
import ShareItineraryCard from '../ItineraryComponents/ShareItineraryCard.js'
import PostCard from '../PostCard';
import ShareTripCard from '../ShareTripCard.js'
import SharePostCard from '../SharePostCard.js';  
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
          
          {/* Render shared content inside bubble with height constraints */}
          {/* Render shared itinerary */}
          {message.sharedItinerary && (
            <ShareItineraryCard itinerary={message.sharedItinerary} />
          )}

        {message.sharedItinerary && (
          <ShareItineraryCard itinerary={message.sharedItinerary} />
        )}

          {/* Render shared post */}
          {message.sharedPost && (
            <View style={styles.sharedContentContainer}>
              <View style={styles.borderlessWrapper}>
                <SharePostCard post={message.sharedPost} />
              </View>
            </View>
          )}

          {/* Render shared trip */}
          {message.sharedTrip && (
            <View style={styles.sharedContentContainer}>
              <ShareTripCard trip={message.sharedTrip} />
            </View>
          )}
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
    overflow: 'hidden', // This will clip any content that overflows
  },
  bubbleCurrentUser: {
    backgroundColor: '#00c7be',
    borderTopRightRadius: 6,
  },
  bubbleOtherUser: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 6,
    //borderWidth: 1,
    //borderColor: 'rgba(0,0,0,0.08)', // Mostly transparent black border
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
  sharedContentContainer: {
    width: '100%',
    overflow: 'hidden',
    marginTop: 2,
    marginBottom: 2,
  },
  borderlessWrapper: {
    marginLeft: -3,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    overflow: 'hidden',
  },
});

export default MessageItem;