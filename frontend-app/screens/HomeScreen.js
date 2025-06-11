import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FeedList from '../components/FeedList';

const HomeScreen = () => {
  const [refreshKey, setRefreshKey ] = useState(0);

  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Home Feed</Text>
      <FeedList refreshTrigger={refreshKey} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 20 }
});

export default HomeScreen;