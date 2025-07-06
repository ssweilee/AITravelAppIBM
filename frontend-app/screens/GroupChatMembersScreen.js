import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

function GroupChatMembersScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { chatName, members, currentUserId } = route.params;

  const [orderedMembers, setOrderedMembers] = useState([]);

  useEffect(() => {
    if (members && currentUserId) {
      const sorted = [
        ...members.filter((m) => m._id === currentUserId),
        ...members.filter((m) => m._id !== currentUserId),
      ];
      setOrderedMembers(sorted);
    }
  }, [members, currentUserId]);

  const handlePress = (user) => {
    if (user._id === currentUserId) return;
    navigation.navigate("UserProfile", { userId: user._id });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => handlePress(item)}
      activeOpacity={item._id === currentUserId ? 1 : 0.6}
      style={styles.memberItem}
    >
      <View style={styles.userRow}>
        {item.profilePicture ? (
          <Image
            source={{ uri: item.profilePicture }}
            style={styles.avatar}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>
              {item.firstName?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
        )}
        <Text style={styles.name}>
          {item.firstName} {item.lastName}
          {item._id === currentUserId ? " (You)" : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{chatName || "Group Members"}</Text>
      <FlatList
        data={orderedMembers}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#007AFF",
    textAlign: "center",
  },
  memberItem: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#f4f4f8",
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarPlaceholderText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
  },
});

export default GroupChatMembersScreen;