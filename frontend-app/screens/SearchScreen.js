import React, { useState, useEffect, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import debounce from 'lodash.debounce';
import { useNavigation } from '@react-navigation/native';

import { API_BASE_URL } from '../config';
import HotelSearchScreen from './HotelSearchScreen';
import FlightSearchScreen from './FlightSearchScreen';

const TABS = ['Users', 'Posts', 'Hotels', 'Flights'];
const LIMIT = 20;

const formatLocation = loc =>
  loc?.includes('|') ? loc.split('|').reverse().join(', ') : loc || '';

const formatDate = date =>
  new Date(date).toLocaleDateString('en-UK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export default function SearchScreen({ navigation: propNav }) {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('Users');

  const [userResults, setUserResults] = useState([]);
  const [postResults, setPostResults] = useState([]);
  const [userPage, setUserPage] = useState(1);
  const [postPage, setPostPage] = useState(1);
  const [userHasMore, setUserHasMore] = useState(false);
  const [postHasMore, setPostHasMore] = useState(false);

  const [loading, setLoading] = useState(false);

  // Expanded users and their posts
  const [expandedUsers, setExpandedUsers] = useState({}); // { [userId]: bool }
  const [userPosts, setUserPosts] = useState({});         // { [userId]: [post, ...] }

  // Safe fetch with token handling
  const safeFetch = async url => {
    const token = await AsyncStorage.getItem('token');
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 403) {
      await AsyncStorage.removeItem('token');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return null;
    }
    const data = await res.json();
    return res.ok ? data : null;
  };

  // Core search fetch
  const fetchSearchResults = async (searchTerm, tab, pageNum = 1) => {
    if (!searchTerm) {
      setUserResults([]);
      setPostResults([]);
      return;
    }
    setLoading(true);
    try {
      const endpoint =
        tab === 'Users'
          ? `/api/search/users?q=${encodeURIComponent(searchTerm)}&page=${pageNum}&limit=${LIMIT}`
          : `/api/search/posts?q=${encodeURIComponent(searchTerm)}&page=${pageNum}&limit=${LIMIT}`;
      const url = `${API_BASE_URL}${endpoint}`;
      const data = await safeFetch(url);
      if (!data) return;

      const results = data.results || [];
      if (tab === 'Users') {
        setUserResults(prev => (pageNum === 1 ? results : [...prev, ...results]));
        setUserHasMore(results.length === LIMIT);
        setUserPage(pageNum);
      } else {
        setPostResults(prev => (pageNum === 1 ? results : [...prev, ...results]));
        setPostHasMore(results.length === LIMIT);
        setPostPage(pageNum);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced wrapper
  const debouncedFetch = useMemo(
    () => debounce(fetchSearchResults, 300),
    []
  );
  useEffect(() => {
    debouncedFetch(query, selectedTab);
    return () => debouncedFetch.cancel();
  }, [query, selectedTab]);

  // Load posts for one user when expanded
  const loadUserDetails = async userId => {
    if (userPosts[userId] === undefined) {
      setUserPosts(u => ({ ...u, [userId]: null }));
      const data = await safeFetch(`${API_BASE_URL}/api/posts/user/${userId}`);
      const posts = Array.isArray(data) ? data.slice(0, 3) : [];
      setUserPosts(u => ({ ...u, [userId]: posts }));
    }
  };

  // Toggle expand for user row
  const toggleExpand = userId => {
    setExpandedUsers(e => {
      const now = !e[userId];
      if (now) loadUserDetails(userId);
      return { ...e, [userId]: now };
    });
  };

  const handleTabPress = tab => {
    if (tab === 'Hotels') {
      navigation.navigate('HotelSearch');
    } else if (tab === 'Flights') {
      navigation.navigate('FlightSearch');
    } else {
      setSelectedTab(tab);
    }
  };

  const handleLoadMore = () => {
    if (selectedTab === 'Users' && userHasMore) {
      fetchSearchResults(query, 'Users', userPage + 1);
    }
    if (selectedTab === 'Posts' && postHasMore) {
      fetchSearchResults(query, 'Posts', postPage + 1);
    }
  };

  // Renders

  const renderUserItem = ({ item }) => {
    const loc = formatLocation(item.location);
    const posts = userPosts[item._id];
    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardRow}
          onPress={() => navigation.navigate('UserProfile', { userId: item._id })}
        >
          {item.profilePicture ? (
            <Image source={{ uri: item.profilePicture }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color="#fff" />
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.name}>
              {item.firstName} {item.lastName}
            </Text>
            {!!loc && <Text style={styles.meta}>{loc}</Text>}
            <Text style={styles.meta}>
              {item.followers?.length || 0} follower
              {(item.followers?.length || 0) !== 1 && 's'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.chevron}
            onPress={e => {
              e.stopPropagation();
              toggleExpand(item._id);
            }}
          >
            <Ionicons
              name={expandedUsers[item._id] ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#555"
            />
          </TouchableOpacity>
        </TouchableOpacity>

        {expandedUsers[item._id] && (
          <View style={styles.dropdown}>
            {posts === null ? (
              <ActivityIndicator style={{ margin: 8 }} />
            ) : (
              posts.map(p => (
                <View key={p._id} style={styles.postItem}>
                  <Text numberOfLines={2}>{p.content}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </View>
    );
  };

  const renderPostsTab = () => (
    <View style={{ flex: 1 }}>
      <FlatList
        data={postResults}
        keyExtractor={i => i._id}
        renderItem={({ item }) => {
          const likes = Array.isArray(item.likes) ? item.likes.length : 0;
          const reposts = Array.isArray(item.repostCount)
            ? item.repostCount.length
            : typeof item.repostCount === 'number'
            ? item.repostCount
            : 0;
          const imgUrl = item.images?.[0]?.url
            ? `${API_BASE_URL}${item.images[0].url}`
            : null;

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('PostDetail', { post: item })}
            >
              <View style={styles.postHeader}>
                {item.userId.profilePicture ? (
                  <Image
                    source={{ uri: item.userId.profilePicture }}
                    style={styles.avatarSmall}
                  />
                ) : (
                  <View style={styles.avatarSmallPlaceholder}>
                    <Ionicons name="person" size={16} color="#fff" />
                  </View>
                )}
                <Text style={styles.postAuthorName}>
                  {item.userId.firstName} {item.userId.lastName}
                </Text>
              </View>
              {imgUrl && <Image source={{ uri: imgUrl }} style={styles.postImage} />}
              <Text style={styles.postContent} numberOfLines={2}>
                {item.content}
              </Text>
              <View style={styles.postFooter}>
                <View style={styles.footerStats}>
                  <Ionicons name="heart-outline" size={14} color="#555" />
                  <Text style={styles.footerText}>{likes}</Text>
                  <Ionicons name="repeat-outline" size={14} color="#555" />
                  <Text style={styles.footerText}>{reposts}</Text>
                </View>
                <Text style={styles.postDate}>{formatDate(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={!loading && (
          <Text style={styles.emptyText}>No posts found.</Text>
        )}
        ListFooterComponent={loading && (
          <ActivityIndicator style={{ margin: 20 }} />
        )}
        contentContainerStyle={{ paddingBottom: 30 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />
    </View>
  );

  return (
    <View style={[styles.container, {
      paddingTop:
        Platform.OS === 'android' ? RNStatusBar.currentHeight : 20,
    }]}>
      <StatusBar style="dark" />
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${selectedTab.toLowerCase()}...`}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={styles.tabContainer}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => handleTabPress(tab)}
            style={[
              styles.tabItem,
              selectedTab === tab && styles.tabItemActive,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab && styles.tabTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedTab === 'Users' ? (
        <FlatList
          data={userResults}
          keyExtractor={i => i._id}
          renderItem={renderUserItem}
          ListEmptyComponent={!loading && (
            <Text style={styles.emptyText}>No users found.</Text>
          )}
          ListFooterComponent={loading && (
            <ActivityIndicator style={{ margin: 20 }} />
          )}
          contentContainerStyle={{ paddingBottom: 30 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
        />
      ) : selectedTab === 'Posts' ? (
        renderPostsTab()
      ) : (
        // Hotels and Flights tabs are handled via navigation
        <View style={styles.emptyTextContainer}>
          <Text style={styles.emptyText}>
            Tap {selectedTab} above to start searching.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    borderRadius: 25,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 20,
  },
  tabItemActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 16, color: '#555' },
  tabTextActive: { color: '#007bff', fontWeight: 'bold' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eee' },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eee',
  },
  avatarSmallPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: 'bold' },
  meta: { fontSize: 13, color: '#555', marginTop: 2 },
  chevron: { padding: 8 },
  dropdown: {
    backgroundColor: '#fafafa',
    margin: 12,
    borderRadius: 8,
    padding: 12,
  },
  postItem: {
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  postAuthorName: { marginLeft: 8, fontSize: 16, fontWeight: 'bold' },
  postImage: { width: '100%', height: 180, resizeMode: 'cover' },
  postContent: { fontSize: 15, marginHorizontal: 12, marginVertical: 8 },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  footerStats: { flexDirection: 'row', alignItems: 'center' },
  footerText: { marginHorizontal: 4, fontSize: 12, color: '#555' },
  postDate: { fontSize: 12, color: '#777' },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#999' },
  emptyTextContainer: { flex: 1, justifyContent: 'center' },
});
