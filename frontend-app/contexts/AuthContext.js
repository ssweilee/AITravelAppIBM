import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUserProfile } from '../utils/ProfileInfo'; 
import { NavigationContainerRefContext } from '@react-navigation/native';
import { getAvatarUrl } from '../utils/getAvatarUrl'; 

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigation = React.useContext(NavigationContainerRefContext);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => { 
   await AsyncStorage.removeItem('token');
   await AsyncStorage.removeItem('userInfoCache');
   setToken(null);
   setUser(null);
 }, []);

  const refreshUser = useCallback(async () => {
    try {
      let currentToken = await AsyncStorage.getItem('token');
      let refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!currentToken && !refreshToken) {
        setUser(null);
        if (navigation && navigation.reset) {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }
        return null;
      }
      if (!currentToken && refreshToken) {
        // Try to refresh JWT using refresh token
        console.log('Attempting to refresh token with refreshToken:', refreshToken);
        const res = await fetch(`${API_BASE_URL}/api/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        const data = await res.json();
        console.log('Refresh response:', data);
        if (res.ok && data.token) {
          currentToken = data.token;
          await AsyncStorage.setItem('token', currentToken);
          setToken(currentToken);
        } else {
          // Refresh failed, log out and go to Login
          await logout();
          setUser(null);
          if (navigation && navigation.reset) {
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }
          return null;
        }
      }
      if (!currentToken) {
        setUser(null);
        if (navigation && navigation.reset) {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }
        return null;
      }

      const userData = await fetchUserProfile(navigation);
      if (userData?.success && userData.user) {

        const refreshedUser = { ...userData.user }; 
        if (refreshedUser && refreshedUser.profilePicture) {
          refreshedUser.profilePicture = getAvatarUrl(refreshedUser.profilePicture);
        }
        
        setUser(refreshedUser); 
        await AsyncStorage.setItem('userInfoCache', JSON.stringify(refreshedUser));
        return refreshedUser;

      } else {
        console.error("Failed to refresh user:", userData.error);
        if (userData.error?.message === 'Invalid token' || userData.error?.message === 'No auth token found') {
          console.log("Invalid token detected, logging out.");
          await logout();
          if (navigation && navigation.reset) {
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }
        } else {
          setUser(null);
        }
        return null;
      }


{/**
  setUser(userData.user);
        await AsyncStorage.setItem('userInfoCache', JSON.stringify(userData.user));
        return userData.user;
      } else {
        console.error("Failed to refresh user:", userData.error);
        if (userData.error?.message === 'Invalid token' || userData.error?.message === 'No auth token found') {
          console.log("Invalid token detected, logging out.");
          await logout();
          if (navigation && navigation.reset) {
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }
        } else {
          setUser(null);
        }
        return null;
      }
  
  */}

        
    } catch (error) {
      console.error("An unexpected error occurred while refreshing user:", error);
      setUser(null);
      if (navigation && navigation.reset) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
      return null;
    }
  }, [logout, navigation]);

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
      const userToSet = { ...newUserInfo };
      if (userToSet && userToSet.profilePicture) {
        userToSet.profilePicture = getAvatarUrl(userToSet.profilePicture);
      }
      setUser(userToSet);
    await AsyncStorage.setItem('userInfoCache', JSON.stringify(userToSet));
    } else {
      await refreshUser(); 
    }
    setToken(newToken);
  };
  
  // Always redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && (!user || !token)) {
      if (navigation && navigation.reset) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    }
  }, [user, token, isLoading, navigation]);

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