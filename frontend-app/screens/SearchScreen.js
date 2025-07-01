
// screens/SearchScreen.js

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import debounce from 'lodash.debounce';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../config';

const TABS = ['Users', 'Posts'];
const LIMIT = 20;
const formatLocation = loc =>
  loc?.includes('|') ? loc.split('|').reverse().join(', ') : loc || '';

export default function SearchScreen() {
  const navigation = useNavigation();

  const [query, setQuery]             = useState('');
  const [selectedTab, setSelectedTab] = useState('Users');
  const [userResults, setUserResults] = useState([]);
  const [postResults, setPostResults] = useState([]);
  const [loading, setLoading]         = useState(false);

  // expanded states: undefined = not fetched yet, null = loading, [] = empty, [...] = data
  const [expanded, setExpanded]   = useState({});
  const [userPosts, setUserPosts] = useState({});
  const [userItins, setUserItins] = useState({});

  // Wrap fetch to handle 403 → logout
  const safeFetch = async url => {
    const token = await AsyncStorage.getItem('token');
    const res   = await fetch(url, {
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

  // Main search
  const fetchSearch = async (q, tab) => {
    if (!q) {
      setUserResults([]); setPostResults([]);
      return;
    }
    setLoading(true);
    const endpoint = tab === 'Users'
      ? `/api/search/users?q=${encodeURIComponent(q)}&limit=${LIMIT}`
      : `/api/search/posts?q=${encodeURIComponent(q)}&limit=${LIMIT}`;
    const data = await safeFetch(`${API_BASE_URL}${endpoint}`);
    if (data) {
      if (tab === 'Users') setUserResults(data.results);
      else                 setPostResults(data.results);
    }
    setLoading(false);
  };

  // Debounce input
  const debounced = useMemo(() => debounce(fetchSearch, 300), []);
  useEffect(() => {
    debounced(query, selectedTab);
    return () => debounced.cancel();
  }, [query, selectedTab]);

  // Load full list and then take top3
  const loadUserDetails = async userId => {
    // Posts
    if (userPosts[userId] === undefined) {
      setUserPosts(up => ({ ...up, [userId]: null }));
      const allPosts = await safeFetch(`${API_BASE_URL}/api/posts/${userId}`);
      const recent   = Array.isArray(allPosts) ? allPosts.slice(0, 3) : [];
      setUserPosts(up => ({ ...up, [userId]: recent }));
    }
    // Itineraries
    if (userItins[userId] === undefined) {
      setUserItins(ui => ({ ...ui, [userId]: null }));
      const allItins = await safeFetch(`${API_BASE_URL}/api/itineraries/${userId}`);
      const topItins = Array.isArray(allItins) ? allItins.slice(0, 3) : [];
      setUserItins(ui => ({ ...ui, [userId]: topItins }));
    }
  };

  const toggleExpand = userId =>
    setExpanded(e => {
      const now = !e[userId];
      if (now) loadUserDetails(userId);
      return { ...e, [userId]: now };
    });

  // Render user card + dropdown
  const renderUser = ({ item }) => {
    const fc   = item.followers?.length || 0;
    const loc  = formatLocation(item.location);
    const posts = userPosts[item._id];
    const itins = userItins[item._id];

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('UserProfile', { userId: item._id })}
      >
        <View style={styles.cardRow}>
          {item.profilePicture
            ? <Image source={{ uri: item.profilePicture }} style={styles.avatar}/>
            : <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={24} color="#fff"/>
              </View>
          }
          <View style={styles.info}>
            <Text style={styles.name}>
              {item.firstName} {item.lastName}
            </Text>
            {!!loc && <Text style={styles.meta}>{loc}</Text>}
            <Text style={styles.meta}>{fc} follower{fc !== 1 && 's'}</Text>
          </View>
          <TouchableOpacity
            style={styles.chevron}
            onPress={e => { e.stopPropagation(); toggleExpand(item._id); }}
          >
            <Ionicons
              name={expanded[item._id] ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#555"
            />
          </TouchableOpacity>
        </View>

        {expanded[item._id] && (
          <View style={styles.dropdown}>
            {/* Itineraries */}
            {itins === null && <ActivityIndicator style={{margin:8}} />}
            {Array.isArray(itins) && itins.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Itineraries</Text>
                <FlatList
                  data={itins}
                  horizontal
                  keyExtractor={i => i._id}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item: itin }) => {
                    // compute counts off your arrays
                    const likes   = Array.isArray(itin.likes)   ? itin.likes.length   : 0;
                    const reposts = Array.isArray(itin.repostCount) ? itin.repostCount.length : 0;
                    const shares  = Array.isArray(itin.shareCount)  ? itin.shareCount.length  : 0;

                    return (
                      <TouchableOpacity
                        style={styles.itinPill}
                        onPress={() =>
                          navigation.navigate('ItineraryDetail', { itinerary: itin })
                        }
                      >
                        <Text style={styles.itinName} numberOfLines={1}>
                          {itin.title}
                        </Text>
                        <View style={styles.itinIcons}>
                          <Ionicons name="heart-outline" size={12} color="#555" />
                          <Text style={styles.itinCount}>{likes}</Text>
                          <MaterialIcons name="repeat" size={12} color="#555" />
                          <Text style={styles.itinCount}>{reposts}</Text>
                          <Ionicons name="share-social-outline" size={12} color="#555" />
                          <Text style={styles.itinCount}>{shares}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            )}

            {/* Recent Posts */}
            {posts === null && <ActivityIndicator style={{margin:8}} />}
            {Array.isArray(posts) && posts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Posts</Text>
                {posts.map(p => (
                  <View key={p._id} style={styles.postItem}>
                    <Text numberOfLines={2}>{p.content}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render post result
  const renderPost = ({ item }) => {
    const imgUrl = item.images?.[0]?.url
      ? `${API_BASE_URL}${item.images[0].url}`
      : null;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PostDetail', { post: item })}
      >
        {imgUrl && <Image source={{ uri: imgUrl }} style={styles.postImage} />}
        <Text style={styles.postContent} numberOfLines={2}>
          {item.content}
        </Text>
        <Text style={styles.postAuthor}>
          — {item.userId.firstName} {item.userId.lastName}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 40 }]}>
      <StatusBar style="dark" />

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${selectedTab.toLowerCase()}...`}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSelectedTab(tab)}
            style={[styles.tabItem, selectedTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      <FlatList
        data={selectedTab === 'Users' ? userResults : postResults}
        keyExtractor={item => item._id}
        renderItem={selectedTab === 'Users' ? renderUser : renderPost}
        ListEmptyComponent={
          !loading && <Text style={styles.emptyText}>No {selectedTab.toLowerCase()} found.</Text>
        }
        ListFooterComponent={loading && <ActivityIndicator style={{ margin: 20 }} />}
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16 },

  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  tabItem: { paddingVertical: 8, paddingHorizontal: 16, marginHorizontal: 4 },
  tabActive: { borderBottomWidth: 2, borderColor: '#007bff' },
  tabText: { fontSize: 16, color: '#777' },
  tabTextActive: { color: '#007bff', fontWeight: 'bold' },

  card: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eee' },
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#007bff',
    justifyContent: 'center', alignItems: 'center',
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
  section: { marginBottom: 12 },
  sectionTitle: { fontWeight: '600', marginBottom: 8 },

  itinPill: {
    backgroundColor: '#fde2e4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    minWidth: 100,
  },
  itinName: { fontSize: 14, fontWeight: '500' },
  itinIcons: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  itinCount: { marginHorizontal: 4, fontSize: 12, color: '#555' },

  postItem: {
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  postImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  postContent: { fontSize: 15, margin: 12, marginTop: 8 },
  postAuthor: {
    fontSize: 13,
    color: '#555',
    fontStyle: 'italic',
    marginHorizontal: 12,
    marginBottom: 12,
  },

  emptyText: { textAlign: 'center', marginTop: 20, color: '#999' },
});
