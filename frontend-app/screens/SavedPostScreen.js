// screens/SavedPostsScreen.js
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import PostCard from '../components/PostCard';
import TripCard from '../components/TripCard';

const SavedPostsScreen = () => {
  const [savedContent, setSavedContent] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleUnsavePost = (postId, isNowSaved) => {
    console.log('Post callback called:', { postId, isNowSaved }); // Debug log
    // If post was unsaved (isNowSaved = false), remove it from the list
    if (!isNowSaved) {
      setSavedContent(curr => curr.filter(item => !(item.contentType === 'post' && item._id === postId)));
    }
  };

  const handleUnsaveTrip = (tripId, isNowSaved) => {
    console.log('Trip callback called:', { tripId, isNowSaved }); // Debug log
    // If trip was unsaved (isNowSaved = false), remove it from the list
    if (!isNowSaved) {
      setSavedContent(curr => curr.filter(item => !(item.contentType === 'trip' && item._id === tripId)));
    }
  };

  useEffect(() => {
    const fetchSavedContent = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        
        // Fetch both saved posts and trips in parallel
        const [postsResponse, tripsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/interactions/saved/post`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_BASE_URL}/api/interactions/saved/trip`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const [postsData, tripsData] = await Promise.all([
          postsResponse.ok ? postsResponse.json() : [],
          tripsResponse.ok ? tripsResponse.json() : []
        ]);

        // Combine and add type identifiers
        const allSavedContent = [
          ...postsData.map(item => ({ ...item, contentType: 'post' })),
          ...tripsData.map(item => ({ ...item, contentType: 'trip' }))
        ];

        // Sort by creation date (most recent first)
        allSavedContent.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setSavedContent(allSavedContent);
      } catch (e) {
        console.error('Failed to load saved content:', e);
        setSavedContent([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSavedContent();
  }, []);

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }
  if (!Array.isArray(savedContent) || savedContent.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>No saved content yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      {savedContent.map(item => {
        if (item.contentType === 'trip') {
          return (
            <TripCard
              key={`trip-${item._id}`}
              trip={item}
              onToggleSave={handleUnsaveTrip}
            />
          );
        } else {
          return (
            <PostCard
              key={`post-${item._id}`}
              post={item}
              onToggleSave={handleUnsavePost}
            />
          );
        }
      })}
    </ScrollView>
  );
};

export default SavedPostsScreen;