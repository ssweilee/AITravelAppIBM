// contexts/NotificationsContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import { getSocket } from '../utils/socket';

const NotificationsContext = createContext();

export const NotificationsProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading]     = useState(true);

  const clearUnreadCount = () => setUnreadCount(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('No token available when fetching unread count');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text(); // read raw response
      if (!res.ok) {
        console.warn('Unread count fetch failed', res.status, text);
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse unread count JSON:', text);
        return;
      }

      if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      } else {
        console.warn('Unexpected shape for unreadCount:', data);
      }
    } catch (e) {
      console.warn('Error fetching unread count', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();

    let socketInstance;
    (async () => {
      socketInstance = await getSocket();

      socketInstance.on('notification', (payload) => {
        if (payload.unreadCount != null) setUnreadCount(payload.unreadCount);
      });
      socketInstance.on('notification-read', (payload) => {
        if (payload.unreadCount != null) setUnreadCount(payload.unreadCount);
      });
      socketInstance.on('notifications-cleared', (payload) => {
        if (payload.unreadCount != null) setUnreadCount(payload.unreadCount);
      });
      socketInstance.on('bootstrap-unread-count', ({ unreadCount: bc }) => {
        if (typeof bc === 'number') setUnreadCount(bc);
      });
    })();

    return () => {
      if (socketInstance) {
        socketInstance.off('notification');
        socketInstance.off('notification-read');
        socketInstance.off('notifications-cleared');
        socketInstance.off('bootstrap-unread-count');
      }
    };
  }, [fetchUnreadCount]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, setUnreadCount, fetchUnreadCount, clearUnreadCount, isLoading }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);

