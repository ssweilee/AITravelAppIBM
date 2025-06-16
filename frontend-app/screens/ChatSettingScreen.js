import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useNavigation, useRoute, CommonActions } from "@react-navigation/native";
import { API_BASE_URL } from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ChatInfo from "../components/messageComponents/ChatInfo";

function ChatSettingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { chatId, chatName } = route.params;
  const [ chat, setChat ] = useState(null);
  const [ currentUserId, setCurrentUserId ] = useState(null);
  const [ loading, setLoading ] = useState(true);

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

  const handleMute = () => Alert.alert("Mute", "Mute notifications feature coming soon.");
  
  const handleLeaveGroup = async (chatId) => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/leave`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              });

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.message || 'Failed to leave group');
              }

              // ✅ RESET THE NAVIGATION STACK TO Messages screen
              navigation.dispatch(
                CommonActions.reset({
                  index: 1,
                  routes: [
                    { name: 'Main', params: { fromMessages: true } },
                    { name: 'Messages', params: { fromSettings: true } },
                  ],
                })
              );
            } catch (err) {
              console.error('Error leaving group:', err);
              Alert.alert('Error', err.message || 'Failed to leave group');
            }
          },
        },
      ]
    );
  };

  const handleRestrict = () => Alert.alert("Restrict", "Restrict user feature coming soon.");

  const handleMembers = () => {
    if (chat) {
      navigation.navigate("Members", {
        chatId: chat._id,
        chatName: chat.chatName,
        members: chat.members, // pass members directly
        currentUserId,
      });
    }
  };

  const handleEdit = () => Alert.alert("Edit", "Edit Name and Photo.");

  const handleProfile = () => {
    if (!chat || !chat.members || chat.members.length !== 2) return;

    const otherUser = chat.members.find((m) => m._id !== currentUserId);
    if (otherUser) {
      navigation.navigate("UserProfile", { userId: otherUser._id });
    } else {
      Alert.alert("Error", "Could not find user profile.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const isGroup = chat?.isGroup;

  return (
    <View style={styles.container}>
      <ChatInfo chatName={chat.chatName}/>
      { isGroup ? (
        <>
          <TouchableOpacity style={styles.button} onPress={handleMembers}>
            <Text style={styles.buttonText}>👥  Members</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleEdit}>
            <Text style={styles.buttonText}>🛠️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleMute}>
            <Text style={styles.buttonText}>🔕  Mute</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.leaveButton]} onPress={() => handleLeaveGroup(chatId)}>
            <Text style={[styles.buttonText, { color: 'red' }]}>🚪 Leave</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TouchableOpacity style={styles.button} onPress={handleProfile}>
            <Text style={styles.buttonText}>👤  Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleMute}>
            <Text style={styles.buttonText}>🔕  Mute</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.leaveButton]} onPress={handleRestrict}>
            <Text style={[styles.buttonText, { color: 'red' }]}>🚫 Restrict</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
    flex: 1
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#007AFF",
    textAlign: "center"
  },
  button: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    marginBottom: 15
  },
  leaveButton: {
    backgroundColor: "#ffeaea",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600"
  }
});

export default ChatSettingScreen;