import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, KeyboardAvoidingView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_BASE_URL } from '../config';
import MessageItem from '../components/messageComponents/MessageItem';
import MessageInput from '../components/messageComponents/MessageInput';
import socket from '../utils/socket';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { chatId, otherUserName } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('Chat Settings', {
              chatId,
              chatName: otherUserName,
              isGroup: route.params?.isGroup,
            })
          }
        >
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>
            {otherUserName}
          </Text>
        </TouchableOpacity>
      ),
      headerStyle: {
        backgroundColor: '#00c7be',
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 0,
      },
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

  // ✅ Join socket room
  useEffect(() => {
    if (chatId) {
      socket.emit('joinChat', chatId);
    }
  }, [chatId]);

  // ✅ Fetch message history once
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/messages/${chatId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          const uniqueMessages = [...new Map(data.map(msg => [msg._id, msg])).values()];
          setMessages(uniqueMessages);
        } else {
          console.error('Failed to fetch messages', data);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [chatId]);

  // ✅ Real-time receive via socket
  useEffect(() => {
    const handleIncoming = (message) => {
      if (message.chatId === chatId) {
        setMessages((prev) => {
          // Remove optimistic message if it matches sender, text, and is recent
          let filtered = prev.filter((m) => {
            if (
              m._id && m._id.startsWith('local-') &&
              m.senderId === message.senderId &&
              m.text === message.text &&
              m.senderId === currentUserId &&
              Math.abs(new Date(m.createdAt) - new Date(message.createdAt)) < 10000
            ) {
              return false;
            }
            return true;
          });
          // Only add if not already present (by real _id)
          const exists = filtered.some((m) => m._id === message._id);
          return exists ? filtered : [...filtered, message];
        });
      }
    };
    socket.on('receiveMessage', handleIncoming);
    return () => {
      socket.off('receiveMessage', handleIncoming);
    };
  }, [chatId, currentUserId]);

  // ✅ Socket-only send (no optimistic UI)
  const handleSend = async () => {
    if (!text.trim()) return;
    try {
      const token = await AsyncStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      const senderId = payload.userId;
      // Do NOT add optimistic message to state
      socket.emit('sendMessage', {
        chatId,
        message: {
          senderId,
          text,
        },
      });
      setText('');
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.top + 64) : 84}
    >
      <View style={{ flex: 1, flexDirection: 'column' }}>
        <KeyboardAwareFlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <MessageItem message={item} currentUserId={currentUserId} isGroup={route.params?.isGroup} />
          )}
          contentContainerStyle={{ padding: 10, paddingBottom: 16, flexGrow: 1 }}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          extraHeight={0}
          enableOnAndroid={true}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          keyboardOpeningTime={0}
        />
        <View style={{ backgroundColor: '#fff', paddingBottom: insets.bottom }}>
          <MessageInput text={text} setText={setText} onSend={handleSend} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ChatScreen;