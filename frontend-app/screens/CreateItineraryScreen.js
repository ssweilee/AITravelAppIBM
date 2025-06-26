import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Button, StyleSheet, ScrollView,
  TouchableOpacity, Platform, StatusBar as RNStatusBar,
  Modal, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import TripDateModal from '../components/ItineraryComponents/TripDateModal';
import ShareModal from '../components/ItineraryComponents/ShareModal';
import DaySection from '../components/ItineraryComponents/DaySection';

const CreateItineraryScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState([
    {
      date: '',
      notes: '',
      activities: [
        { time: '', description: '', location: '' }
      ]
    }
  ]);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedFollowers, setSelectedFollowers] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [followings, setFollowings] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);
  const [expandedDayIndex, setExpandedDayIndex] = useState(0);

  const handleAddDay = () => {
    setDays([...days, {
      date: '',
      notes: '',
      activities: [{ time: '', description: '', location: '' }]
    }]);
  };

  const handleRemoveDay = (idx) => {
    if (days.length === 1) return;
    setDays(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      return updated;
    });
    if (expandedDayIndex === idx || idx === days.length - 1) {
      setExpandedDayIndex(Math.max(0, idx - 1));
    }
  };

  const handleDayChange = (idx, field, value) => {
    setDays(days.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  };

  const handleAddActivity = (dayIdx) => {
    setDays(days.map((d, i) =>
      i === dayIdx
        ? { ...d, activities: [...d.activities, { time: '', description: '', location: '' }] }
        : d
    ));
  };

  const handleRemoveActivity = (dayIdx, actIdx) => {
    setDays(days.map((d, i) =>
      i === dayIdx
        ? { ...d, activities: d.activities.filter((_, j) => j !== actIdx) }
        : d
    ));
  };

  const handleActivityChange = (dayIdx, actIdx, field, value) => {
    setDays(days.map((d, i) =>
      i === dayIdx
        ? {
            ...d,
            activities: d.activities.map((a, j) =>
              j === actIdx ? { ...a, [field]: value } : a
            )
          }
        : d
    ));
  };

  const handleCreate = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        alert('You must be logged in.');
        return;
      }

      const payload = {
        title,
        description,
        destination,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days: days.map((d) => ({
          day: d.date,
          notes: d.notes,
          activities: d.activities
        })),
        isPublic: true,
        tags: [],
        coverImage: ''
      };

      const response = await fetch(`${API_BASE_URL}/api/itineraries/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Create failed:', data);
        alert('Failed to create itinerary: ' + (data.message || 'Server error'));
      } else {
        alert('Itinerary created successfully!');
        navigation.goBack?.();
      }
    } catch (err) {
      console.error('Error submitting itinerary:', err);
      alert('Something went wrong.');
    }
  };

  useEffect(() => {
    const fetchFollowersAndFollowings = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
            headers: { Authorization: `Bearer ${token}` }
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
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleShare = () => setShareModalVisible(true);

  const handleShareConfirm = () => {
    setShareModalVisible(false);
    alert('Itinerary shared with: ' +
      followers
        .filter(f => selectedFollowers.includes(f._id))
        .map(f => `${f.firstName} ${f.lastName}`)
        .join(', ')
    );
    navigation.goBack?.();
  };

  const allShareableUsers = [
    ...followers,
    ...followings.filter(fw => !followers.some(f => f._id === fw._id))
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
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  useEffect(() => {
    const numDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    if (numDays > 0) {
      const newDays = Array.from({ length: numDays }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);

        return {
          date: date.toISOString().split('T')[0],
          notes: '',
          activities: [{ time: '', description: '', location: '' }]
        };
      });

      setDays(newDays);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    const newEndDate = new Date(startDate);
    newEndDate.setDate(startDate.getDate() + days.length - 1);
    setEndDate(newEndDate);
  }, [startDate, days.length]);

  const formatTripDates = (start, end) => {
    const sameYear = start.getFullYear() === end.getFullYear();
    const options = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      ...(sameYear ? {} : { year: 'numeric' })
    };
    return `${start.toLocaleDateString('en-UK', options)} – ${end.toLocaleDateString('en-UK', options)}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 40 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack?.()}>
            <Ionicons name="arrow-back" size={26} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Itinerary</Text>
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
          <Ionicons name="add-circle" size={22} color="#007bff" />
          <Text style={styles.addDayText}>Add Day</Text>
        </TouchableOpacity>

        
        <Button title="Create Itinerary" onPress={handleCreate} color="#007bff" />
      </ScrollView>

      <TripDateModal
        visible={showDateModal}
        startDate={startDate}
        setStartDate={setStartDate}
        onClose={() => setShowDateModal(false)}
        styles={styles}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 10, backgroundColor: '#fff', flexGrow: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', flex: 1 },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12,
    marginBottom: 14, fontSize: 16, backgroundColor: '#fafbfc',
  },
  sectionLabel: { fontWeight: 'bold', fontSize: 16, marginBottom: 8, marginTop: 8 },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333'
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
    marginBottom: 14
  },
  addDayBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  addDayText: { color: '#007bff', fontWeight: 'bold', marginLeft: 6, fontSize: 16 },
  activitiesLabel: { fontWeight: 'bold', fontSize: 15, marginBottom: 4, marginTop: 2 },
  addActivityBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  addActivityText: { color: '#007bff', fontWeight: 'bold', marginLeft: 6, fontSize: 15 },
  saveButton: { backgroundColor: '#007bff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '85%', maxHeight: '70%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  modalUserRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 2 },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#bbb', justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  checkboxBox: { marginLeft: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#bbb', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#007bff', borderColor: '#007bff' },
  modalCloseButton: { backgroundColor: '#007bff', borderRadius: 8, padding: 10, marginTop: 16, alignItems: 'center' },
  modalCloseButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalUserName: { fontSize: 16, marginLeft: 10 },
});

export default CreateItineraryScreen;