import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ShareFriendsModal from '../../modals/ShareFriendsModal';

const dummyImage = 'https://via.placeholder.com/300x180.png?text=Trip+Cover';

const ItineraryList = ({ refreshTrigger, userId }) => {
  const [itineraries, setItineraries] = useState([]);

  const fetchItineraries = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const endpoint = userId
        ? `${API_BASE_URL}/api/itineraries/${userId}`
        : `${API_BASE_URL}/api/itineraries/mine`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setItineraries(data || []);
      } else {
        console.log('Failed to fetch itineraries:', data);
      }
    } catch (err) {
      console.error('Error fetching itineraries:', err);
    }
  };

  useEffect(() => {
    fetchItineraries();
  }, [refreshTrigger, userId]);

  const renderItem = ({ item }) => <ItineraryCard item={item} />;

  return (
    <FlatList
      data={itineraries}
      keyExtractor={(item) => item._id}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={<Text style={{ padding: 20 }}>No itineraries yet.</Text>}
      contentContainerStyle={{ paddingVertical: 10 }}
    />
  );
};

const ItineraryCard = ({ item }) => {
  const navigation = useNavigation();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(item.likes?.length || 0);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      setLiked(item.likes?.includes(payload.userId));
    })();
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
    day: 'numeric'
  });
  const end = new Date(item.endDate).toLocaleDateString('en-UK', {
    month: 'short',
    day: 'numeric'
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ItineraryDetail', { itinerary: item })}
      activeOpacity={0.9}
    >
      <Image source={{ uri: item.coverImage || dummyImage }} style={styles.image} />
      <View style={styles.cardContentRow}>
        <View style={styles.textColumn}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.destination}>{item.destination}</Text>
          <Text style={styles.dates}>{start} – {end}</Text>
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
    </TouchableOpacity>
    

  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#fbc',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  image: {
    width: '100%',
    height: 160,
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
    padding: 6,
    backgroundColor: '#eee',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repostMeta: {
    fontSize: 12,
    marginTop: 2,
    color: '#444',
  },
});

export default ItineraryList;