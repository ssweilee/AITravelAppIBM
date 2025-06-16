import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { View, Text, FlatList, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_BASE_URL } from '../config';
import MessageItem from '../components/messageComponents/MessageItem';
import MessageInput from '../components/messageComponents/MessageInput';
import socket from '../utils/socket';

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { chatId, otherUserName } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const flatListRef = useRef(null);

  // 🧠 Header Setup with Touchable Title
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Chat Settings', { 
          chatId, 
          chatName: otherUserName,
          isGroup: route.params?.isGroup
          })}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#007AFF' }}>{otherUserName}</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, chatId, otherUserName]);

  // ✅ Fetch current user
  useEffect(() => {
    const getUserId = async () => {
      const token = await AsyncStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUserId(payload.userId);
    };
    getUserId();
  }, []);

  // ✅ Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/messages/${chatId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          setMessages(data);
        } else {
          console.error('Failed to fetch messages', data);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [chatId]);

  // ✅ Handle real-time updates
  useEffect(() => {
    const handleIncoming = (message) => {
      if (message.chatId === chatId) {
        setMessages((prev) => [...prev, message]);
      }
    };

    socket.on('receiveMessage', handleIncoming);
    return () => socket.off('receiveMessage', handleIncoming);
  }, [chatId]);

  const handleSend = async () => {
    if (!text.trim()) return;

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/messages/${chatId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      const newMessage = await response.json();
      if (response.ok) {
        setMessages((prev) => [...prev, newMessage]);
        setText('');

        // ✅ emit with proper structure
        socket.emit('sendMessage', {
          chatId,
          message: {
            senderId: newMessage.senderId._id, // important to pass _id, not object
            text: newMessage.text,
          },
        });
      } else {
        console.error('Send message failed:', newMessage);
      }
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={[...messages].reverse()} // Reverse to show latest messages at the bottom
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <MessageItem message={item} currentUserId={currentUserId} />
        )}
        inverted={true} // Invert the list to show latest messages at the bottom
        contentContainerStyle={{ padding: 10 }}
      />
      <MessageInput text={text} setText={setText} onSend={handleSend} />
    </KeyboardAvoidingView>
  );
};

export default ChatScreen;