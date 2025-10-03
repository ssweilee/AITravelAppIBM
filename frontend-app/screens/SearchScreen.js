// frontend-app/screens/SearchScreen.js

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { API_BASE_URL } from '../config';
import HotelSearchScreen from './HotelSearchScreen';
import FlightSearchScreen from './FlightSearchScreen';
import { getAvatarUrl } from '../utils/getAvatarUrl';

const TABS = ['Users', 'Posts', 'Hotels', 'Flights'];
const LIMIT = 20;

// Accept `{ results: [...] }` or raw `[...]`
const toResults = (d) => (d?.results ? d.results : Array.isArray(d) ? d : []);

const formatLocation = loc =>
  loc?.includes('|') ? loc.split('|').reverse().join(', ') : loc || '';

const formatDate = date =>
  new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

// Trip helpers
const daysBetween = (a, b) => {
  const d1 = new Date(a), d2 = new Date(b);
  if (isNaN(d1) || isNaN(d2)) return null;
  const ms = Math.abs(d2 - d1);
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
};
const formatTripDuration = t => {
  const d = daysBetween(t?.startDate, t?.endDate);
  return d ? `${d} day${d > 1 ? 's' : ''}` : '';
};
const formatTripDestination = t =>
  t?.destination ||
  t?.location ||
  (t?.city && t?.country ? `${t.city}, ${t.country}` : (t?.city || t?.country || ''));

export default function SearchScreen() {
  const navigation = useNavigation();

  const [query, setQuery]             = useState('');
  const [selectedTab, setSelectedTab] = useState('Users');
  const [userPage, setUserPage]       = useState(1);
  const [postPage, setPostPage]       = useState(1);

  const [userResults, setUserResults] = useState([]);
  const [postResults, setPostResults] = useState([]);
  const [itinResults, setItinResults] = useState([]);
  const [tripResults, setTripResults] = useState([]);

  const [userHasMore, setUserHasMore]   = useState(false);
  const [postHasMore, setPostHasMore]   = useState(false);
  const [itinHasMore, setItinHasMore]   = useState(false);
  const [tripsHasMore, setTripsHasMore] = useState(false);

  const [loading, setLoading] = useState(false);

  const [expandedUsers, setExpandedUsers] = useState({});
  const [userPosts, setUserPosts]         = useState({});
  const [userItins, setUserItins]         = useState({});
  const [userTrips, setUserTrips]         = useState({});

  const expandedUsersRef = useRef(expandedUsers);
  useEffect(() => { expandedUsersRef.current = expandedUsers; }, [expandedUsers]);

  const safeFetch = async url => {
    const token = await AsyncStorage.getItem('token');
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 403) {
      await AsyncStorage.removeItem('token');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return null;
    }
    const data = await res.json();
    return res.ok ? data : null;
  };

  const fetchSearchResults = async (searchTerm, tab, pageNum = 1) => {
    if (!searchTerm) {
      setUserResults([]); setPostResults([]); setItinResults([]); setTripResults([]);
      return;
    }
    setLoading(true);
    try {
      if (tab === 'Users') {
        const data = await safeFetch(
          `${API_BASE_URL}/api/search/users?q=${encodeURIComponent(searchTerm)}&page=${pageNum}&limit=${LIMIT}`
        );
        const results = toResults(data);
        setUserResults(prev => pageNum === 1 ? results : [...prev, ...results]);
        setUserHasMore(results.length === LIMIT);
        setUserPage(pageNum);
      } else if (tab === 'Posts') {
        const postData = await safeFetch(
          `${API_BASE_URL}/api/search/posts?q=${encodeURIComponent(searchTerm)}&page=${pageNum}&limit=${LIMIT}`
        );
        const posts = toResults(postData);
        setPostResults(prev => pageNum === 1 ? posts : [...prev, ...posts]);
        setPostHasMore(posts.length === LIMIT);

        const itinData = await safeFetch(
          `${API_BASE_URL}/api/search/itineraries?q=${encodeURIComponent(searchTerm)}&page=${pageNum}&limit=${LIMIT}`
        );
        const itins = toResults(itinData);
        setItinResults(prev => pageNum === 1 ? itins : [...prev, ...itins]);
        setItinHasMore(itins.length === LIMIT);

        const tripsData = await safeFetch(
          `${API_BASE_URL}/api/search/trips?q=${encodeURIComponent(searchTerm)}&page=${pageNum}&limit=${LIMIT}`
        );
        const trips = toResults(tripsData);
        setTripResults(prev => pageNum === 1 ? trips : [...prev, ...trips]);
        setTripsHasMore(trips.length === LIMIT);

        setPostPage(pageNum);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const debouncedFetch = useMemo(() => debounce(fetchSearchResults, 300), []);
  useEffect(() => {
    debouncedFetch(query, selectedTab);
    return () => debouncedFetch.cancel();
  }, [query, selectedTab]);

  useFocusEffect(
    useCallback(() => {
      if (selectedTab === 'Posts') {
        fetchSearchResults(query, 'Posts', 1);
      } else if (selectedTab === 'Users') {
        const snapshot = expandedUsersRef.current;
        Object.entries(snapshot).forEach(([uid, expanded]) => {
          if (expanded) loadUserDetails(uid, true);
        });
      }
    }, [selectedTab])
  );

  const handleLoadMore = () => {
    if (selectedTab === 'Users' && userHasMore)
      fetchSearchResults(query, 'Users', userPage + 1);
    if (selectedTab === 'Posts') {
      if (postHasMore || itinHasMore || tripsHasMore)
        fetchSearchResults(query, 'Posts', postPage + 1);
    }
  };

  const loadUserDetails = async (userId, force = false) => {
    const hasPosts = userPosts[userId] !== undefined;
    const hasItins = userItins[userId] !== undefined;
    const hasTrips = userTrips[userId] !== undefined;
    if (!force && hasPosts && hasItins && hasTrips) return;

    setUserPosts(u => (!hasPosts ? { ...u, [userId]: null } : u));
    setUserItins(u => (!hasItins ? { ...u, [userId]: null } : u));
    setUserTrips(u => (!hasTrips ? { ...u, [userId]: null } : u));

    const postsData = await safeFetch(`${API_BASE_URL}/api/posts/user/${userId}`);
    const posts     = Array.isArray(postsData) ? postsData.slice(0, 3) : [];
    setUserPosts(u => ({ ...u, [userId]: posts }));

    const itinsData = await safeFetch(`${API_BASE_URL}/api/itineraries/${userId}`);
    const itins     = Array.isArray(itinsData) ? itinsData.slice(0, 3) : [];
    setUserItins(u => ({ ...u, [userId]: itins }));

    const tripsData = await safeFetch(`${API_BASE_URL}/api/trips/user/${userId}`);
    const trips     = Array.isArray(tripsData) ? tripsData.slice(0, 3) : [];
    setUserTrips(u => ({ ...u, [userId]: trips }));
  };

  const toggleExpand = userId => {
    setExpandedUsers(e => {
      const now = !e[userId];
      if (now) {
        const cached =
          userPosts[userId] !== undefined &&
          userItins[userId] !== undefined &&
          userTrips[userId] !== undefined;
        if (!cached) loadUserDetails(userId, false);
      }
      return { ...e, [userId]: now };
    });
  };

  const handleTabPress = tab => {
    if (tab === 'Hotels') return navigation.navigate('HotelSearch');
    if (tab === 'Flights') return navigation.navigate('FlightSearch');
    setSelectedTab(tab);
  };

  // ——— RENDERERS ———

  const TripCard = ({ trip }) => {
    const likes = trip?.likes?.length || 0;
    const destination = formatTripDestination(trip);
    const duration = formatTripDuration(trip);
    return (
      <TouchableOpacity
        style={styles.tripCard}
        onPress={() => navigation.navigate('TripDetail', { trip })}
        activeOpacity={0.85}
      >
        <Text style={styles.tripTitle} numberOfLines={1}>{trip?.title || 'Trip'}</Text>
        {!!destination && (
          <View style={styles.tripMetaRow}>
            <Ionicons name="location-outline" size={14} color="#187E77" />
            <Text style={styles.tripMetaText} numberOfLines={1}>{destination}</Text>
          </View>
        )}
        {!!duration && (
          <View style={styles.tripMetaRow}>
            <Ionicons name="time-outline" size={14} color="#187E77" />
            <Text style={styles.tripMetaText}>{duration}</Text>
          </View>
        )}
        <View style={styles.tripMetaRow}>
          <Ionicons name="heart-outline" size={14} color="#187E77" />
          <Text style={styles.tripMetaText}>{likes}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const PostCardH = ({ post }) => {
    const likes   = post?.likes?.length || 0;
    const reposts = post?.repostCount?.length || 0;
    const dateStr = formatDate(post?.createdAt);
    return (
      <TouchableOpacity
        style={styles.postCardH}
        onPress={() => navigation.navigate('PostDetail', { post })}
        activeOpacity={0.85}
      >
        <Text style={styles.postCardText} numberOfLines={3}>{post?.content || ''}</Text>
        <View style={styles.postCardFooter}>
          <View style={styles.postCardStats}>
            <Ionicons name="heart-outline" size={14} color="#555" />
            <Text style={styles.postCardCount}>{likes}</Text>
            <Ionicons name="repeat-outline" size={14} color="#555" />
            <Text style={styles.postCardCount}>{reposts}</Text>
          </View>
          <Text style={styles.postCardDate}>{dateStr}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderUserItem = ({ item, index }) => {
    const loc   = formatLocation(item.location);
    const posts = userPosts[item._id];
    const itins = userItins[item._id];
    const trips = userTrips[item._id];

    return (
      <View style={styles.card} key={`userRow-${item._id}-${index}`}>
        <TouchableOpacity
          style={styles.cardRow}
          onPress={() => navigation.navigate('UserProfile', { userId: item._id })}
        >
          <View style={styles.avatarWrapper}>
        {item.profilePicture ? (
          <Image
          source={{ uri: getAvatarUrl(item.profilePicture) }}
          style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>
              {(item.firstName?.[0] || '') + (item.lastName?.[0] || '')}
            </Text>
          </View>
        )}
      </View>
          <View style={styles.info}>
            <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
            {!!loc && <Text style={styles.meta}>{loc}</Text>}
            <Text style={styles.meta}>
              {item.followers?.length || 0} follower{ (item.followers?.length||0)!==1 && 's' }
            </Text>
          </View>
          <TouchableOpacity
            style={styles.chevron}
            onPress={e => { e.stopPropagation(); toggleExpand(item._id); }}
          >
            <Ionicons
              name={expandedUsers[item._id] ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#555"
            />
          </TouchableOpacity>
        </TouchableOpacity>

        {expandedUsers[item._id] && (
          <View style={styles.dropdownModern}>
            {/* Trips */}
            {trips === null ? (
              <ActivityIndicator style={{ margin: 8 }} />
            ) : trips?.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trips</Text>
                <FlatList
                  data={trips}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 16, paddingRight: 10 }}
                  keyExtractor={(t, i) => `uTrip-${t._id}-${i}`}
                  renderItem={({ item: trip }) => <TripCard trip={trip} />}
                />
              </View>
            ) : null}

            {/* Itineraries (icons now Ionicons for consistency) */}
            {itins === null ? (
              <ActivityIndicator style={{ margin: 8 }} />
            ) : itins?.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Itineraries</Text>
                <FlatList
                  data={itins}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 16, paddingRight: 10 }}
                  keyExtractor={(it, i) => `uItin-${it._id}-${i}`}
                  renderItem={({ item: itin }) => {
                    const likes   = itin.likes?.length || 0;
                    const reposts = itin.repostCount?.length || 0;
                    return (
                      <TouchableOpacity
                        style={styles.itinPill}
                        onPress={() => navigation.navigate('ItineraryDetail', { itinerary: itin })}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.itinName} numberOfLines={1}>{itin.title}</Text>
                        <View style={styles.itinIcons}>
                          <Ionicons name="heart-outline" size={12} />
                          <Text style={styles.itinCount}>{likes}</Text>
                          <Ionicons name="repeat-outline" size={12} />
                          <Text style={styles.itinCount}>{reposts}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            ) : null}

            {/* Recent Posts */}
            {posts === null ? (
              <ActivityIndicator style={{ margin: 8 }} />
            ) : posts?.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Posts</Text>
                <FlatList
                  data={posts}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 16, paddingRight: 10 }}
                  keyExtractor={(p, i) => `uPost-${p._id}-${i}`}
                  renderItem={({ item: post }) => <PostCardH post={post} />}
                />
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  // POSTS tab — Trips + Itineraries header, then post results
  const renderPostsTab = () => {
    const header = (
      <View>
        {tripResults.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Trips</Text>
            <FlatList
              data={tripResults}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 16, paddingBottom: 8 }}
              keyExtractor={(t, i) => `gTrip-${t._id}-${i}`}
              renderItem={({ item: trip }) => <TripCard trip={trip} />}
            />
          </>
        )}

        {itinResults.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Itineraries</Text>
            <FlatList
              data={itinResults}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 16, paddingBottom: 8 }}
              keyExtractor={(it, i) => `gItin-${it._id}-${i}`}
              renderItem={({ item: itin }) => {
                const likes   = itin.likes?.length || 0;
                const reposts = itin.repostCount?.length || 0;
                return (
                  <TouchableOpacity
                    style={[styles.itinPill, { paddingVertical: 16 }]}
                    onPress={() => navigation.navigate('ItineraryDetail', { itinerary: itin })}
                  >
                    <Text style={styles.itinName} numberOfLines={1}>{itin.title}</Text>
                    <View style={styles.itinIcons}>
                      <Ionicons name="heart-outline" size={12} />
                      <Text style={styles.itinCount}>{likes}</Text>
                      <Ionicons name="repeat-outline" size={12} />
                      <Text style={styles.itinCount}>{reposts}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </>
        )}

        {loading && tripResults.length === 0 && itinResults.length === 0 && (
          <ActivityIndicator style={{ margin: 12 }} />
        )}
      </View>
    );

    return (
      <FlatList
        data={postResults}
        ListHeaderComponent={header}
        keyExtractor={(item, idx) => `post-${item._id}-${idx}`}
        renderItem={({ item }) => {
          // Be tolerant to API returning arrays or numeric counters
          const likes =
            (Array.isArray(item.likes) ? item.likes.length :
              (typeof item.likes === 'number' ? item.likes :
                (typeof item.likesCount === 'number' ? item.likesCount : 0)));

          const reposts =
            (Array.isArray(item.repostCount) ? item.repostCount.length :
              (Array.isArray(item.repostedBy) ? item.repostedBy.length :
                (typeof item.repostCount === 'number' ? item.repostCount : 0)));

          const imgUrl  = item.images?.[0]?.url ? `${API_BASE_URL}${item.images[0].url}` : null;

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('PostDetail', { post: item })}
            >
              <View style={styles.postHeader}>
                {item.userId?.profilePicture
                  ? <Image source={{ uri: item.userId.profilePicture }} style={styles.avatarSmall}/>
                  : <View style={styles.avatarSmallPlaceholder}>
                      <Ionicons name="person" size={16} color="#fff"/>
                    </View>
                }
                <Text style={styles.postAuthorName}>
                  {item.userId?.firstName} {item.userId?.lastName}
                </Text>
              </View>
              {imgUrl && <Image source={{ uri: imgUrl }} style={styles.postImage}/>}
              <Text style={styles.postContent} numberOfLines={2}>{item.content}</Text>
              <View style={styles.postFooter}>
                <View style={styles.footerStats}>
                  <Ionicons name="heart-outline" size={14} color="#555"/><Text style={styles.footerText}>{likes}</Text>
                  <Ionicons name="repeat-outline" size={14} color="#555"/><Text style={styles.footerText}>{reposts}</Text>
                </View>
                <Text style={styles.postDate}>{formatDate(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={!loading && <Text style={styles.emptyText}>No posts found.</Text>}
        ListFooterComponent={loading && <ActivityIndicator style={{ margin: 20 }} />}
        contentContainerStyle={{ paddingBottom: 30 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />
    );
  };

  return (
    <View style={[styles.container, {
      paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 20
    }]}>
      <StatusBar style="dark"/>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#888"/>
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
            key={`tab-${tab}`}
            onPress={() => handleTabPress(tab)}
            style={[styles.tabItem, selectedTab === tab && styles.tabItemActive]}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedTab === 'Users'
        ? <FlatList
            data={userResults}
            keyExtractor={(item, i) => `usr-${item._id}-${i}`}
            renderItem={renderUserItem}
            ListEmptyComponent={!loading && <Text style={styles.emptyText}>No users found.</Text>}
            ListFooterComponent={loading && <ActivityIndicator style={{ margin: 20 }} />}
            contentContainerStyle={{ paddingBottom: 30 }}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
          />
        : selectedTab === 'Posts'
          ? renderPostsTab()
          : <View style={styles.emptyTextContainer}>
              <Text style={styles.emptyText}>Tap {selectedTab} above to start searching.</Text>
            </View>
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f3f3f3',
    marginHorizontal: 16, marginVertical: 10,
    borderRadius: 12, paddingHorizontal: 12, height: 40
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    borderRadius: 25,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 2
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 20 },
  tabItemActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 16, color: '#555' },
  tabTextActive: { color: '#00c7be', fontWeight: 'bold' },

  card: {
    backgroundColor: '#fff', marginHorizontal: 16,
    marginVertical: 8, borderRadius: 12,
    borderWidth: 1, borderColor: '#eee', overflow: 'hidden'
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eee' },
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#00c7be', justifyContent: 'center', alignItems: 'center'
  },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: 'bold' },
  meta: { fontSize: 13, color: '#555', marginTop: 2 },
  chevron: { padding: 8 },

  // Modern dropdown style
  dropdownModern: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    paddingVertical: 12,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: '#E6F2F1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  section: { marginBottom: 12 },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    color: '#187E77'
  },

  // Itinerary pill (icons switched to Ionicons for consistency)
  itinPill: {
    backgroundColor: '#E0F7FA',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    marginRight: 10,
    minWidth: 140,
  },
  itinName: { fontSize: 14, fontWeight: '600', color: '#0A4D47' },
  itinIcons: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  itinCount: { marginHorizontal: 4, fontSize: 12, color: '#555' },

  // Trip card
  tripCard: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    marginRight: 10,
    minWidth: 160,
    borderWidth: 1,
    borderColor: '#DCEBFF',
  },
  tripTitle: { fontSize: 14, fontWeight: '700', color: '#0D3B66' },
  tripMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  tripMetaText: { marginLeft: 6, fontSize: 12, color: '#1B4F72' },

  // Horizontal Post card
  postCardH: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    marginRight: 10,
    minWidth: 200,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  postCardText: { fontSize: 14, color: '#222' },
  postCardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  postCardStats: { flexDirection: 'row', alignItems: 'center' },
  postCardCount: { marginHorizontal: 6, fontSize: 12, color: '#555' },
  postCardDate: { fontSize: 12, color: '#777' },

  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eee' },
  avatarSmallPlaceholder: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#00c7be', justifyContent: 'center', alignItems: 'center'
  },
  postAuthorName: { marginLeft: 8, fontSize: 16, fontWeight: 'bold' },
  postImage: { width: '100%', height: 180, resizeMode: 'cover' },
  postContent: { fontSize: 15, marginHorizontal: 12, marginVertical: 8 },
  postFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 12, borderTopWidth: 1, borderColor: '#eee'
  },
  footerStats: { flexDirection: 'row', alignItems: 'center' },
  footerText: { marginHorizontal: 4, fontSize: 12, color: '#555' },
  postDate: { fontSize: 12, color: '#777' },

  emptyText: { textAlign: 'center', marginTop: 20, color: '#999' },
  emptyTextContainer: { flex: 1, justifyContent: 'center' },
});




