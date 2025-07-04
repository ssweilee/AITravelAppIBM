import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUserProfile } from '../utils/ProfileInfo'; 

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const currentToken = await AsyncStorage.getItem('token');
      if (!currentToken) {
        setUser(null);
        return null;
      }

      const userData = await fetchUserProfile();
      if (userData?.success && userData.user) {
        setUser(userData.user);
        await AsyncStorage.setItem('userInfoCache', JSON.stringify(userData.user));
        return userData.user;
      } else {
        console.error("Failed to refresh user:", userData.error);
        if (userData.error?.message === 'Invalid token' || userData.error?.message === 'No auth token found') {
          console.log("Invalid token detected, logging out.");
          await logout();
        } else {
        setUser(null);
        }
        return null;
      }
    } catch (error) {
      console.error("An unexpected error occurred while refreshing user:", error);
      setUser(null);
      return null;
    }
  }, [logout]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
         const currentToken = await AsyncStorage.getItem('token');
         if (currentToken) {
           await refreshUser();
         }
      } catch (e) {
        console.error("Failed to initialize app state:", e);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initializeApp();
  }, [refreshUser]);

  const login = async (newToken, newUserInfo) => {
    await AsyncStorage.setItem('token', newToken);
    if (newUserInfo) {
      await AsyncStorage.setItem('userInfoCache', JSON.stringify(newUserInfo));
      setUser(newUserInfo);
    } else {
      await refreshUser(); 
    }
    setToken(newToken);
  };
  
  const logout = useCallback(async () => { 
   await AsyncStorage.removeItem('token');
   await AsyncStorage.removeItem('userInfoCache');
   setToken(null);
   setUser(null);
 }, []);

  const value = { user, token, isLoading, login, logout, refreshUser };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};