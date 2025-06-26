// screens/SearchScreen.js

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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import { useNavigation } from '@react-navigation/native';
import debounce from 'lodash.debounce';

const TABS = ['Users', 'Posts'];
const LIMIT = 20;

const SearchScreen = () => {
  const [query, setQuery]           = useState('');
  const [selectedTab, setSelectedTab] = useState('Users');
  const [userResults, setUserResults] = useState([]);
  const [postResults, setPostResults] = useState([]);
  const [userPage, setUserPage]       = useState(1);
  const [postPage, setPostPage]       = useState(1);
  const [userHasMore, setUserHasMore] = useState(false);
  const [postHasMore, setPostHasMore] = useState(false);
  const [loading, setLoading]         = useState(false);

  // NEW: track which users are expanded & their loaded posts
  const [expandedUsers, setExpandedUsers] = useState({});     // { [userId]: bool }
  const [userPosts, setUserPosts]         = useState({});     // { [userId]: [post, ...] }

  const navigation = useNavigation();

  // fetch the normal search results (users or posts)
  const fetchSearchResults = async (searchTerm, tab, pageNum = 1) => {
    if (!searchTerm) {
      setUserResults([]);
      setPostResults([]);
      return;
    }
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const endpoint =
        tab === 'Users'
          ? `/api/search/users?q=${encodeURIComponent(searchTerm)}&page=${pageNum}&limit=${LIMIT}`
          : `/api/search/posts?q=${encodeURIComponent(searchTerm)}&page=${pageNum}&limit=${LIMIT}`;
      const url = `${API_BASE_URL}${endpoint}`;
      console.log('Calling endpoint:', url);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
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
      } else {
        console.warn('Search failed:', data);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // fetch a specific user's posts when expanding
  const fetchUserPosts = async (userId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const url = `${API_BASE_URL}/api/posts/${userId}`;
      console.log('Fetching posts for user:', url);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const posts = await res.json();
      if (res.ok) {
        setUserPosts(prev => ({ ...prev, [userId]: posts }));
      } else {
        console.warn('User posts fetch failed:', posts);
      }
    } catch (err) {
      console.error('Error fetching user posts:', err);
    }
  };

  // toggle expand/collapse
  const toggleExpand = (userId) => {
    setExpandedUsers(prev => {
      const isNow = !prev[userId];
      // if expanding for first time, load posts
      if (isNow && !userPosts[userId]) {
        fetchUserPosts(userId);
      }
      return { ...prev, [userId]: isNow };
    });
  };

  // debounce main search
  const debouncedFetch = useMemo(
    () => debounce((q, t) => fetchSearchResults(q, t, 1), 300),
    []
  );

  useEffect(() => {
    // reset on tab/change
    if (selectedTab === 'Users') {
      setUserResults([]); setUserPage(1); setUserHasMore(false);
    } else {
      setPostResults([]); setPostPage(1); setPostHasMore(false);
    }
    debouncedFetch(query, selectedTab);
    return () => debouncedFetch.cancel();
  }, [query, selectedTab]);

  // render each user row, with a chevron to expand
  const renderUserItem = ({ item }) => (
    <View>
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => navigation.navigate('UserProfile', { userId: item._id })}
      >
        <Text style={styles.nameText}>
          {item.firstName} {item.lastName}
        </Text>
        <Ionicons
          name={expandedUsers[item._id] ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={24}
          color="#555"
          onPress={() => toggleExpand(item._id)}
        />
      </TouchableOpacity>
      {expandedUsers[item._id] && (
        <View style={styles.dropdown}>
          { !userPosts[item._id] ? (
            <ActivityIndicator style={{ margin: 10 }} />
          ) : (
            userPosts[item._id].map(post => (
              <View key={post._id} style={styles.postDropdownItem}>
                <Text numberOfLines={2}>{post.content}</Text>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );

  // render global posts (when on Posts tab)
  const renderPostItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => navigation.navigate('PostDetail', { post: item })}
    >
      <Text style={styles.postContent} numberOfLines={2}>
        {item.content}
      </Text>
      <Text style={styles.postAuthor}>
        — {item.userId.firstName} {item.userId.lastName}
      </Text>
    </TouchableOpacity>
  );

  // load more button logic (unchanged)…
  const handleLoadMore = () => {
    if (selectedTab === 'Users' && userHasMore) {
      fetchSearchResults(query, 'Users', userPage + 1);
    }
    if (selectedTab === 'Posts' && postHasMore) {
      fetchSearchResults(query, 'Posts', postPage + 1);
    }
  };
  const ListFooter = () => {
    if (loading) return <ActivityIndicator style={{ margin: 20 }} />;
    const hasMore = selectedTab === 'Users' ? userHasMore : postHasMore;
    if (!hasMore) return null;
    return (
      <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore}>
        <Text style={styles.loadMoreText}>Load More</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 30 },
      ]}
    >
      <StatusBar style="dark" />

      <TextInput
        placeholder={`Search for ${selectedTab.toLowerCase()}...`}
        value={query}
        onChangeText={setQuery}
        style={styles.searchInput}
      />

      <View style={styles.tabRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSelectedTab(tab)}
            style={[styles.tabItem, selectedTab === tab && styles.tabItemActive]}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={selectedTab === 'Users' ? userResults : postResults}
        keyExtractor={item => item._id}
        renderItem={selectedTab === 'Users' ? renderUserItem : renderPostItem}
        ListEmptyComponent={
          !loading && (
            <Text style={styles.emptyText}>
              No {selectedTab.toLowerCase()} found.
            </Text>
          )
        }
        ListFooterComponent={<ListFooter />}
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, backgroundColor: '#fff' },
  searchInput: {
    height: 50, borderWidth: 1, borderColor: '#aaa',
    padding: 10, borderRadius: 5, marginBottom: 10,
  },
  tabRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    borderBottomWidth: 1, borderColor: '#eee', marginBottom: 10,
  },
  tabItem: {
    paddingVertical: 10, paddingHorizontal: 16,
    borderBottomWidth: 2, borderColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: '#007bff' },
  tabText: { color: '#777', fontSize: 16 },
  tabTextActive: { color: '#007bff', fontWeight: 'bold' },

  resultItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderColor: '#ddd',
  },
  nameText: { fontSize: 18 },

  dropdown: {
    backgroundColor: '#f9f9f9', paddingVertical: 8,
    paddingHorizontal: 12, marginBottom: 8,
  },
  postDropdownItem: {
    paddingVertical: 6, borderBottomWidth: 1, borderColor: '#eee',
  },

  postContent: { fontSize: 16, marginBottom: 4 },
  postAuthor: { fontSize: 14, color: '#555' },

  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16 },

  loadMoreBtn: {
    marginVertical: 15, paddingVertical: 12,
    backgroundColor: '#007bff', borderRadius: 6,
    alignItems: 'center', marginHorizontal: 50,
  },
  loadMoreText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default SearchScreen;
