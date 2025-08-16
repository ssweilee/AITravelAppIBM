// screens/NotificationsScreen.js

import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { getSocket } from '../utils/socket';
import { API_BASE_URL } from '../config';
import { useNotifications } from '../contexts/NotificationsContext';
import { getAvatarUrl } from '../utils/getAvatarUrl';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const { setUnreadCount } = useNotifications();
  const { width } = useWindowDimensions();
  const HORIZONTAL_INSET = 16;
  const cardWidth = width - HORIZONTAL_INSET * 2;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setNotifications(data);
      else console.warn('Load failed', data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteNotification = useCallback(
    async (id) => {
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/notifications/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setNotifications((ns) => ns.filter((n) => n._id !== id));
          if (typeof data.unreadCount === 'number') setUnreadCount(data.unreadCount);
        } else {
          console.warn('Delete failed', data);
        }
      } catch (e) {
        console.error(e);
      }
    },
    [setUnreadCount]
  );

  const markAsRead = async (id) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNotifications((ns) =>
          ns.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        if (typeof data.unreadCount === 'number') setUnreadCount(data.unreadCount);
      } else {
        console.warn('Mark read failed', data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const performDeleteAll = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      // CORRECTED endpoint: clear-all
      const res = await fetch(`${API_BASE_URL}/api/notifications/clear-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {}
      if (res.ok) {
        setNotifications([]);
        setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
      } else {
        console.warn('Clear all failed', res.status, data);
        fetchNotifications();
      }
    } catch (e) {
      console.error(e);
      fetchNotifications();
    }
  }, [fetchNotifications, setUnreadCount]);

  const clearAllNotifications = () =>
    Alert.alert('Clear All', 'Are you sure you want to delete all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, clear', style: 'destructive', onPress: performDeleteAll },
    ]);

  const handlePress = async (n) => {
    if (!n.isRead) await markAsRead(n._id);
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    try {
      // Follow notification should go to the profile of the sender
      if (n.type === 'follow') {
        const targetUserId =
          n.sender && typeof n.sender === 'object' ? n.sender._id : n.sender;
        if (targetUserId) {
          navigation.navigate('UserProfile', { userId: targetUserId });
          return;
        }
      }

      switch (n.entityType) {
        case 'Post': {
          const res = await fetch(`${API_BASE_URL}/api/posts/${n.entityId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const post = await res.json();
          if (res.ok) navigation.navigate('PostDetail', { post });
          else console.warn('Load post failed', post);
          break;
        }
        case 'Itinerary': {
          try {
            const res = await fetch(`${API_BASE_URL}/api/itineraries/detail/${n.entityId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const itinerary = await res.json();
            if (res.ok) {
              navigation.navigate('ItineraryDetail', { itinerary });
            } else {
              console.warn('Load itinerary failed', itinerary);
            }
          } catch (e) {
            console.error('Error fetching itinerary for notification:', e);
          }
          break;
        }

        case 'Trip': {
          const res = await fetch(`${API_BASE_URL}/api/trips/${n.entityId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const trip = await res.json();
          if (res.ok) navigation.navigate('TripDetail', { trip });
          else console.warn('Load trip failed', trip);
          break;
        }
        case 'Custom': {
          navigation.navigate('Chat', { chatId: n.entityId });
          break;
        }
        default: {
          console.warn('Unhandled notification entityType/type', n.entityType, n.type);
        }
      }
    } catch (e) {
      console.error('handlePress error:', e);
    }
  };

  // Inline header with clear all button
  const renderHeader = () => (
    <View style={styles.clearAllContainer}>
      <TouchableOpacity onPress={clearAllNotifications} style={styles.clearAllButton}>
        <Text style={styles.clearAllButtonText}>Clear All</Text>
      </TouchableOpacity>
    </View>
  );

  useEffect(() => {
    fetchNotifications();
    let socket;
    (async () => {
      socket = await getSocket();
      const handlers = {
        notification: (p) => {
          const newNotif = p.payload || p;
          setNotifications((ns) => [newNotif, ...ns]);
          if (typeof p.unreadCount === 'number') setUnreadCount(p.unreadCount);
        },
        'notification-read': (p) => {
          if (p.notificationId) {
            setNotifications((ns) =>
              ns.map((n) => (n._id === p.notificationId ? { ...n, isRead: true } : n))
            );
          }
          if (typeof p.unreadCount === 'number') setUnreadCount(p.unreadCount);
        },
        'notifications-cleared': (p) => {
          setNotifications([]);
          if (typeof p.unreadCount === 'number') setUnreadCount(p.unreadCount);
        },
        'notification-deleted': (p) => {
          if (p.notificationId)
            setNotifications((ns) => ns.filter((n) => n._id !== p.notificationId));
          if (typeof p.unreadCount === 'number') setUnreadCount(p.unreadCount);
        },
        'bootstrap-unread-count': ({ unreadCount: bc }) => {
          if (typeof bc === 'number') setUnreadCount(bc);
        },
      };
      Object.entries(handlers).forEach(([e, fn]) => socket.on(e, fn));
    })();
    return () => {
      getSocket()
        .then((s) => {
          [
            'notification',
            'notification-read',
            'notifications-cleared',
            'notification-deleted',
            'bootstrap-unread-count',
          ].forEach((e) => s.off(e));
        })
        .catch(() => {});
    };
  }, [fetchNotifications, setUnreadCount]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={clearAllNotifications} style={styles.headerClearBtn}>
          <Text style={styles.headerClearText}>Clear All</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, clearAllNotifications]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No notifications yet.</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const time = new Date(item.createdAt).toLocaleString();
    const avatar = item.sender?.profilePicture;
    return (
      <View style={[styles.cardWrapper, { paddingHorizontal: HORIZONTAL_INSET }]}>
        <Swipeable
          renderRightActions={() => (
            <RectButton
              style={styles.deleteButton}
              onPress={() =>
                Alert.alert('Delete Notification', 'Are you sure?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteNotification(item._id) },
                ])
              }
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </RectButton>
          )}
        >
          <View style={[styles.card, !item.isRead && styles.unreadCard, { width: cardWidth }]}>
            <Pressable onPress={() => handlePress(item)} style={styles.innerRow}>
              <View style={styles.avatarContainer}>
                {avatar ? (
                  <Image
                  source={{ uri: getAvatarUrl(avatar) }}
                  style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.placeholder]}>
                    <Ionicons name="person" size={20} color="#fff" />
                  </View>
                )}
                {!item.isRead && <View style={styles.unreadDot} />}
              </View>
              <View style={styles.content}>
                <Text style={styles.text} numberOfLines={2}>
                  {item.text}
                </Text>
                <Text style={styles.time}>{time}</Text>
              </View>
            </Pressable>
          </View>
        </Swipeable>
      </View>
    );
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <FlatList
      data={notifications}
      keyExtractor={(n) => n._id}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7fa' },
  cardWrapper: { marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    position: 'relative',
  },
  unreadCard: { borderLeftWidth: 4, borderLeftColor: '#00c7be' },
  innerRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eee' },
  placeholder: { backgroundColor: '#bbb', justifyContent: 'center', alignItems: 'center' },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00c7be',
    borderWidth: 2,
    borderColor: '#fff',
  },
  content: { flex: 1, paddingRight: 8 },
  text: { fontSize: 15, color: '#1f2937', marginBottom: 4, fontWeight: '500' },
  time: { fontSize: 12, color: '#8a94a6' },
  emptyContainer: { marginTop: 80, alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 16, color: '#666' },
  headerClearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    marginRight: 8,
  },
  headerClearText: { color: '#fff', fontWeight: '600' },
  deleteButton: {
    backgroundColor: '#D11A2A',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginVertical: 4,
    borderRadius: 8,
  },
  deleteButtonText: { color: '#fff', fontWeight: 'bold' },
  clearAllContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  clearAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#d32f2f',
    borderRadius: 8,
  },
  clearAllButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});









