import React, { useEffect, useState } from "react";
import { View, FlatList, Text, StyleSheet, TouchableOpacity, RefreshControl } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../../config";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import socket from "../../utils/socket";
import moment from "moment";

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
    });
  };

  const renderChatItem = ({ item }) => {
    const otherUser = item.members.find((m) => m._id !== currentUserId);
    if (!otherUser) return null;

    const lastMessageTime = item.lastMessage?.createdAt
      ? moment(item.lastMessage.createdAt).fromNow()
      : null;

    const isUnread = item.lastMessage &&
      item.lastMessage.senderId._id !== currentUserId && // updated after .populate()
      !item.lastMessage.readBy.includes(currentUserId);

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatPress(item)}
      >
        <Text style={styles.chatName}>
          {item.isGroup && item.chatName
            ? item.chatName
            : `${otherUser.firstName} ${otherUser.lastName}`}
        </Text>

        <View style={styles.messageRow}>
          <Text numberOfLines={1} style={[ styles.lastMessage, isUnread && styles.unreadMessage ]}>
            {item.lastMessage?.text || "No messages yet"}
          </Text>
          <View style={styles.timestampWrapper}>
            {lastMessageTime && (
              <Text style={styles.timestamp}>{lastMessageTime}</Text>
            )}
            {isUnread && <View style={styles.unreadDot} />}
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
});

export default MessageList;