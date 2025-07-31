import React, { useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, StatusBar as RNStatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUserById } from '../utils/ProfileInfo';
import UserPostList from '../components/UserPostList';
import FollowButton from '../components/FollowButton';
import { API_BASE_URL } from '../config';
import ItineraryList from '../components/profileComponents/ItineraryList';
import FollowersModal from '../modals/FollowersModal';
import { StatusBar } from 'expo-status-bar';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const UserProfileScreen = ({ route }) => {
  const { userId } = route.params;
  const [selectedTab, setSelectedTab] = useState('Post');
  const [user, setUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followersModalVisible, setFollowersModalVisible] = useState(false);
  const navigation = useNavigation();

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
    let didRetry = false;
    const loadProfileData = async () => {
      setLoading(true);
      const decodedUserId = await decodeUserIdFromToken();
      setCurrentUserId(decodedUserId);

      let result = await fetchUserById(userId);
      // If token missing, retry once after short delay
      if (!result.success && result.error?.toLowerCase().includes('token')) {
        if (!didRetry) {
          didRetry = true;
          setTimeout(loadProfileData, 300); // Retry after 300ms
          return;
        }
      }
      if (result.success) {
        setUser(result.user);
      } else {
        console.error('Failed to fetch user:', result.error);
      }
      setLoading(false);
    };


    const result = await fetchUserById(userId);
    if (result.success) {
      setUser(result.user);
    } else {
      console.error('Failed to fetch user:', result.error);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  useLayoutEffect(() => {
    if (user && currentUserId && currentUserId !== user._id) {
      navigation.setOptions({
        headerTitle: `${user.firstName} ${user.lastName}`,
        headerTitleStyle: { color: 'white' },
        headerTintColor: 'white',
        headerLeft: () => null,
        headerRight: () => (
          <TouchableOpacity
            style={{ marginRight: 16 }}
            onPress={async () => {
              try {
                const token = await AsyncStorage.getItem('token');
                if (!token) return;
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
          >
            <Feather name="send" size={24} color="white" />
          </TouchableOpacity>
        ),
        headerStyle: {
          backgroundColor: '#00c7be',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
      });
    }
  }, [navigation, user, currentUserId]);

  if (loading || !user || !currentUserId) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 15 }]}>
      <StatusBar style="dark" />

      <View style={styles.profileSection}>
        <TouchableOpacity style={styles.profilePictureWrapper}>
          {user.profilePicture ? (
            <Image source={{ uri: user.profilePicture }} style={styles.profilePicture} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{user.firstName?.[0]?.toUpperCase() || '?'}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.profileStatsColumn}>
          <TouchableOpacity
            style={styles.statRow}
            onPress={() => setFollowersModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text>
              <Text style={styles.statNumber}>{user?.followers?.length || 0}</Text>
              <Text style={styles.statLabel}> Followers</Text>
            </Text>
          </TouchableOpacity>

          <View style={styles.statRow}>
            <Text>
              <Text style={styles.statNumber}>{user?.trips?.length || 0}</Text>
              <Text style={styles.statLabel}> Trips</Text>
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text>
              <Text style={styles.statNumber}>{user?.reviews?.length || 0}</Text>
              <Text style={styles.statLabel}> Reviews</Text>
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.profileInfoRow}>
        <View style={styles.profileTextBlock}>
          {user?.location && <Text style={styles.locationText}>{user.location}</Text>}
          {user?.bio && <Text style={styles.bioText}>{user.bio}</Text>}
        </View>
        {currentUserId !== user._id && (
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
      </View>

      <View style={styles.tabRow}>
        {['Post', 'Itinerary', 'Trip', 'Review'].map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSelectedTab(tab)}
            style={[styles.tabItem, selectedTab === tab && styles.tabItemActive]}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedTab === 'Post' && <UserPostList userId={user._id} />}
      {selectedTab === 'Itinerary' && (
        <ItineraryList
          userId={user._id}
          onPress={(item) => navigation.navigate('ItineraryDetail', { itinerary: item })}
        />
      )}

      <FollowersModal
        visible={followersModalVisible}
        onClose={() => setFollowersModalVisible(false)}
        userId={user?._id}
        title="Followers"
        type="followers"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileSection: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
  profilePictureWrapper: {
    width: 100,
    height: 100,
    borderRadius: 60,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  profilePicture: {
    width: '100%',
    height: '100%',
    borderRadius: 50
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarFallbackText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold'
  },
  profileStatsColumn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    marginLeft: 12
  },
  statRow: { flexDirection: 'row', marginBottom: 6, width: 120 },
  statNumber: { fontSize: 16, fontWeight: 'bold', width: 30, textAlign: 'right' },
  statLabel: { fontSize: 14, textAlign: 'left' },
  profileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 16,
    paddingHorizontal: 5
  },
  profileTextBlock: { flex: 1, paddingRight: 10 },
  locationText: { fontSize: 16, color: '#000', marginBottom: 6 },
  bioText: { fontSize: 14, color: '#444' },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderColor: 'transparent'
  },
  tabItemActive: { borderBottomColor: '#00c7be' },
  tabText: { color: '#777', fontSize: 16 },
  tabTextActive: { color: '#00c7be', fontWeight: 'bold' }
});

export default UserProfileScreen;
