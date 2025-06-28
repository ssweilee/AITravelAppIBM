import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_BASE_URL } from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ChatInfo from "../components/messageComponents/ChatInfo";

function ChatSettingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { chatId, chatName } = route.params;
  const [chat, setChat] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChatInfo = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const payload = JSON.parse(atob(token.split(".")[1]));
        const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          setChat(data);
          setCurrentUserId(payload.userId);
        } else {
          console.error("Failed to fetch chat info:", data);
        }
      } catch (err) {
        console.error("Error fetching chat info:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChatInfo();
  }, [chatId]);

  if (loading || !chat) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1877f2" />
      </View>
    );
  }

  const isGroup = chat.isGroup;
  const isAdmin = chat.admins?.includes(currentUserId);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerRow, { backgroundColor: '#1877f2', borderBottomColor: '#1877f2' }]}> 
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#fff' }]}>Group Setting</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Chat Image & Name */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          <Ionicons name="people" size={40} color="#fff" />
        </View>
        <Text style={styles.chatName}>{chat.chatName}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Members', { chatId: chat._id, chatName: chat.chatName, members: chat.members, currentUserId })}>
          <Ionicons name="people-outline" size={22} color="#1877f2" style={styles.actionIcon} />
          <Text style={styles.actionText}>View Members</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('UserProfile', { userId: chat.members?.find(m => m._id !== currentUserId)?._id })}>
          <Ionicons name="person-circle-outline" size={22} color="#1877f2" style={styles.actionIcon} />
          <Text style={styles.actionText}>View My Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => alert('Mute feature coming soon!')}>
          <Ionicons name="notifications-off-outline" size={22} color="#1877f2" style={styles.actionIcon} />
          <Text style={styles.actionText}>Mute</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.leaveButton]} onPress={() => alert('Leave group feature coming soon!')}>
          <Ionicons name="exit-outline" size={22} color="#fa3e3e" style={styles.actionIcon} />
          <Text style={[styles.actionText, { color: '#fa3e3e' }]}>Leave Group</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 18,
    paddingHorizontal: 18,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 1,
  },
  headerIcon: {
    marginRight: 12,
    padding: 4,
    borderRadius: 50,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    letterSpacing: 0.2,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 18,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1877f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  chatName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
  },
  actionsSection: {
    marginTop: 18,
    paddingHorizontal: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  actionIcon: {
    marginRight: 14,
  },
  actionText: {
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
  },
  leaveButton: {
    backgroundColor: '#fff0f0',
    borderWidth: 1,
    borderColor: '#fa3e3e',
  },
});

export default ChatSettingScreen;