import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation} from '@react-navigation/native';
import AddPost from '../components/AddPost';
import PostList from '../components/PostList';
import { fetchUserProfile } from '../utils/ProfileInfo';
import { Button } from 'react-native-elements';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);

  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  const loadUser = useCallback(() => {
    // Synchronous function for useFocusEffect
    async function fetchUserData() {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('token'); // Changed from authToken to token
        console.log('ProfileScreen - AuthToken:', token);
        if (!token) {
          Alert.alert('Error', 'Authentication token missing. Please log in again.');
          setUserInfo(null);
          return;
        }

        const userData = await fetchUserProfile();
        console.log('ProfileScreen - Fetched user data:', JSON.stringify(userData, null, 2));
        if (userData && userData.success && userData.user && userData.user._id) {
          setUserInfo(userData.user);
        } else {
          console.error('ProfileScreen - Invalid user data:', userData);
          const errorMsg = userData?.error?.message || JSON.stringify(userData?.error) || 'Invalid user data';
          Alert.alert('Error', `Failed to load user data: ${errorMsg}`);
          setUserInfo(null);
        }
      } catch (error) {
        console.error('ProfileScreen - Error loading user data:', error.message);
        Alert.alert('Error', `An unexpected error occurred: ${error.message}`);
        setUserInfo(null);
      } finally {
        setLoading(false);
        console.log('ProfileScreen - Loading complete, userInfo:', userInfo);
      }
    }

    fetchUserData();
  }, []);

  useFocusEffect(loadUser);

  const handleEditProfile = () => {
    if (loading) {
      Alert.alert('Error', 'User profile is still loading. Please wait.');
      return;
    }

    if (!userInfo || !userInfo._id) {
      Alert.alert('Error', 'User information is not available.');
      return;
    }

    try {
      console.log('ProfileScreen - Navigating to EditProfileScreen with userId:', userInfo._id);
      navigation.navigate('EditProfile', { userId: userInfo._id });
    } catch (error) {
      console.error('ProfileScreen - Navigation error:', error.message);
      Alert.alert('Error', 'Navigation failed: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : userInfo ? (
        <>
          <Text style={styles.profileText}>
            {userInfo.firstName} {userInfo.lastName}
          </Text>
          <Text style={styles.profileText}>
            Followers: {userInfo.followers?.length || 0} | Following: {userInfo.followings?.length || 0}
          </Text>
          <Button
            title="Edit Profile"
            onPress={handleEditProfile}
            buttonStyle={styles.editButton} 
            disabled={loading || !userInfo._id} 
          />
        </>
      ) : (
        <View>
          <Text style={styles.profileText}>Failed to load user information.</Text>
          <Button
            title="Retry"
            onPress={loadUser}
            buttonStyle={styles.retryButton}
          />
        </View>
        )}

      <AddPost onPostCreated={triggerRefresh} />
      <Text style={styles.subHeader}>Recent Posts:</Text>
      <PostList refreshTrigger={refreshKey} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  profileText: { fontSize: 16, marginBottom: 4 },
  subHeader: { fontSize: 20, marginTop: 20, marginBottom: 10 },
  editButton: { backgroundColor: '#007bff', marginTop: 10 },
  retryButton: { backgroundColor: '#6c757d', marginTop: 10 },
  debugText: { fontSize: 12, color: '#666', marginTop: 20 },
});

export default ProfileScreen;