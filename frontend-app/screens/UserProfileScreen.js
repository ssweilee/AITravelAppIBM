import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUserById } from '../utils/ProfileInfo';
import UserPostList from '../components/UserPostList';
import FollowButton from '../components/FollowButton';

const UserProfileScreen = ({ route }) => {
  const { userId } = route.params;

  const [user, setUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch the current user ID from JWT
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
        if (decodedUserId) {
          setIsFollowing(result.user.followers?.includes(decodedUserId));
        }
      } else {
        console.error('Failed to fetch user:', result.error);
      }
      setLoading(false);
    };

    loadProfileData();
  }, [userId]);

  if (loading || !user || !currentUserId) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.name}>
        {user.firstName} {user.lastName}
      </Text>
      <Text style={styles.info}>
        Followers: {user.followers?.length || 0} | Following: {user.followings?.length || 0}
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