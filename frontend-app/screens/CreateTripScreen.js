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
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_BASE_URL } from '../config';
import SearchableCityDropdown from '../components/SearchableCityDropdown';
import { formatCityDisplay } from '../data/cities';
import { PREDEFINED_TAGS, searchTags } from '../data/tags';

const CreateTripScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [selectedDestination, setSelectedDestination] = useState(null); // Changed from destination string to city object
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSearch, setTagSearch] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);
  const MAX_VISIBLE_TAGS = 8;
  
  // Content selection
  const [userPosts, setUserPosts] = useState([]);
  const [userItineraries, setUserItineraries] = useState([]);
  const [selectedPosts, setSelectedPosts] = useState([]);
  const [selectedItineraries, setSelectedItineraries] = useState([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  //const [taggedUsers, setTaggedUsers] = useState([]); // Selected users to tag

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

const TagFriendsInput = ({ selectedUsers, setSelectedUsers }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [followings, setFollowings] = useState([]);
  const [matchedUsers, setMatchedUsers] = useState([]);

  useEffect(() => {
    const fetchFollowings = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/users/followings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok && Array.isArray(data)) {
          setFollowings(data);
        } else {
          console.error('Unexpected followings response:', data);
        }
      } catch (err) {
        console.error('Error fetching followings:', err);
      }
    };
    fetchFollowings();
  }, []);

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setMatchedUsers([]);
      return;
    }

    const filtered = followings.filter(
      (user) =>
        user.firstName?.toLowerCase().includes(query) ||
        user.lastName?.toLowerCase().includes(query)
    );

    setMatchedUsers(filtered);
  }, [searchQuery, followings]);

  const toggleUserSelection = (user) => {
    if (selectedUsers.some((u) => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter((u) => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>People</Text>
      <TextInput
        style={styles.input}
        placeholder="Tag friends (optional)"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* SelectedUser*/}
      <View style={styles.selectedList}>
        {selectedUsers.map((user) => (
          <View key={user._id} style={styles.selectedUserChip}>
            <Text style={styles.selectedUserText}>
              {user.firstName} {user.lastName}
            </Text>
            <TouchableOpacity onPress={() => toggleUserSelection(user)}>
              <Ionicons name="close-circle" size={18} color="red" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Search List */}
      {matchedUsers.length > 0 && (
        <View style={styles.list}>
          {matchedUsers.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={styles.userItem}
              onPress={() => toggleUserSelection(item)}
            >
              <Text style={styles.userName}>
                {item.firstName} {item.lastName}
              </Text>
              {selectedUsers.some((u) => u._id === item._id) && (
                <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
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

  const toggleTagSelecttion = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(prev => prev.filter(t => t !== tag));
    } else {
      if (selectedTags.length >= 6) {
        Alert.alert('Limit Reached', 'You can select up to 6 tags.');
        return;
      }
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const handleCreateTrip = async () => {
    // Updated validation to check for selectedDestination object
    if (!title.trim() || !selectedDestination || !budget.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (selectedTags.length < 3) {
      Alert.alert('Error', 'Please select at least 3 tags to describe your trip.');
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
          destination: formatCityDisplay(selectedDestination), // Send formatted string
          destinationData: selectedDestination, // Send full city object for future use
          description: description.trim(),
          tags: selectedTags.map(tag => tag.trim()).filter(tag => tag), // Split tags by comma and trim whitespace
          budget: parseFloat(budget),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          selectedPosts,
          selectedItineraries,
          isPublic,
          taggedUsers: selectedUsers.map(user => user._id),
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

  const filteredTags = PREDEFINED_TAGS.filter(tag =>
  tag.searchText.toLowerCase().includes(tagSearch.toLowerCase())
);

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

          {/* UPDATED: Replace TextInput with SearchableCityDropdown */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Destination *</Text>
            <SearchableCityDropdown
              selectedCity={selectedDestination}
              onCitySelect={setSelectedDestination}
              placeholder="Select your destination"
            />
          </View>

          {/* Tags Section */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Select at least 3 tags to help others discover your trip *</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search tags..."
              value={tagSearch}
              onChangeText={setTagSearch}
            />
            <View style={styles.tagContainer}>
              {(showAllTags || tagSearch.length > 0 
                  ? filteredTags 
                  : filteredTags.slice(0, MAX_VISIBLE_TAGS)
                ).map(tag => (
                <TouchableOpacity
                  key={tag.id}
                  onPress={() => toggleTagSelecttion(tag.tag)}
                  style={[
                    styles.tagChip,
                    selectedTags.includes(tag.tag) && styles.selectedChip
                  ]}
                >
                  <Text style={[
                    styles.tagText,
                    selectedTags.includes(tag.tag) && styles.selectedText
                  ]}>
                    {tag.tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Show "View More" button if there are more tags than visible */}
          {tagSearch.length === 0 && filteredTags.length > MAX_VISIBLE_TAGS && (
            <TouchableOpacity onPress={() => setShowAllTags(prev => !prev)}>
              <Text style={styles.viewMoreText}>
                {showAllTags ? 'Show Less ▲' : 'View More ▼'}
              </Text>
            </TouchableOpacity>
          )}

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
            <TagFriendsInput
  selectedUsers={selectedUsers}
  setSelectedUsers={setSelectedUsers}
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

      {/* iOS Modal for Start Date */}
{Platform.OS === 'ios' && showStartPicker && (
  <View style={{
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  }}>
    <DateTimePicker
      value={startDate}
      mode="date"
      display="spinner"
      onChange={(event, selectedDate) => {
        if (selectedDate) {
          setStartDate(selectedDate);
          if (selectedDate >= endDate) {
            const newEndDate = new Date(selectedDate);
            newEndDate.setDate(newEndDate.getDate() + 1);
            setEndDate(newEndDate);
          }
        }
      }}
    />
    <TouchableOpacity
      onPress={() => setShowStartPicker(false)}
      style={{ alignSelf: 'flex-end', padding: 10 }}
    >
      <Text style={{ color: '#007AFF', fontWeight: '600' }}>Done</Text>
    </TouchableOpacity>
  </View>
)}

    {/* iOS Modal for End Date */}
    {Platform.OS === 'ios' && showEndPicker && (
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: 16,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
      }}>
        <DateTimePicker
          value={endDate}
          mode="date"
          display="spinner"
          onChange={(event, selectedDate) => {
            if (selectedDate) setEndDate(selectedDate);
          }}
        />
        <TouchableOpacity
          onPress={() => setShowEndPicker(false)}
          style={{ alignSelf: 'flex-end', padding: 10 }}
        >
          <Text style={{ color: '#007AFF', fontWeight: '600' }}>Done</Text>
        </TouchableOpacity>
      </View>
    )}

      {/* Date Pickers */}
      {Platform.OS === 'andriod' && showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display='default'
          onChange={(event, date) => handleDateChange(event, date, 'start')}
          minimumDate={new Date()}
        />
      )}

      {Platform.OS === 'andriod' && showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display='default'
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
  sublabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
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
    borderColor: '#ccc',
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
    borderColor: '#ccc',
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
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 2,
  },
  selectedChip: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tagText: {
    fontSize: 14,
    color: '#333',
  },
  selectedText: {
    color: '#fff',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 14,
  },
  viewMoreText: {
    color: '#333',
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 12,
  },
  selectedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 10,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e1eaff',
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 8,
    borderRadius: 20,
  },
  selectedUserText: {
    marginRight: 6,
    fontSize: 14,
  },
  userItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default CreateTripScreen;