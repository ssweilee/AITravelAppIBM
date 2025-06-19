import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUserById } from '../utils/ProfileInfo';
import UserPostList from '../components/UserPostList';
import FollowButton from '../components/FollowButton';
import { API_BASE_URL } from '../config';

const UserProfileScreen = ({ route, navigation }) => {
  const { userId } = route.params;

  const [user, setUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  const decodeUserIdFromToken = async () => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
      } catch (err) {
        console.error('Token decode error:', err);
      }
    }
    return null;
  };

  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      const decodedUserId = await decodeUserIdFromToken();
      setCurrentUserId(decodedUserId);

      const result = await fetchUserById(userId);
      if (result.success) {
        setUser(result.user);
      } else {
        console.error('Failed to fetch user:', result.error);
      }
      setLoading(false);
    };

    loadProfileData();
  }, [userId]);

  // 🧠 SET UP CHAT BUTTON
  useLayoutEffect(() => {
    if (user && currentUserId && currentUserId !== user._id) {
      navigation.setOptions({
        headerRight: () => (
          <Button
            title="Chat"
            onPress={async () => {
              try {
                const token = await AsyncStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/api/chats`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                  },
                  body: JSON.stringify({ otherUserId: user._id })
                });

                const data = await response.json();
                if (response.ok && data.chat) {
                  navigation.navigate('Chat', {
                    chatId: data.chat._id,
                    otherUserName: `${user.firstName} ${user.lastName}`
                  });
                } else {
                  console.error('Failed to create chat:', data);
                }
              } catch (err) {
                console.error('Error creating chat:', err);
              }
            }}
          />
        ),
      });
    }
  }, [navigation, user, currentUserId]);

  if (loading || !user || !currentUserId) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.name}>
        {user.firstName} {user.lastName}
      </Text>
      <Text style={styles.info}>
        Followers: {user?.followers?.length || 0} | Trips: {user?.trips?.length || 0} | Reviews: {user?.reviews?.length || 0}
      </Text>

      {currentUserId && currentUserId !== user._id && (
        <FollowButton
          userId={user._id}
          isFollowingInitially={user.followers?.some(f => f._id?.toString() === currentUserId)}
          onFollowToggle={() => {
            setUser((prev) => {
              const alreadyFollowing = prev.followers?.some(f => f._id?.toString() === currentUserId);
              const updatedFollowers = alreadyFollowing
                ? prev.followers.filter(f => f._id?.toString() !== currentUserId)
                : [...prev.followers, { _id: currentUserId }];
              return { ...prev, followers: updatedFollowers };
            });
          }}
        />
      )}
      <UserPostList userId={user._id} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  info: { fontSize: 18, marginBottom: 5 },
});

export default UserProfileScreen;