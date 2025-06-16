import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, StatusBar as RNStatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { fetchUserProfile } from '../utils/ProfileInfo';
import AddPost from '../components/AddPost';
import PostList from '../components/PostList';

const ProfileScreen = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  const [selectedTab, setSelectedTab] = useState('Post');

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
    <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 30 }]}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.userName]}>
            {userInfo?.firstName} {userInfo?.lastName}
          </Text>
        </View>
        <View style={styles.iconRow}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={28} color="black" />
          </TouchableOpacity>
          <View style={{ position: 'relative' }}>
            <TouchableOpacity style={styles.iconButton} onPress={() => setShowDropdown(v => !v)}>
              <MaterialIcons name="add-circle-outline" size={28} color="black" />
            </TouchableOpacity>
            {showDropdown && (
              <View style={[styles.dropdown, { top: 38, right: -10 }]}>
                <TouchableOpacity style={styles.dropdownItem}>
                  <MaterialIcons name="forum" size={22} color="#222" style={{ marginRight: 10 }} />
                  <Text>Thread</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownItem}>
                  <MaterialIcons name="post-add" size={22} color="#222" style={{ marginRight: 10 }} />
                  <Text>Post</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownItem}>
                  <MaterialIcons name="event-note" size={22} color="#222" style={{ marginRight: 10 }} />
                  <Text>Itinerary</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="chatbubble-outline" size={28} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      {/*<View style={styles.profileSection}>
        <View style={styles.profilePictureWrapper}>
          <Ionicons name="person" size={40} color="#999" />
        </View>
        <View style={styles.profileStats}>
          <Text style={styles.profileText}>
            Followers: {userInfo?.followers?.length || 0} | Trips: {userInfo?.trips?.length || 0} | Reviews: {userInfo?.reviews?.length || 0}
          </Text>
        </View>
      </View>*/}

      <View style={styles.profileSection}>
        <View style={styles.profilePictureWrapper}>
          <Ionicons name="person" size={40} color="#999" />
      </View>
      <View style={styles.profileStatsColumn}>
        <View style={styles.statRow}>
          <Text>
            <Text style={styles.statNumber}>{userInfo?.followers?.length || 0}</Text>
            <Text style={styles.statLabel}> Followers</Text>
          </Text>
      </View>
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
      <Text style={styles.locationText}>{userInfo?.location || ''}</Text>
      <Text style={styles.bioText}>{userInfo?.bio || ''}</Text>
    </View>
    <TouchableOpacity style={styles.editButton} onPress={() => alert('Dummy edit action')}>
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

      {selectedTab === 'Post' && (
        <>
          <AddPost onPostCreated={triggerRefresh} />
          <Text style={styles.subHeader}>Recent Posts:</Text>
          <PostList refreshTrigger={refreshKey} />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingVertical: 20, paddingHorizontal: 5, borderBottomWidth: 1, borderColor: '#eee' },
  userName: { textAlign: 'left', fontSize: 22, fontWeight: 'bold', color: '#000222'},
  iconRow: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginHorizontal: 6 },
  profileSection: { flexDirection: 'row', alignItems: 'center', marginTop: 15},
  profilePictureWrapper: { width: 100, height: 100, borderRadius: 60, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 12},
  profileStatsColumn: { flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', marginLeft: 12},
  statRow: { flexDirection: 'row', marginBottom: 6, width: 120},
  statNumber: { fontSize: 16, fontWeight: 'bold', width: 30, textAlign: 'right'},
  statLabel: { fontSize:14, textAlign: 'left'},
  profileInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 16, paddingHorizontal: 5},
  profileTextBlock: { flex: 1, paddingRight: 10},
  locationText: { fontSize: 16, color: '#000', marginBottom: 6},
  bioText: { fontSize: 14, color: '#444'},
  editButton: { backgroundColor: '#007bff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6},
  editButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14},
  tabRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, borderBottomWidth: 1, borderColor: '#eee'},
  tabItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 2, borderColor: 'transparent'},
  tabItemActive: { borderBottomColor: '#007bff'},
  tabText: { color: '#777', fontSize: 16},
  tabTextActive: { color: '#007bff', fontWeight: 'bold'},
  subHeader: { fontSize: 20, marginTop: 20, marginBottom: 10},
  dropdown: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    paddingVertical: 8,
    zIndex: 100,
    minWidth: 120,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
});

export default ProfileScreen;