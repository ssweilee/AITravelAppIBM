import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import socket from '../utils/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import MessageItem from '../components/messageComponents/MessageItem';
import MessageInput from '../components/messageComponents/MessageInput';

const ChatScreen = ({ route }) => {
  const { chatId, otherUserName } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const flatListRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/messages/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setMessages(data);
      } else {
        console.log('Failed to fetch messages:', data);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  useEffect(() => {
    const loadCurrentUserId = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const payload = JSON.parse(atob(token.split('.')[1]));
        const senderId = payload.userId;
        setCurrentUserId(senderId);
      } catch (err) {
        console.error('Error loading current user ID:', err);
      }
    };
    loadCurrentUserId();
  }, [])

  useEffect(() => {
    fetchMessages();

    socket.emit('joinChat', chatId);

    socket.on('receiveMessage', (msg) => {
      setMessages(prev => [...prev, msg]);
      scrollToBottom();
    });

    return () => {
      socket.off('receiveMessage');
    };
  }, [chatId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async () => {
    if (!text.trim() || !currentUserId) return;

    const message = { senderId: currentUserId, text };
    socket.emit('sendMessage', { chatId, message });
    setText('');
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <View style={styles.container}>
          <FlatList
            data={messages}
            ref={flatListRef}
            keyExtractor={(item, index) => item._id || index.toString()}
            renderItem={({ item }) => <MessageItem message={item} currentUserId={currentUserId} />}
            contentContainerStyle={styles.messageList}
          />
          <MessageInput text={text} setText={setText} onSend={handleSend} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  messageList: { flexGrow: 1, justifyContent: 'flex-end' },
});

export default ChatScreen;