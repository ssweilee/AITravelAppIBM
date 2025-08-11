import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Platform, StatusBar as RNStatusBar,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import TripDateModal from '../components/ItineraryComponents/TripDateModal';
import ShareModal from '../components/ItineraryComponents/ShareModal';
import DaySection from '../components/ItineraryComponents/DaySection';

const CreateItineraryScreen = ({ navigation, route }) => {
  const aiItinerary = route?.params?.aiItinerary;
  // Helper to parse date string to Date object
  const parseDate = (d) => {
    if (!d) return new Date();
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
      return new Date(d);
    }
    return new Date(d);
  };
  // If AI itinerary, get start/end from days
  let aiStart = new Date();
  let aiEnd = new Date();
  if (aiItinerary && Array.isArray(aiItinerary.days) && aiItinerary.days.length > 0) {
    aiStart = parseDate(aiItinerary.days[0].date);
    aiEnd = parseDate(aiItinerary.days[aiItinerary.days.length - 1].date);
  }
  const [title, setTitle] = useState(aiItinerary?.title || '');
  const [destination, setDestination] = useState(aiItinerary?.destination || '');
  const [description, setDescription] = useState(aiItinerary?.description || route?.params?.aiSuggestion || '');
  const [days, setDays] = useState(
    aiItinerary?.days && Array.isArray(aiItinerary.days) && aiItinerary.days.length > 0
      ? aiItinerary.days.map(day => ({
          date: '', // Always set to empty string so UI uses default date
          notes: day.notes || '',
          activities: Array.isArray(day.activities) && day.activities.length > 0
            ? day.activities.map(a => ({
                time: '',
                description: a.description || '',
                location: a.location || ''
              }))
            : [{ time: '', description: '', location: '' }]
        }))
      : [
          {
            date: '',
            notes: '',
            activities: [{ time: '', description: '', location: '' }],
          },
        ]
  );
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedFollowers, setSelectedFollowers] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [followings, setFollowings] = useState([]);
  // Use current date as startDate if AI itinerary is present
  const [startDate, setStartDate] = useState(aiItinerary ? new Date() : (aiItinerary && aiItinerary.days && aiItinerary.days.length > 0 ? aiStart : new Date()));
  const [endDate, setEndDate] = useState(aiItinerary && aiItinerary.days && aiItinerary.days.length > 0 ? aiEnd : new Date());
  const [showDateModal, setShowDateModal] = useState(false);
  const [expandedDayIndex, setExpandedDayIndex] = useState(0);

  const handleAddDay = () => {
    const updated = [
      ...days,
      { date: '', notes: '', activities: [{ time: '', description: '', location: '' }] },
    ];
    setDays(updated);
    setExpandedDayIndex(updated.length - 1);
    const newEndDate = new Date(startDate);
    newEndDate.setDate(newEndDate.getDate() + updated.length - 1);
    setEndDate(newEndDate);
  };

  const handleRemoveDay = (idx) => {
    if (days.length === 1) return;
    const updated = days.filter((_, i) => i !== idx);
    setDays(updated);
    if (expandedDayIndex === idx || idx === days.length - 1) {
      setExpandedDayIndex(Math.max(0, idx - 1));
    }
    const newEndDate = new Date(startDate);
    newEndDate.setDate(newEndDate.getDate() + updated.length - 1);
    setEndDate(newEndDate);
  };

  const handleDayChange = (idx, field, value) => {
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  };

  const handleAddActivity = (dayIdx) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? { ...d, activities: [...d.activities, { time: '', description: '', location: '' }] }
          : d
      )
    );
  };

  const handleRemoveActivity = (dayIdx, actIdx) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? { ...d, activities: d.activities.filter((_, j) => j !== actIdx) }
          : d
      )
    );
  };

  const handleActivityChange = (dayIdx, actIdx, field, value) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? {
              ...d,
              activities: d.activities.map((a, j) =>
                j === actIdx ? { ...a, [field]: value } : a
              ),
            }
          : d
      )
    );
  };

  const handleCreate = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('You must be logged in.');
        return;
      }

      console.log('JWT token used for create itinerary:', token);

      const payload = {
        title,
        description,
        destination,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days: days.map((d, i) => ({
          day: d.date || `Day ${i + 1}`,
          notes: d.notes,
          activities: d.activities,
        })),
        isPublic: true,
        tags: [],
        coverImage: '',
      };

      const response = await fetch(`${API_BASE_URL}/api/itineraries/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Create failed:', data);
        Alert.alert('Failed to create itinerary: ' + (data.message || 'Server error'));
      } else {
        Alert.alert('Itinerary created successfully!');
        navigation.goBack?.();
      }
    } catch (err) {
      console.error('Error submitting itinerary:', err);
      Alert.alert('Something went wrong.');
    }
  };

  useEffect(() => {
    const fetchFollowersAndFollowings = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok && data.user) {
            setFollowers(data.user.followers || []);
            setFollowings(data.user.followings || []);
          }
        }
      } catch {}
    };
    fetchFollowersAndFollowings();
  }, []);

  const toggleSelectFollower = (userId) => {
    setSelectedFollowers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleShare = () => setShareModalVisible(true);

  const handleShareConfirm = () => {
    setShareModalVisible(false);
    Alert.alert(
      'Shared',
      'Itinerary shared with: ' +
        followers
          .filter((f) => selectedFollowers.includes(f._id))
          .map((f) => `${f.firstName} ${f.lastName}`)
          .join(', ')
    );
    navigation.goBack?.();
  };

  const allShareableUsers = [
    ...followers,
    ...followings.filter((fw) => !followers.some((f) => f._id === fw._id)),
  ];

  const formatDateByOffset = (baseDate, offset) => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + offset);

    const dayName = date.toLocaleDateString('en-UK', { weekday: 'long' });
    const day = date.getDate();
    const suffix = getOrdinalSuffix(day);
    const month = date.toLocaleDateString('en-UK', { month: 'long' });

    return `${dayName}, ${day}${suffix} ${month}`;
  };

  const getOrdinalSuffix = (n) => {
    if (n > 3 && n < 21) return 'th';
    switch (n % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  };

  // Sync days when startDate or endDate changes, but only if not imported from AI
  useEffect(() => {
    // Only auto-generate days if days was initialized as a single blank day
    if (days.length === 1 && !days[0].activities[0].description && !days[0].activities[0].location) {
      if (startDate > endDate) {
        setEndDate(new Date(startDate));
        return;
      }
      const msPerDay = 1000 * 60 * 60 * 24;
      const numDays = Math.ceil((endDate - startDate) / msPerDay) + 1;
      if (numDays > 0) {
        const newDays = Array.from({ length: numDays }, (_, i) => {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          return {
            date: date.toISOString().split('T')[0],
            notes: '',
            activities: [{ time: '', description: '', location: '' }],
          };
        });
        setDays(newDays);
        setExpandedDayIndex(0);
      }
    }
  }, [startDate, endDate]);

  const formatTripDates = (start, end) => {
    const sameYear = start.getFullYear() === end.getFullYear();
    const options = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      ...(sameYear ? {} : { year: 'numeric' }),
    };
    return `${start.toLocaleDateString('en-UK', options)} – ${end.toLocaleDateString(
      'en-UK',
      options
    )}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 40 },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ zIndex: 2, elevation: 2 }}>
            <Ionicons name="arrow-back" size={26} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} pointerEvents="none">Create Itinerary</Text>
          <TouchableOpacity style={styles.saveButton} onPress={handleShare}>
            <Text style={styles.saveButtonText}>Share</Text>
          </TouchableOpacity>
        </View>

        <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
        <TextInput style={styles.input} placeholder="Destination" value={destination} onChangeText={setDestination} />
        <TextInput
          style={[styles.input, { minHeight: 60 }]}
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TouchableOpacity onPress={() => setShowDateModal(true)} style={styles.input}>
          <Text style={{ fontSize: 16 }}>
            Trip Dates: {formatTripDates(startDate, endDate)}
          </Text>
        </TouchableOpacity>

        {days.map((day, idx) => {
          const isExpanded = expandedDayIndex === idx;
          const displayDate = formatDateByOffset(startDate, idx);

          return (
            <DaySection
              key={idx}
              day={day}
              idx={idx}
              isExpanded={isExpanded}
              displayDate={displayDate}
              handleActivityChange={handleActivityChange}
              handleRemoveActivity={handleRemoveActivity}
              handleAddActivity={handleAddActivity}
              handleDayChange={handleDayChange}
              handleRemoveDay={handleRemoveDay}
              setExpandedDayIndex={setExpandedDayIndex}
              days={days}
              styles={styles}
            />
          );
        })}

        <TouchableOpacity style={styles.addDayBtn} onPress={handleAddDay}>
          <Ionicons name="add-circle" size={22} color="#00c7be" />
          <Text style={styles.addDayText}>Add Day</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitButton} onPress={handleCreate}>
          <Text style={styles.submitButtonText}>Create Itinerary</Text>
        </TouchableOpacity>
      </ScrollView>

      <TripDateModal
        visible={showDateModal}
        startDate={startDate}
        endDate={endDate}              // ← added
        setStartDate={setStartDate}
        setEndDate={setEndDate}        // ← added
        onClose={() => setShowDateModal(false)}
        styles={styles}
      />

      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        onConfirm={handleShareConfirm}
        users={allShareableUsers}
        selectedFollowers={selectedFollowers}
        toggleSelectFollower={toggleSelectFollower}
        contentType="itinerary"
        styles={shareModalStyles}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 10, backgroundColor: '#fff', flexGrow: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 20,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    fontSize: 16,
    backgroundColor: '#fafbfc',
  },
  sectionLabel: { fontWeight: 'bold', fontSize: 16, marginBottom: 8, marginTop: 8 },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333',
  },
  dayHeader: {
    padding: 10,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
    marginBottom: 6,
  },
  dayBlock: { marginBottom: 10, backgroundColor: '#f6f8fa', borderRadius: 8, padding: 8 },
  dateLabel: {
    fontSize: 16,
    padding: 12,
    backgroundColor: '#eee',
    borderRadius: 8,
    marginBottom: 14,
  },
  addDayBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  addDayText: { color: '#00c7be', fontWeight: 'bold', marginLeft: 6, fontSize: 16 },
  activitiesLabel: { fontWeight: 'bold', fontSize: 15, marginBottom: 4, marginTop: 2 },
  addActivityBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  addActivityText: { color: '#00c7be', fontWeight: 'bold', marginLeft: 6, fontSize: 15 },
  saveButton: { backgroundColor: '#00c7be', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '85%', maxHeight: '70%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  modalUserRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 2 },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#bbb', justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  checkboxBox: { marginLeft: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#bbb', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#00c7be', borderColor: '#00c7be' },
  modalCloseButton: { backgroundColor: '#00c7be', borderRadius: 8, padding: 10, marginTop: 16, alignItems: 'center' },
  modalCloseButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalUserName: { fontSize: 16, marginLeft: 10 },
  submitButton: {
    backgroundColor: '#00c7be',
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

const shareModalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
        paddingVertical: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalUserName: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkboxBox: {
    marginLeft: 'auto',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  modalCloseButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default CreateItineraryScreen;
