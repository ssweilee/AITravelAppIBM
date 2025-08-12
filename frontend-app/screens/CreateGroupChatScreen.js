import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput,} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';
import SearchMessages from '../components/messageComponents/SearchMessages';
import { createGroupChat } from '../services/chatService';

const CreateGroupChatScreen = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [matchedUsers, setMatchedUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedUserObjects, setSelectedUserObjects] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    const getUserId = async () => {
      const token = await AsyncStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUserId(payload.userId);
    };
    getUserId();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: '#00c7be',
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 0,
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
        color: '#fff',
      },
      headerLeft: () => (
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ paddingHorizontal: 0, paddingVertical: 6 }}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      ),
      headerBackTitleVisible: false,
      headerBackTitle: '',
    });
  }, [navigation]);

  const [followings, setFollowings] = useState([]);

useEffect(() => {
  const fetchFollowings = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/followings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setFollowings(data);
      } else {
        console.error("Unexpected followings response:", data);
      }
    } catch (err) {
      console.error("Error fetching followings:", err);
    }
  };

  fetchFollowings();
}, []);

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setMatchedUsers([]);
      return;
    }

    const filtered = followings.filter(
      (user) =>
        user.firstName?.toLowerCase().includes(query) ||
        user.lastName?.toLowerCase().includes(query)
    );

    setMatchedUsers(filtered);
  }, [searchQuery, followings]);

  const toggleUserSelection = (user) => {
    setSelectedUsers((prev) => {
      if (prev.includes(user._id)) {
        setSelectedUserObjects((objs) => objs.filter((u) => u._id !== user._id));
        return prev.filter((id) => id !== user._id);
      } else {
        setSelectedUserObjects((objs) => [...objs, user]);
        return [...prev, user._id];
      }
    });
  };

  const handleCreateGroup = async () => {
    if (selectedUsers.length < 2) {
      Alert.alert('Please select at least 2 users to create a group chat.');
      return;
    }

    if (!groupName.trim()) {
      Alert.alert('Please enter a group name.');
      return;
    }

    try {
      const allMembers = [...new Set([...selectedUsers, currentUserId])]; // Add current user
      const data = await createGroupChat(allMembers, groupName.trim());

      if (data && data._id) {
        navigation.dispatch(
          CommonActions.reset({
            index: 2,
            routes: [
              { name: 'Main' },
              { name: 'Messages' },
              {
                name: 'Chat',
                params: {
                  chatId: data._id,
                  otherUserName: data.chatName || 'Group Chat',
                  fromGroupCreation: true, // optional flag if you want to use it
                },
              },
            ],
          })
        );
      } else {
        Alert.alert('Failed to create group', data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Server error', 'Could not create group chat');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={groupName}
        onChangeText={setGroupName}
        placeholder="Enter group chat name"
        style={styles.groupNameInput}
      />

      <SearchMessages
        query={searchQuery}
        onChangeQuery={setSearchQuery}
        placeholder="Search users..."
      />

      {selectedUserObjects.length > 0 && (
        <View style={styles.selectedList}>
          <FlatList
            data={selectedUserObjects}
            keyExtractor={(item) => item._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.selectedUserChip}>
                <Text style={styles.selectedUserText}>
                  {item.firstName} {item.lastName}
                </Text>
                <TouchableOpacity onPress={() => toggleUserSelection(item)}>
                  <Ionicons name="close-circle" size={18} color="red" />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      <FlatList
        data={matchedUsers}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.userItem}
            onPress={() => toggleUserSelection(item)}
          >
            <Text style={styles.userName}>
              {item.firstName} {item.lastName}
            </Text>
            {selectedUsers.includes(item._id) && (
              <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          searchQuery.length > 0 && matchedUsers.length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 20 }}>No users found.</Text>
          ) : null
        }
      />

      <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
        <Text style={styles.createButtonText}>Create Group Chat</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#fff' },
  groupNameInput: {
    borderWidth: 1,
    borderColor: '#00c7be',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderRadius: 20,
  },
  userItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
  },
  createButton: {
    marginTop: 15,
    marginBottom: 30,
    backgroundColor: '#00c7be',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderRadius: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedList: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 10,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e1eaff',
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 8,
    borderRadius: 20,
  },
  selectedUserText: {
    marginRight: 6,
    fontSize: 14,
  },
});

export default CreateGroupChatScreen;