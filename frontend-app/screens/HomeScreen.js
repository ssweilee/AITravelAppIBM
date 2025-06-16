import React, { useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FeedList from '../components/FeedList';
import { Ionicons } from '@expo/vector-icons'; // Optional, for a message icon

const HomeScreen = () => {
  const navigation = useNavigation();
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Messages')} // 
          style={{ marginRight: 15 }}
        >
          <Ionicons name="chatbubbles-outline" size={24} color="black" />
        </TouchableOpacity>
      ),
      headerTitle: 'Home Feed'
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <FeedList refreshTrigger={refreshKey} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default HomeScreen;