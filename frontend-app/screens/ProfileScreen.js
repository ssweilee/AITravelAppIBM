import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AddPost from '../components/AddPost';
import PostList from '../components/PostList';
import { fetchUserProfile } from '../utils/ProfileInfo';

const ProfileScreen = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  const loadUser = async () => {
    const result = await fetchUserProfile();
    if (result.success) {
      setUserInfo(result.user);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [])
  );

  return (
    <View style={styles.container}>
      {userInfo && (
        <>
          <Text style={styles.profileText}>
            {userInfo.firstName} {userInfo.lastName}
          </Text>
          <Text style={styles.profileText}>
            Followers: {userInfo.followers?.length || 0} | Following: {userInfo.followings?.length || 0}
          </Text>
        </>
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
});

export default ProfileScreen;