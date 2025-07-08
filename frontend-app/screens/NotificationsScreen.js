// screens/NotificationsScreen.js

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  Alert,
  Button
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import socket from '../utils/socket';
import { API_BASE_URL } from '../config';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const navigation                         = useNavigation();

  // Fetch existing notifications
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res   = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setNotifications(data);
      else console.warn('Failed to load notifications', data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete one notification
  const deleteNotification = useCallback(async (id) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res   = await fetch(`${API_BASE_URL}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications(ns => ns.filter(n => n._id !== id));
      } else {
        const err = await res.json();
        console.warn('Failed to delete notification:', err);
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, []);

  // Swipe action: red “Delete” button
  const renderRightActions = (id) => (
    <RectButton
      style={styles.deleteButton}
      onPress={() => {
        Alert.alert(
          'Delete Notification',
          'Are you sure you want to delete this notification?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteNotification(id) }
          ]
        );
      }}
    >
      <Text style={styles.deleteButtonText}>Delete</Text>
    </RectButton>
  );

  // Mark as read
  const markAsRead = async (id) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(ns =>
        ns.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    Alert.alert(
      'Clear All',
      'Are you sure you want to delete all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, clear', style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const res   = await fetch(`${API_BASE_URL}/api/notifications/clear`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) setNotifications([]);
              else console.warn('Failed to clear notifications');
            } catch (err) {
              console.error('Error clearing notifications:', err);
            }
          }
        }
      ]
    );
  };

  // Handle tap
  const handlePress = async (n) => {
    if (!n.isRead) await markAsRead(n._id);
    const token = await AsyncStorage.getItem('token');

    switch (n.entityType) {
      case 'Post': {
        try {
          const res  = await fetch(`${API_BASE_URL}/api/posts/${n.entityId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const post = await res.json();
          if (res.ok) navigation.navigate('PostDetail', { post });
          else console.warn('Failed to load post:', post);
        } catch (err) {
          console.error(err);
        }
        break;
      }
      case 'Custom':
        navigation.navigate('Chat', { chatId: n.entityId });
        break;
      default:
        console.warn('Unhandled notification type:', n.entityType);
    }
  };

  // Initial load, real-time subscribe, header button
  useEffect(() => {
    fetchNotifications();
    const onNotification = newNotif => {
      setNotifications(ns => [newNotif, ...ns]);
    };
    socket.on('notification', onNotification);

    navigation.setOptions({
      headerRight: () => <Button title="Clear All" onPress={clearAllNotifications} />
    });

    return () => {
      socket.off('notification', onNotification);
    };
  }, [navigation, deleteNotification]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!notifications.length) {
    return (
      <View style={styles.center}>
        <Text>No notifications</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={n => n._id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => {
        const time   = new Date(item.createdAt).toLocaleString();
        const avatar = item.sender?.profilePicture;

        return (
          <Swipeable renderRightActions={() => renderRightActions(item._id)}>
            <TouchableOpacity
              style={[styles.row, !item.isRead && styles.unread]}
              onPress={() => handlePress(item)}
            >
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.placeholder]}>
                  <Ionicons name="person" size={20} color="#fff" />
                </View>
              )}
              <View style={styles.content}>
                <Text style={styles.text}>{item.text}</Text>
                <Text style={styles.time}>{time}</Text>
              </View>
              <MaterialIcons
                name={item.isRead ? 'mark-email-read' : 'mark-email-unread'}
                size={24}
                color="#555"
              />
            </TouchableOpacity>
          </Swipeable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex:1, justifyContent:'center', alignItems:'center' },
  row: {
    flexDirection:'row',
    alignItems:'center',
    padding:12,
    borderBottomWidth:1,
    borderColor:'#eee',
    backgroundColor:'#fff'
  },
  unread:      { backgroundColor:'#eef' },
  avatar:      { width:40, height:40, borderRadius:20 },
  placeholder: { backgroundColor:'#888', justifyContent:'center', alignItems:'center' },
  content:     { flex:1, marginHorizontal:12 },
  text:        { fontSize:16 },
  time:        { fontSize:12, color:'#777', marginTop:4 },
  deleteButton: {
    backgroundColor: '#D11A2A',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginVertical: 4,
    borderRadius: 4
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
});








