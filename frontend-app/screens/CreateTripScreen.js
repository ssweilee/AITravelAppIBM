import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_BASE_URL } from '../config';

const CreateTripScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Content selection
  const [userPosts, setUserPosts] = useState([]);
  const [userItineraries, setUserItineraries] = useState([]);
  const [selectedPosts, setSelectedPosts] = useState([]);
  const [selectedItineraries, setSelectedItineraries] = useState([]);
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    fetchUserContent();
  }, []);

  const fetchUserContent = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      // Fetch user's posts
      const postsResponse = await fetch(`${API_BASE_URL}/api/posts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const postsData = await postsResponse.json();
      
      // Fetch user's itineraries
      const itinerariesResponse = await fetch(`${API_BASE_URL}/api/itineraries/mine`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const itinerariesData = await itinerariesResponse.json();

      if (postsResponse.ok) setUserPosts(postsData);
      if (itinerariesResponse.ok) setUserItineraries(itinerariesData);
      
    } catch (error) {
      console.error('Error fetching user content:', error);
    } finally {
      setContentLoading(false);
    }
  };

  const handleDateChange = (event, selectedDate, type) => {
    if (type === 'start') {
      setShowStartPicker(false);
      if (selectedDate) {
        setStartDate(selectedDate);
        // If start date is after end date, update end date
        if (selectedDate >= endDate) {
          const newEndDate = new Date(selectedDate);
          newEndDate.setDate(newEndDate.getDate() + 1);
          setEndDate(newEndDate);
        }
      }
    } else {
      setShowEndPicker(false);
      if (selectedDate) setEndDate(selectedDate);
    }
  };

  const togglePostSelection = (postId) => {
    setSelectedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  const toggleItinerarySelection = (itineraryId) => {
    setSelectedItineraries(prev => 
      prev.includes(itineraryId) 
        ? prev.filter(id => id !== itineraryId)
        : [...prev, itineraryId]
    );
  };

  const handleCreateTrip = async () => {
    if (!title.trim() || !destination.trim() || !budget.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (endDate <= startDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    if (isNaN(parseFloat(budget)) || parseFloat(budget) < 0) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/trips/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          destination: destination.trim(),
          description: description.trim(),
          budget: parseFloat(budget),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          selectedPosts,
          selectedItineraries,
          isPublic
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('Success', 'Trip created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to create trip');
      }
    } catch (error) {
      console.error('Error creating trip:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Trip</Text>
        <TouchableOpacity 
          onPress={handleCreateTrip}
          disabled={loading}
          style={[styles.createButton, loading && styles.createButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Details</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter trip title"
              maxLength={100}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Destination *</Text>
            <TextInput
              style={styles.input}
              value={destination}
              onChangeText={setDestination}
              placeholder="Where are you going?"
              maxLength={100}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Tell us about your trip..."
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Budget * ($)</Text>
            <TextInput
              style={styles.input}
              value={budget}
              onChangeText={setBudget}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dates</Text>
          
          <View style={styles.dateRow}>
            <View style={styles.dateContainer}>
              <Text style={styles.label}>Start Date *</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateContainer}>
              <Text style={styles.label}>End Date *</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.dateText}>{formatDate(endDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Privacy Setting */}
        <View style={styles.section}>
          <View style={styles.privacyRow}>
            <Text style={styles.label}>Make trip public</Text>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: '#ddd', true: '#007AFF' }}
            />
          </View>
        </View>

        {/* Content Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Content to Trip</Text>
          
          {contentLoading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <>
              {/* Posts Selection */}
              <View style={styles.contentSection}>
                <Text style={styles.contentTitle}>
                  Your Posts ({selectedPosts.length} selected)
                </Text>
                {userPosts.length === 0 ? (
                  <Text style={styles.emptyText}>No posts available</Text>
                ) : (
                  userPosts.map((post) => (
                    <TouchableOpacity
                      key={post._id}
                      style={[
                        styles.contentItem,
                        selectedPosts.includes(post._id) && styles.selectedItem
                      ]}
                      onPress={() => togglePostSelection(post._id)}
                    >
                      <View style={styles.contentInfo}>
                        <Text style={styles.contentText} numberOfLines={2}>
                          {post.content}
                        </Text>
                        <Text style={styles.contentDate}>
                          {new Date(post.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.checkbox}>
                        {selectedPosts.includes(post._id) && (
                          <Ionicons name="checkmark" size={16} color="#007AFF" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              {/* Itineraries Selection */}
              <View style={styles.contentSection}>
                <Text style={styles.contentTitle}>
                  Your Itineraries ({selectedItineraries.length} selected)
                </Text>
                {userItineraries.length === 0 ? (
                  <Text style={styles.emptyText}>No itineraries available</Text>
                ) : (
                  userItineraries.map((itinerary) => (
                    <TouchableOpacity
                      key={itinerary._id}
                      style={[
                        styles.contentItem,
                        selectedItineraries.includes(itinerary._id) && styles.selectedItem
                      ]}
                      onPress={() => toggleItinerarySelection(itinerary._id)}
                    >
                      <View style={styles.contentInfo}>
                        <Text style={styles.contentText} numberOfLines={1}>
                          {itinerary.title || itinerary.destination}
                        </Text>
                        <Text style={styles.contentDate}>
                          {new Date(itinerary.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.checkbox}>
                        {selectedItineraries.includes(itinerary._id) && (
                          <Ionicons name="checkmark" size={16} color="#007AFF" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Date Pickers - FIXED FOR BOTH PLATFORMS */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'calendar' : 'default'}
          onChange={(event, date) => handleDateChange(event, date, 'start')}
          minimumDate={new Date()}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'calendar' : 'default'}
          onChange={(event, date) => handleDateChange(event, date, 'end')}
          minimumDate={startDate}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateContainer: {
    flex: 0.48,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contentSection: {
    marginBottom: 20,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  selectedItem: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  contentInfo: {
    flex: 1,
    marginRight: 12,
  },
  contentText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  contentDate: {
    fontSize: 12,
    color: '#666',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
});

export default CreateTripScreen;