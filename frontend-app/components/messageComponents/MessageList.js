import React, { useEffect, useState } from "react";
import { View, FlatList, Text, StyleSheet, TouchableOpacity, RefreshControl, Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../../config";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import socket from "../../utils/socket";
import moment from "moment";
import { Ionicons } from '@expo/vector-icons';

const MessageList = ({ searchQuery }) => {
  const [chats, setChats] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  // Fetch all chats once
  const fetchChats = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUserId(payload.userId);

      const response = await fetch(`${API_BASE_URL}/api/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) {
        setChats(data);
      } else {
        console.error("Failed to fetch chats", data);
      }
    } catch (err) {
      console.error("Error fetching chats:", err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchChats();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchChats();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchChats();
    }, [])
  );

  // Listen for real-time messages
  useEffect(() => {
    const handleNewMessage = (message) => {

      console.log("Incoming message via socket:", message);
      setChats((prevChats) => {
        const chatIndex = prevChats.findIndex(c => c._id === message.chatId);
        if (chatIndex === -1) return prevChats;

        const updatedChats = [...prevChats];
        const chatToUpdate = { ...updatedChats[chatIndex] };
        chatToUpdate.lastMessage = message;
        chatToUpdate.updatedAt = message.createdAt; // ✅ REAL server time

        updatedChats.splice(chatIndex, 1);
        return [chatToUpdate, ...updatedChats];
      });
    };

    socket.on('receiveMessage', handleNewMessage);

    return () => {
      socket.off('receiveMessage', handleNewMessage);
    };
  }, []);

  const filteredChats = chats.filter((chat) =>
    chat.members.some((member) =>
      `${member.firstName} ${member.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    )
  );

  const handleChatPress = (chat) => {
    const otherUser = chat.members.find((m) => m._id !== currentUserId);
    navigation.navigate("Chat", {
      chatId: chat._id,
      otherUserName: chat.isGroup && chat.chatName
        ? chat.chatName
        : `${otherUser.firstName} ${otherUser.lastName}`,
      isGroup: chat.isGroup, // Pass isGroup to ChatScreen
    });
  };

  const renderChatItem = ({ item }) => {
    const otherUser = item.members.find((m) => m._id !== currentUserId);
    if (!otherUser) return null;

    const lastMessageTime = item.lastMessage?.createdAt
      ? moment(item.lastMessage.createdAt).fromNow()
      : null;

    const isUnread = item.lastMessage &&
      item.lastMessage.senderId._id !== currentUserId &&
      !item.lastMessage.readBy.includes(currentUserId);

    // Avatar logic: show profilePicture if available, else initials, else icon
    const renderAvatar = (user, isGroup) => {
      if (isGroup) {
        // Show group icon for group chats
        return (
          <View style={styles.avatarCircle}>
            <Ionicons name="people" size={24} color="#fff" />
          </View>
        );
      }
      if (user.profilePicture) {
        return (
          <Image source={{ uri: user.profilePicture }} style={styles.avatarImg} />
        );
      }
      const initials = (user.firstName?.[0] || '') + (user.lastName?.[0] || '');
      return (
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>{initials || <Ionicons name="person" size={20} color="#fff" />}</Text>
        </View>
      );
    };

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.rowTop}>
          {renderAvatar(otherUser, item.isGroup)}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.chatName} numberOfLines={1}>
              {item.isGroup && item.chatName
                ? item.chatName
                : `${otherUser.firstName} ${otherUser.lastName}`}
            </Text>
            <Text numberOfLines={1} style={[ styles.lastMessage, isUnread && styles.unreadMessage ]}>
              {item.lastMessage?.text || "No messages yet"}
            </Text>
          </View>
          <View style={styles.rightIcons}>
            {isUnread && <View style={styles.unreadDot} />}
            <Text style={styles.timestamp}>{lastMessageTime}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={filteredChats}
      keyExtractor={(item) => item._id}
      renderItem={renderChatItem}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#007AFF"
        />
      }
      ListEmptyComponent={
        <Text style={{ textAlign: "center", marginTop: 20 }}>
          No chats found.
        </Text>
      }
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  chatItem: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  messageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  chatName: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 5,
  },
  timestamp: {
    fontSize: 11,
    color: "#888",
    alignSelf: "flex-end",
  },
  lastMessage: {
    color: "#555",
    flex: 1,
    marginRight: 10,
  },
  timestampWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#007AFF",
    marginLeft: 6,
  },
  unreadMessage: {
    fontWeight: "bold",
    color: "#000",
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eee',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#bbb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  rightIcons: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 44,
    marginLeft: 8,
  },
});

export default MessageList;