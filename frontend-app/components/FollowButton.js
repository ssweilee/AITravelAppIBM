import React, { useState, useEffect } from 'react';
import { Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const FollowButton = ({ userId, isFollowingInitially, onFollowToggle }) => {
  const [isFollowing, setIsFollowing] = useState(isFollowingInitially);
  const [loading, setLoading] = useState(false);

  const handleToggleFollow = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/follow`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok) {
        setIsFollowing(!isFollowing);
        onFollowToggle?.(!isFollowing); // Notify parent if needed
      } else {
        console.log('Follow action failed:', data);
        Alert.alert('Failed to follow/unfollow');
      }
    } catch (err) {
      console.error('Follow error:', err);
      Alert.alert('Follow action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      title={isFollowing ? "Unfollow" : "Follow"}
      onPress={handleToggleFollow}
      disabled={loading}
    />
  );
};

export default FollowButton;