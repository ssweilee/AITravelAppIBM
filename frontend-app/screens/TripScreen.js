// screens/TripScreen.js
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  KeyboardAvoidingView,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Button,
  StyleSheet,
  Platform,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

export default function TripScreen({ route, navigation }) {
  const { tripId, view } = route.params;
  const [trip, setTrip]               = useState(null);
  const [comments, setComments]       = useState([]);
  const [newComment, setNewComment]   = useState('');
  const [loadingComments, setLoading] = useState(true);
  const [posting, setPosting]         = useState(false);

  // 1) Fetch trip details
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      const res   = await fetch(`${API_BASE_URL}/api/trips/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setTrip(await res.json());
    })();
  }, [tripId]);

  // 2) Fetch comments once trip is loaded
  useEffect(() => {
    if (!trip) return;
    (async () => {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const res   = await fetch(
        `${API_BASE_URL}/api/trips/${tripId}/comments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) setComments(await res.json());
      setLoading(false);
    })();
  }, [trip]);

  // 3) Post a new comment
  const submitComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    const token = await AsyncStorage.getItem('token');
    const res   = await fetch(
      `${API_BASE_URL}/api/trips/${tripId}/comments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: newComment })
      }
    );
    if (res.ok) {
      const comment = await res.json();
      setComments([comment, ...comments]);
      setNewComment('');
    }
    setPosting(false);
  };

  if (!trip) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.container}>
          {/* Trip title */}
          <Text style={styles.title}>{trip.title}</Text>

          {/* Itinerary vs Posts */}
          {view === 'itinerary' ? (
            trip.itineraries?.length ? (
              <FlatList
                data={trip.itineraries}
                keyExtractor={i => i._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.itemBox}
                    onPress={() =>
                      navigation.navigate('ItineraryDetail', { itineraryId: item._id })
                    }
                  >
                    <Text style={styles.itemText}>{item.title}</Text>
                    <Text style={styles.itemSub}>{item.date}</Text>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <Text>No itinerary yet.</Text>
            )
          ) : trip.posts?.length ? (
  <FlatList
      data={trip.posts}
      keyExtractor={p => p._id.toString()}          // ensure keys are strings
      renderItem={({ item }) => (
      <TouchableOpacity
          key={item._id}                             // explicit key
          style={styles.itemBox}
          onPress={() => navigation.navigate('PostDetail', { post: item })}
     >
          <Text style={styles.itemText}>
            {(item.content || '').slice(0, 50)}…      
          </Text>
      </TouchableOpacity>
      )}
  />
) : (
  <Text>No posts yet.</Text>
)}

          {/* Comments */}
          <Text style={styles.commentsHeader}>Comments</Text>
          {loadingComments ? (
            <ActivityIndicator />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={c => c._id}
              renderItem={({ item }) => (
                <View style={styles.commentBox}>
                  <Text style={styles.commentAuthor}>
                    {item.userId.firstName} {item.userId.lastName}
                  </Text>
                  <Text>{item.content}</Text>
                </View>
              )}
              ListEmptyComponent={<Text>No comments yet.</Text>}
            />
          )}

          {/* New comment input */}
          <View style={[styles.inputBox, styles.inputSafe]}>
            <TextInput
              style={styles.input}
              placeholder="Write a comment…"
              value={newComment}
              onChangeText={setNewComment}
            />
            <Button
              title={posting ? 'Posting…' : 'Post'}
              onPress={submitComment}
              disabled={posting}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, padding: 16 },
  title:          { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  itemBox:        {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    marginVertical: 6
  },
  itemText:       { fontSize: 16 },
  itemSub:        { fontSize: 12, color: '#666', marginTop: 4 },
  commentsHeader: { fontSize: 18, fontWeight: 'bold', marginTop: 20 },
  commentBox:     {
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingVertical: 8
  },
  commentAuthor:  { fontWeight: 'bold', marginBottom: 4 },
  inputBox:       {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginRight: 8
  },
  inputSafe: {
    paddingBottom: Platform.OS === 'android' ? 20 : 0
  }
});
