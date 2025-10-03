// components/profileComponents/ItineraryList.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ShareFriendsModal from '../../modals/ShareFriendsModal';
import MoreMenu from '../MoreMenu'; // path from profileComponents to MoreMenu.js
import { Feather } from '@expo/vector-icons';

const dummyImage = 'https://via.placeholder.com/300x180/1F2A37/FFFFFF?text=Trip+Cover';

const ItineraryList = ({ refreshTrigger, userId, onPress }) => {
  const [itineraries, setItineraries] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchItineraries = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('No auth token');
        setItineraries([]);
        setLoading(false);
        return;
      }

      let currentUserId;
      try {
        currentUserId = JSON.parse(atob(token.split('.')[1])).userId;
      } catch {
        currentUserId = null;
      }

      const endpoint =
        userId && userId !== currentUserId
          ? `${API_BASE_URL}/api/itineraries/${userId}`
          : `${API_BASE_URL}/api/itineraries/mine`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.warn('[ItineraryList] failed to parse JSON', e);
        data = null;
      }

      if (response.ok) {
        setItineraries(Array.isArray(data) ? data : []);
        setError(null);
      } else {
        setItineraries([]);
        setError(data?.message || `Fetch failed (${response.status})`);
      }
    } catch (err) {
      console.error('[ItineraryList] network error fetching itineraries:', err);
      setItineraries([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItineraries();
  }, [refreshTrigger, userId]);

  const handleDeleted = (deletedId) => {
    setItineraries((prev) => prev.filter((it) => it._id !== deletedId));
  };

  const renderItem = ({ item }) => (
    <ItineraryCard item={item} onPress={onPress} onDeleted={handleDeleted} />
  );

  return (
    <View>
      {loading && (
        <Text style={{ padding: 10, textAlign: 'center' }}>Loading itineraries...</Text>
      )}
      {error && (
        <Text style={{ color: 'red', padding: 10 }}>
          Error loading itineraries: {error}
        </Text>
      )}
      <FlatList
        data={itineraries}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={{ padding: 20 }}>
            {loading
              ? 'Still loading...'
              : error
              ? 'Unable to load itineraries.'
              : 'No itineraries yet.'}
          </Text>
        }
        contentContainerStyle={{ paddingVertical: 10 }}
      />
    </View>
  );
};

const ItineraryCard = ({ item, onPress, onDeleted }) => {
  const navigation = useNavigation();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(item.likes?.length || 0);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [userId, setUserId] = useState(null);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserId(payload.userId);
        setLiked(item.likes?.includes(payload.userId));
      } catch {}
    })();
  }, [item.likes]);

  useEffect(() => {
    setLikesCount(item.likes?.length || 0);
  }, [item.likes]);

  const toggleLike = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        `${API_BASE_URL}/api/interactions/itinerary/${item._id}/like`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const result = await res.json();
      if (res.ok) {
        setLiked(result.liked);
        setLikesCount(result.count);
      } else {
        console.error('Failed to toggle itinerary like:', result);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const start = new Date(item.startDate).toLocaleDateString('en-UK', {
    month: 'short',
    day: 'numeric',
  });
  const end = new Date(item.endDate).toLocaleDateString('en-UK', {
    month: 'short',
    day: 'numeric',
  });

  const handlePress = () => {
    if (typeof onPress === 'function') {
      onPress(item);
    } else {
      navigation.navigate('ItineraryDetail', { itinerary: item });
    }
  };

  const canDelete = userId && item.createdBy?._id?.toString() === userId?.toString();

  const performDelete = () => {
    Alert.alert(
      'Delete Itinerary',
      'Are you sure you want to delete this itinerary? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const res = await fetch(`${API_BASE_URL}/api/itineraries/${item._id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              const data = await res.json();
              if (res.ok) {
                setRemoved(true);
                onDeleted && onDeleted(item._id);
              } else {
                console.error('Failed to delete itinerary:', data);
                Alert.alert('Delete failed', data?.message || 'Unknown error');
              }
            } catch (err) {
              console.error('Error deleting itinerary:', err);
              Alert.alert('Delete failed', 'Network error');
            }
          },
        },
      ]
    );
  };

  if (removed) return null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {canDelete && (
        <View style={styles.dotContainer}>
          <TouchableOpacity onPress={() => setMenuVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="more-vertical" size={20} color="#FFFFFF"/>
          </TouchableOpacity>
        </View>
      )}

      <Image source={{ uri: item.coverImage || dummyImage }} style={styles.image} />
      <View style={styles.cardContentRow}>
        <View style={styles.textColumn}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.destination}>{item.destination}</Text>
          <Text style={styles.dates}>
            {start} – {end}
          </Text>
        </View>

        <View style={styles.buttonColumn}>
          <TouchableOpacity onPress={toggleLike} style={styles.actionButton}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={18}
              color={liked ? '#e74c3c' : '#555'}
            />
            <Text style={styles.repostMeta}>{likesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CreatePost', { itinerary: item })}
          >
            <Ionicons name="repeat-outline" size={20} color="#555" />
            <Text style={styles.repostMeta}>
              {item.repostCount?.length || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShareModalVisible(true)}
          >
            <Ionicons name="paper-plane-outline" size={20} color="#555" />
            <Text style={styles.repostMeta}>0</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ShareFriendsModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        selectedItinerary={item}
      />

      <MoreMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        options={[
          {
            label: 'Delete Itinerary',
            destructive: true,
            icon: <Feather name="trash-2" size={18} color="#d32f2f" />,
            onPress: performDelete,
          },
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E6F2F1',
    position: 'relative',
  },
  dotContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: '#1F2A37',
  },
  cardContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  textColumn: {
    flex: 1,
  },
  buttonColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  destination: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  dates: {
    fontSize: 13,
    color: '#777',
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E6EAF0',
  },
  repostMeta: {
    fontSize: 12,
    marginTop: 2,
    color: '#444',
  },
});

export default ItineraryList;