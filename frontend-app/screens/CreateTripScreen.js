// screens/CreateTripScreen.js
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  Modal,
  FlatList,
  Switch,
  StyleSheet,
  Platform,
  StatusBar as RNStatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_BASE_URL } from '../config';

export default function CreateTripScreen({ navigation }) {
  // ─── Trip form state ───────────────────────────
  const [title, setTitle]             = useState('');
  const [destination, setDestination] = useState('');
  const [coverImage, setCoverImage]   = useState('');
  const [startDate, setStartDate]     = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [endDate, setEndDate]         = useState(new Date());
  const [showEndPicker, setShowEndPicker]     = useState(false);
  const [description, setDescription] = useState('');
  const [budget, setBudget]           = useState('');
  const [isPublic, setIsPublic]       = useState(true);

  // ─── Post-selection state ─────────────────────
  const [allPosts, setAllPosts]           = useState([]);
  const [chosenPosts, setChosenPosts]     = useState([]);
  const [postModalVisible, setPostModalVisible] = useState(false);

  // Fetch user's posts on mount
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/posts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllPosts(data);
      }
    })();
  }, []);

  // Toggle a post in the chosen list
  const togglePost = (postId) => {
    setChosenPosts(cp =>
      cp.includes(postId)
        ? cp.filter(id => id !== postId)
        : [...cp, postId]
    );
  };

  // Submit the new Trip
  const handleCreateTrip = async () => {
    if (!title || !destination || !budget) {
      alert('Please fill out title, destination, and budget');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      alert('End date must be after start date');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/trips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          destination,
          coverImage,
          startDate,
          endDate,
          description,
          budget: parseFloat(budget),
          isPublic,
          posts: chosenPosts,
          itineraries: []   // left blank for now
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Error creating trip');
      } else {
        alert('Trip created!');
        navigation.goBack();
      }
    } catch (err) {
      console.error(err);
      alert('Error creating trip');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            {
              paddingTop: Platform.OS === 'android'
                ? RNStatusBar.currentHeight
                : 40,
              paddingBottom: 80
            }
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Trip</Text>
            <View style={{ width: 50 }} />
          </View>

          {/* Form fields */}
          <TextInput
            style={styles.input}
            placeholder="Title"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={styles.input}
            placeholder="Destination"
            value={destination}
            onChangeText={setDestination}
          />
          <TextInput
            style={styles.input}
            placeholder="Cover Image URL"
            value={coverImage}
            onChangeText={setCoverImage}
          />

          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowStartPicker(true)}
          >
            <Text>
              Start Date: {startDate.toISOString().slice(0, 10)}
            </Text>
          </TouchableOpacity>
          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="default"
              onChange={(e, d) => {
                setShowStartPicker(false);
                d && setStartDate(d);
              }}
            />
          )}

          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowEndPicker(true)}
          >
            <Text>
              End Date: {endDate.toISOString().slice(0, 10)}
            </Text>
          </TouchableOpacity>
          {showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display="default"
              onChange={(e, d) => {
                setShowEndPicker(false);
                d && setEndDate(d);
              }}
            />
          )}

          <TextInput
            style={[styles.input, { minHeight: 80 }]}
            placeholder="Description"
            multiline
            value={description}
            onChangeText={setDescription}
          />
          <TextInput
            style={styles.input}
            placeholder="Budget"
            keyboardType="numeric"
            value={budget}
            onChangeText={setBudget}
          />

          <View style={styles.switchRow}>
            <Text>Public?</Text>
            <Switch value={isPublic} onValueChange={setIsPublic} />
          </View>

          {/* Buttons */}
          <View style={styles.actionsRow}>
            <Button
              title="Add Itinerary"
              onPress={() => {}}
            />
            <Button
              title="Add Post"
              onPress={() => setPostModalVisible(true)}
            />
          </View>

          {/* Selected Posts */}
          {chosenPosts.length > 0 && (
            <View style={{ marginVertical: 10 }}>
              <Text style={styles.sectionHeader}>Selected Posts:</Text>
              {chosenPosts.map(id => {
                const p = allPosts.find(x => x._id === id);
                return p
                  ? <Text key={id}>• {p.content.slice(0, 50)}…</Text>
                  : null;
              })}
            </View>
          )}

          <Button
            title="Create Trip"
            onPress={handleCreateTrip}
            color="#007bff"
          />
        </ScrollView>

        {/* Post Selection Modal */}
        <Modal visible={postModalVisible} animationType="slide">
          <View style={{ flex: 1, padding: 20 }}>
            <Text style={styles.modalHeader}>Select Posts</Text>
            <FlatList
              data={allPosts}
              keyExtractor={item => item._id}
              renderItem={({ item }) => {
                const sel = chosenPosts.includes(item._id);
                return (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => togglePost(item._id)}
                  >
                    <Text style={styles.modalItemText}>
                      {item.content.slice(0, 50)}…
                    </Text>
                    <Text style={styles.modalItemCheck}>
                      {sel ? '☑️' : '⬜'}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            <Button
              title="Done"
              onPress={() => setPostModalVisible(false)}
            />
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  backText: {
    fontSize: 18,
    width: 50
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    backgroundColor: '#fafbfc'
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20
  },
  sectionHeader: {
    fontWeight: 'bold',
    marginBottom: 6
  },
  modalHeader: {
    fontSize: 18,
    marginBottom: 10
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8
  },
  modalItemText: {
    flex: 1
  },
  modalItemCheck: {
    fontSize: 18
  }
});
