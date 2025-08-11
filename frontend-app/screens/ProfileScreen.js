import React, { useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, StatusBar as RNStatusBar, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUserProfile } from '../utils/ProfileInfo';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationsContext';
import AddPost from '../components/AddPost';
import PostList from '../components/PostList';
import debounce from 'lodash.debounce';
import ItineraryList from '../components/profileComponents/ItineraryList';
import TripList from '../components/profileComponents/TripList'; 
import FollowersModal from '../modals/FollowersModal';
import { getAvatarUrl } from '../utils/getAvatarUrl';

const ProfileScreen = () => {
  const { user: userInfo, isLoading, refreshUser } = useAuth();
  const { unreadCount } = useNotifications();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTab, setSelectedTab] = useState('Post');
  const [followersModalVisible, setFollowersModalVisible] = useState(false);

  const navigation = useNavigation();
  const route = useRoute();
  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.profileUpdated) {
        console.log('[ProfileScreen] Refreshing user data from context...');
        refreshUser();
        navigation.setParams({ profileUpdated: false }); 
      }
    }, [route.params?.profileUpdated, refreshUser, navigation])
  );

  const formatLocation = (locationString) => {
    if (!locationString || !locationString.includes('|')) {
        return locationString || ''; 
    }
    const [countryCode, city] = locationString.split('|');
    return `${city}, ${countryCode}`;
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginLeft: 20, color: 'white' }}>
          {userInfo?.firstName || 'Profile'} {userInfo?.lastName || ''}
        </Text>
      ),
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 10 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.iconButton}>
            <View style={{ position: 'relative' }}>
              <Ionicons name="notifications-outline" size={24} color="white" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowDropdown(v => !v)} style={styles.iconButton}>
            <MaterialIcons name="create-outline" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Messages')}
          >
            <Ionicons name="chatbubble-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      ),
      headerStyle: {
        backgroundColor: '#00c7be',
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 0,
      },
    });
  }, [navigation, userInfo, unreadCount]);

  if (isLoading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#00c7be" /></View>;
  }

  const navigateToEdit = () => {
    if (!userInfo) {
        console.warn("User info is not available yet, cannot navigate to edit.");
        return; 
    }

    navigation.navigate('EditProfile', {
        userId: userInfo._id,
        currentUserInfo: userInfo, 
    });
  };

  console.log('[ProfileScreen] userInfo:', userInfo);
console.log('[ProfileScreen] profilePicture:', userInfo?.profilePicture);


  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight :10 }]}>
      <StatusBar style="dark" />

      {showDropdown && (
        <View style={[styles.dropdown, { top: 0, right: 40, position: 'absolute' }]}>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setShowDropdown(false);
              navigation.navigate('CreatePost');
            }}
          >
            <MaterialIcons
              name="forum"
              size={22}
              color="#222"
              style={{ marginRight: 10 }}
            />
            <Text>Post</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setShowDropdown(false);
              navigation.navigate('CreateItinerary');
            }}
          >
            <MaterialIcons
              name="event-note"
              size={22}
              color="#222"
              style={{ marginRight: 10 }}
            />
            <Text>Itinerary</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setShowDropdown(false);
              navigation.navigate('CreateTrip');
            }}
          >
            <MaterialIcons
              name="luggage"
              size={22}
              color="#222"
              style={{ marginRight: 10 }}
            />
            <Text>Trip</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.profileSection}>
        <TouchableOpacity 
          style={styles.profilePictureWrapper} 
          onPress={navigateToEdit}  
        >
          {userInfo?.profilePicture ? (   
        <Image
          source={{ uri: userInfo.profilePicture }}
          style={styles.profilePicture}
        />
          ) : (
            <Ionicons name="person" size={40} color="#999" />
          )}
        </TouchableOpacity>
        
        <View style={styles.profileStatsColumn}>
          <TouchableOpacity 
            style={styles.statRow}
            onPress={() => setFollowersModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text>
              <Text style={styles.statNumber}>{userInfo?.followers?.length || 0}</Text>
              <Text style={styles.statLabel}> Followers</Text>
            </Text>
          </TouchableOpacity>
          
          <View style={styles.statRow}>
            <Text>
              <Text style={styles.statNumber}>{userInfo?.trips?.length || 0}</Text>
              <Text style={styles.statLabel}> Trips</Text>
            </Text>
          </View>
          
          <View style={styles.statRow}>
            <Text>
              <Text style={styles.statNumber}>{userInfo?.reviews?.length || 0}</Text>
              <Text style={styles.statLabel}> Reviews</Text>
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.profileInfoRow}>
        <View style={styles.profileTextBlock}>
          <Text style={styles.locationText}>{formatLocation(userInfo?.location)}</Text>
          <Text style={styles.bioText}>{userInfo?.bio || ''}</Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={navigateToEdit} >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
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

      <View style={{ flex: 1 }}>
        {selectedTab === 'Post' && (
          <PostList refreshTrigger={refreshKey} />
        )}

        {selectedTab === 'Itinerary' && (
          <ItineraryList 
            refreshTrigger={refreshKey}
            userId={userInfo?._id}
            onPress={(itinerary) => navigation.navigate('ItineraryDetail', { itinerary })}
          />
        )}
        
        {selectedTab === 'Trip' && (
          <TripList 
            refreshTrigger={refreshKey}
            userId={userInfo?._id}
            onPress={(trip) => navigation.navigate('TripDetail', { trip })}
          />
        )}
      </View>

      <FollowersModal
        visible={followersModalVisible}
        onClose={() => setFollowersModalVisible(false)}
        userId={userInfo?._id}
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
    width: 100, height: 100, borderRadius: 60,
    backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 12
  },
  profilePicture: { 
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  profileStatsColumn: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    flexDirection: 'column', marginLeft: 12
  },
  statRow: { flexDirection: 'row', marginBottom: 6, width: 120 },
  statNumber: { fontSize: 16, fontWeight: 'bold', width: 30, textAlign: 'right' },
  statLabel: { fontSize: 14, textAlign: 'left' },
  profileInfoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginTop: 16, paddingHorizontal: 5
  },
  profileTextBlock: { flex: 1, paddingRight: 10 },
  locationText: { fontSize: 16, color: '#000', marginBottom: 6 },
  bioText: { fontSize: 14, color: '#444' },
  editButton: {
    backgroundColor: '#00c7be', paddingVertical: 8,
    paddingHorizontal: 16, borderRadius: 20
  },
  editButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  tabRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    marginTop: 20, borderBottomWidth: 1, borderColor: '#eee'
  },
  tabItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 2, borderColor: 'transparent' },
  tabItemActive: { borderBottomColor: '#00c7be' },
  tabText: { color: '#777', fontSize: 16 },
  tabTextActive: { color: '#00c7be', fontWeight: 'bold' },
  subHeader: { fontSize: 20, marginTop: 20, marginBottom: 10 },
  dropdown: {
    backgroundColor: '#fff', borderRadius: 12,
    elevation: 5, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4,
    paddingVertical: 8, zIndex: 100, minWidth: 120
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 18
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  iconButton: { marginLeft: 12 },
});

export default ProfileScreen;
