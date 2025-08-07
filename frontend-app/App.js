// App.js

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';

import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import SignupDetailsScreen from './screens/SignupDetailsScreen';
import InterestScreen from './screens/InterestScreen';
import ProfileScreen from './screens/ProfileScreen';
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import ChatScreen from './screens/ChatScreen';
import PostDetailScreen from './screens/PostDetailScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import MessagesScreen from './screens/MessagesScreen';
import CreateGroupChatScreen from './screens/CreateGroupChatScreen';
import ChatSettingScreen from './screens/ChatSettingScreen';
import GroupChatMembersScreen from './screens/GroupChatMembersScreen';
import CreateItineraryScreen from './screens/CreateItineraryScreen';
import CreateTripScreen from './screens/CreateTripScreen';
import CreatePostScreen from './screens/CreatePostScreen';
import ControlPanelScreen from './screens/ControlPanelScreen';
import BookingsScreen from './screens/BookingsScreen';
import ItineraryDetailScreen from './screens/ItineraryDetailScreen';
import TripDetailScreen from './screens/TripDetailScreen';
import AccountSettingsScreen from './screens/AccountSettingsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import HotelSearchScreen from './screens/HotelSearchScreen';
import FlightSearchScreen from './screens/FlightSearchScreen';
import HotelListScreen from './screens/HotelListScreen';
import SavedPostsScreen from './screens/SavedPostScreen';
import AIAssistantScreen from './screens/AIAssistantScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function MainAppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          switch (route.name) {
            case 'Home':
              return <Ionicons name="home" size={size} color={color} />;
            case 'Search':
              return <Ionicons name="search" size={size} color={color} />;
            case 'Control Panel':
              return <MaterialIcons name="settings" size={size} color={color} />;
            case 'Bookings':
              return <FontAwesome name="calendar-check-o" size={size} color={color} />;
            case 'AI Assistant':
              return <Ionicons name="chatbubbles-outline" size={size} color={color} />;
            case 'Profile':
              return <Ionicons name="person" size={size} color={color} />;
            default:
              return null;
          }
        },
        tabBarActiveTintColor: '#00C7BE',
        tabBarInactiveTintColor: '#aaa',
        headerStyle: { backgroundColor: '#00C7BE' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' }
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Control Panel" component={ControlPanelScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="AI Assistant" component={AIAssistantScreen} options={{ title: 'AI Assistant' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ headerTitle: '' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        setInitialRoute(token ? 'Main' : 'Signup');
      } catch {
        setInitialRoute('Signup');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationsProvider>
            <NavigationContainer>
              <Stack.Navigator initialRouteName={initialRoute}>
                <Stack.Screen name="Signup" component={SignupScreen} />
                <Stack.Screen name="SignupDetails" component={SignupDetailsScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Interest" component={InterestScreen} />
                <Stack.Screen
                  name="Main"
                  component={MainAppTabs}
                  options={({ route }) => ({
                    headerShown: false,
                    gestureEnabled: false,
                    animation: route?.params?.fromMessages ? 'slide_from_left' : 'default',
                  })}
                />
                <Stack.Screen name="UserProfile" component={UserProfileScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="Chat" component={ChatScreen} />
                <Stack.Screen name="PostDetail" component={PostDetailScreen} />
                <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                <Stack.Screen
                  name="Messages"
                  component={MessagesScreen}
                  options={({ route }) => ({
                    animation: route?.params?.fromSettings ? 'slide_from_left' : 'default',
                  })}
                />
                <Stack.Screen name="Create New Group" component={CreateGroupChatScreen} />
                <Stack.Screen name="Chat Settings" component={ChatSettingScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Members" component={GroupChatMembersScreen} />
                <Stack.Screen name="CreateItinerary" component={CreateItineraryScreen} options={{ headerShown: false }} />
                <Stack.Screen name="CreateTrip" component={CreateTripScreen} options={{ headerShown: false }} />
                <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ headerShown: false }} />
                <Stack.Screen name="ItineraryDetail" component={ItineraryDetailScreen} options={{ headerShown: false }} />
                <Stack.Screen name="TripDetail" component={TripDetailScreen} options={{ headerShown: false }} />
                <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
                <Stack.Screen name="HotelSearch" component={HotelSearchScreen} />
                <Stack.Screen name="FlightSearch" component={FlightSearchScreen} />
                <Stack.Screen name="HotelList" component={HotelListScreen} />
                <Stack.Screen name="SavedPosts" component={SavedPostsScreen} options={{ title: 'Saved Content' }} />
              </Stack.Navigator>
            </NavigationContainer>
          </NotificationsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}