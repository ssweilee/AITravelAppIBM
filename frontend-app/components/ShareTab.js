// components/ShareTab.js
import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import debounce from 'lodash/debounce';
import { shareToChat } from '../services/chatService';
import { API_BASE_URL } from '../config';

export default function ShareTab({ visible, onClose, postId }) {
  const [index, setIndex]                 = useState(0);
  const [routes]                         = useState([
    { key: 'recent', title: 'Recent' },
    { key: 'search', title: 'Followers' },
  ]);
  const [recentChats, setRecentChats]     = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [query, setQuery]                 = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  // ─── On modal open: load userId & token, fetch chats, annotate names ───────────────
  useEffect(() => {
    console.log('[ShareTab] useEffect visible:', visible);
    if (!visible) return;

    (async () => {
      try {
        console.log('[ShareTab] Loading userId from AsyncStorage…');
        const id = await AsyncStorage.getItem('userId');
        console.log('[ShareTab] Loaded userId:', id);
        setCurrentUserId(id);

        console.log('[ShareTab] Loading token from AsyncStorage…');
        const token = await AsyncStorage.getItem('token');
        console.log('[ShareTab] Loaded token:', token ? '✔︎ token exists' : '✘ no token');

        const url = `${API_BASE_URL}/api/chats`;
        console.log('[ShareTab] Fetching recent chats from:', url);
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('[ShareTab] fetch response status:', res.status);

        let chats;
        try {
          chats = await res.json();
          console.log('[ShareTab] Raw chats JSON:', chats);
        } catch (parseErr) {
          console.error('[ShareTab] Failed to parse chats JSON:', parseErr);
          return;
        }

        // Annotate each 1:1 chat with otherName
        const withNames = chats.map(chat => {
          if (chat.chatName || !Array.isArray(chat.members)) {
            return chat;
          }
          const other = chat.members.find(u => u._id.toString() !== id);
          const otherName = other
            ? `${other.firstName} ${other.lastName}`
            : 'Unnamed Chat';
          return { ...chat, otherName };
        });
        console.log('[ShareTab] Annotated chats:', withNames);

        setRecentChats(withNames);
        setQuery('');
        setSearchResults([]);
      } catch (err) {
        console.error('[ShareTab] Error in effect:', err);
      }
    })();
  }, [visible]);

  // Debounced follower search (unchanged)
  const rawFetchFollowers = async text => {
    console.log('[ShareTab] Searching followers for:', text);
    try {
      const token = await AsyncStorage.getItem('token');
      const res   = await fetch(
        `${API_BASE_URL}/api/users/followers?search=${encodeURIComponent(text)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('[ShareTab] followers fetch status:', res.status);
      if (res.ok) {
        const { users = [] } = await res.json();
        console.log('[ShareTab] followers result:', users);
        setSearchResults(users);
      }
    } catch (err) {
      console.error('[ShareTab] Error fetching followers:', err);
    }
  };
  const debouncedFetchFollowers = useRef(debounce(rawFetchFollowers, 300)).current;

  // Share into existing or new chat (unchanged)
  const onSelect = async item => {
    console.log('[ShareTab] onSelect item:', item);
    try {
      const token = await AsyncStorage.getItem('token');
      let chatId  = item._id;

      if (index === 1) {
        console.log('[ShareTab] Creating/finding 1:1 chat with userId:', item._id);
        const res = await fetch(`${API_BASE_URL}/api/chats`, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            Authorization:  `Bearer ${token}`
          },
          body: JSON.stringify({ otherUserId: item._id })
        });
        console.log('[ShareTab] createChat response status:', res.status);
        const json = await res.json();
        console.log('[ShareTab] createChat response JSON:', json);
        chatId = json.chat?._id || json._id;
      }

      console.log('[ShareTab] Sharing postId', postId, 'to chatId', chatId);
      await shareToChat(chatId, 'post', postId);
    } catch (err) {
      console.error('[ShareTab] Share failed:', err);
    }
    onClose();
  };

  // Unified list item renderer
  const renderItem = ({ item }) => {
    let title = '';
    if (item.members) {
      title = item.chatName || item.otherName || 'Unnamed Chat';
    } else {
      title = item.firstName && item.lastName
        ? `${item.firstName} ${item.lastName}`
        : item.username;
    }
    console.log('[ShareTab] renderItem title:', title, 'for item:', item);
    return (
      <TouchableOpacity style={styles.item} onPress={() => onSelect(item)}>
        <Text style={styles.itemText}>{title}</Text>
      </TouchableOpacity>
    );
  };

  const RecentRoute = () => (
    <FlatList
      data={recentChats}
      keyExtractor={c => c._id.toString()}
      renderItem={renderItem}
      ListEmptyComponent={<Text style={styles.empty}>No recent chats</Text>}
    />
  );

  const SearchRoute = () => (
    <View style={{ flex: 1 }}>
      <TextInput
        placeholder="Search followers…"
        value={query}
        onChangeText={text => {
          setQuery(text);
          debouncedFetchFollowers(text);
        }}
        style={styles.searchInput}
      />
      <FlatList
        data={searchResults}
        keyExtractor={u => u._id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No followers found</Text>}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.header}>Share Post</Text>
          <TabView
            navigationState={{ index, routes }}
            renderScene={SceneMap({ recent: RecentRoute, search: SearchRoute })}
            onIndexChange={setIndex}
            initialLayout={{ width: Dimensions.get('window').width }}
            renderTabBar={props => (
              <TabBar
                {...props}
                style={styles.tabBar}
                indicatorStyle={styles.indicator}
              />
            )}
          />
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:      { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' },
  container:    { width:'80%', height:'70%', backgroundColor:'#fff', borderRadius:8, overflow:'hidden' },
  header:       { padding:16, fontSize:18, fontWeight:'600' },
  tabBar:       { backgroundColor:'#f5f5f5' },
  indicator:    { backgroundColor:'#007AFF' },
  item:         { padding:14, borderBottomWidth:1, borderColor:'#eee' },
  itemText:     { fontSize:16 },
  empty:        { padding:20, textAlign:'center', color:'#888' },
  searchInput:  { padding:10, borderBottomWidth:1, borderColor:'#ccc', margin:12, borderRadius:6 },
  closeButton:  { padding:12, alignItems:'center' },
  closeText:    { color:'#007AFF', fontSize:16 }
});
