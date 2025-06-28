import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context'; // ✅ SafeAreaView for both platforms
import FeedList from '../components/FeedList';

const HomeScreen = ({ navigation }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      <View style={styles.topBar}>
        <View style={styles.logoContainer}>
          <Image source={require('../assets/icon.png')} style={styles.logo} />
          <Text style={styles.logoText}>AwayAway</Text>
        </View>

        <View style={styles.iconRow}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={28} color="black" />
          </TouchableOpacity>

          <View style={{ position: 'relative' }}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowDropdown(v => !v)}
            >
              <MaterialIcons name="add-circle-outline" size={28} color="black" />
            </TouchableOpacity>

            {showDropdown && (
              <View style={[styles.dropdown, { top: 38, right: -10 }]}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setShowDropdown(false);
                    navigation.navigate('CreateThread');
                  }}
                >
                  <MaterialIcons
                    name="forum"
                    size={22}
                    color="#222"
                    style={{ marginRight: 10 }}
                  />
                  <Text>Thread</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dropdownItem}>
                  <MaterialIcons
                    name="post-add"
                    size={22}
                    color="#222"
                    style={{ marginRight: 10 }}
                  />
                  <Text>Post</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setShowDropdown(false);
                    navigation.navigate('CreateItinerary');
                  }}
                >
                  <MaterialIcons
                    name="event-note"
                    size={22}
                    color="#222"
                    style={{ marginRight: 10 }}
                  />
                  <Text>Itinerary</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Messages')}
          >
            <Ionicons name="chatbubble-outline" size={28} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      <FeedList refreshTrigger={refreshKey} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
    marginRight: 8,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 12,
  },
  dropdown: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    paddingVertical: 8,
    zIndex: 100,
    minWidth: 120,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
});

export default HomeScreen;