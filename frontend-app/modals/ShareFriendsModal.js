// components/ShareFriendsModal.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';
import socket from '../utils/socket';

const ShareFriendsModal = ({ visible, onClose, onShare, selectedItinerary, chatId }) => {
  const [followings, setFollowings] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  useEffect(() => {
    const fetchFollowings = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/users/followings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setFollowings(data || []);
        } else {
          console.error('Failed to fetch followings:', data.message || data);
        }
      } catch (err) {
        console.error('Error fetching followings:', err);
      }
    };
    if (visible) fetchFollowings();
  }, [visible]);


  const toggleUserSelection = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const filtered = followings.filter((u) =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSend = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token || selectedUsers.length === 0 || !selectedItinerary) return;

      for (const recipientId of selectedUsers) {
        // 1. Get or create chat
        const chatRes = await fetch(`${API_BASE_URL}/api/chats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            otherUserId: recipientId 
          }),
        });

        const chatData = await chatRes.json();
        if (!chatRes.ok || !chatData.chat._id || !chatData.chat) {
          console.error(`Failed to get/create chat with ${recipientId}`, chatData);
          continue;
        }

        const chatId = chatData.chat?._id;

        // 2. Send itinerary message
        const msgRes = await fetch(`${API_BASE_URL}/api/messages/${chatId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text: "📍Shared an itinerary with you!",
            sharedItinerary: selectedItinerary._id, // only send the ID
          }),
        });

        const msgData = await msgRes.json();

        if (msgRes.ok) {
          socket.emit("sendMessage", {
            ...msgData,
            chatId: chatId, // ✅ critical for updating the message list
          });
        }
      }
    } catch (err) {
      console.error('Error during share:', err);
    } finally {
      onClose();
    }
  };

  const renderAvatar = (user) => {
    if (user.profilePicture) {
      return <Image source={{ uri: user.profilePicture }} style={styles.avatar} />;
    }
    const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
    return (
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarInitials}>{initials}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.title}>Share Itinerary With...</Text>
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={20} color="#888" style={{ marginLeft: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#aaa"
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item, index) => item._id || index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.userRow}
                onPress={() => toggleUserSelection(item._id)}
              >
                {renderAvatar(item)}
                <Text style={styles.userName}>{item.firstName} {item.lastName}</Text>
                {selectedUsers.includes(item._id) && (
                  <Ionicons name="checkmark-circle" size={20} color="#007bff" />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={{ textAlign: 'center' }}>No friends found.</Text>}
          />
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, width: '85%', maxHeight: '80%', padding: 20 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f1f1', borderRadius: 10, paddingHorizontal: 4, marginBottom: 10 },
  searchInput: { flex: 1, height: 38, fontSize: 16, paddingHorizontal: 8, color: '#222' },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  userName: { flex: 1, marginLeft: 10, fontSize: 16 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#eee' },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#bbb', justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  cancelBtn: { padding: 10 },
  cancelText: { color: '#888' },
  sendBtn: { padding: 10 },
  sendText: { color: '#007bff', fontWeight: 'bold' },
});

export default ShareFriendsModal;