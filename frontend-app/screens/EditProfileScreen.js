import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import Autocomplete from 'react-native-autocomplete-input';
import debounce from 'lodash.debounce';
import Constants from 'expo-constants';


const EditProfileScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [location, setLocation] = useState('');
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [selectedLocationObject, setSelectedLocationObject] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        console.log('EditProfileScreen - Token:', token);
        if (!token) {
          Alert.alert('Error', 'Authentication token not found');
          setFetching(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        console.log('EditProfileScreen - Fetch user response:', JSON.stringify(data, null, 2));
        if (data.success && data.user) {
          setFirstName(data.user.firstName || '');
          setLastName(data.user.lastName || '');
          setBio(data.user.bio || '');
          if (data.user.location && data.user.location.includes('|')) {
            const [country, city] = data.user.location.split('|');
            const displayLocation = `${city}, ${country}`;
            setLocation(displayLocation);
            setSelectedLocationObject({ display: displayLocation, value: data.user.location });
          } else {
            setLocation('');
          }
        } else {
          Alert.alert('Error', 'Failed to load user data: ' + (data.message || JSON.stringify(data)));
        }
      } catch (error) {
        console.error('EditProfileScreen - Error fetching user data:', error.message);
        Alert.alert('Error', 'An unexpected error occurred: ' + error.message);
      } finally {
        setFetching(false);
      }
    };

    fetchUserData();
  }, [userId]);

  const fetchLocations = debounce(async (query) => {
    console.log(`[Step 1] fetchLocations called with query: "${query}"`);
    if (query.length <= 3) {
      setFilteredLocations([]);
      return;
    }
    try {
    const url = `${API_BASE_URL}/api/location/autocomplete?q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`LocationIQ API error: Status ${response.status}`);
    }

    const data = await response.json();
    console.log('[DEBUG] LocationIQ raw response:', JSON.stringify(data, null, 2));


    const locations = data.map(item => ({
      display: item.display || 'Unknown',
      value: item.value || '',
    }));


      {/*
        const GOOGLE_API_KEY = Constants.manifest?.extra?.googlePlacesApiKey || Constants.expoConfig?.extra?.googlePlacesApiKey;

    if (!GOOGLE_API_KEY) {
      console.error('Google Places API Key is missing. Check your config.');
      return;
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=(cities)&components=country:gb&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Places API Error: Status ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Places API returned error:', data.status, data.error_message);
      setFilteredLocations([]);
      return;
    }

    const locations = data.predictions.map(prediction => ({
      display: prediction.description,
      value: prediction.description, 
    }));
        
        */}
      

{/*
      //1. Safely access the API key from Constants
      
        const GEOAPIFY_API_KEY =
        Constants.manifest?.extra?.geoapifyApiKey || // for older versions
        Constants.expoConfig?.extra?.geoapifyApiKey || // for SDK 49+
        null;
        


      //2. Check if the API key is available
      if (!GEOAPIFY_API_KEY) {
        console.error('Geoapify API Key is missing. Check your .env and app.config.js setup.');
        return;
      }
        
    //3. Construct the API URL with the query
    const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&apiKey=${GEOAPIFY_API_KEY}`;
    //4. Send the request to Geoapify API
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Geoapify API Error: Status ${response.status}`);
    }
    //5. Parse the response data
    const data = await response.json();
    //6. handle the response data structure
    let locations = [];
    if (data.features && data.features.length > 0) {
      locations = data.features.map((feature) => {
        const props = feature.properties;
        return {
          display: `${props.city || props.name || ''}, ${props.country || ''}`,
          value: `${props.country_code?.toUpperCase() || ''}|${props.city || props.name || ''}`,       
         };
      });
    } 
      */}


    //7. Update the state with the filtered locations
    setFilteredLocations(locations);
    } catch (error) {
      console.error('EditProfileScreen - Error fetching locations:', error.message);
      setFilteredLocations([]);
    }
  }, 500);

  const handleLocationChange = (query) => {
    setLocation(query);
    if (selectedLocationObject && selectedLocationObject.display !== query) {
      setSelectedLocationObject(null);
    }
    fetchLocations(query);
  };

  const handleLocationSelect = (item) => {
    setLocation(item.display);
    setSelectedLocationObject(item);
    setFilteredLocations([]);
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    if (!/^[a-zA-Z\s]+$/.test(firstName) || !/^[a-zA-Z\s]+$/.test(lastName)) {
      Alert.alert('Error', 'Names must contain only letters and spaces');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('EditProfileScreen - Save Token:', token);
      let locationField = '';
      if (selectedLocationObject) {
        locationField = selectedLocationObject.value;
      } else if (location.trim() !== '') {
        const parts = location.split(',').map(p => p.trim());
        if (parts.length === 2) {
            locationField = `${parts[1]}|${parts[0]}`; 
        } else {
            Alert.alert('Invalid Location', 'Please select a location from the list or use the "City, Country" format.');
            setLoading(false);
            return;
        }
      }
      const payload = { firstName, lastName, location: locationField, bio };
      console.log('EditProfileScreen - Save Payload:', JSON.stringify(payload));
      console.log('EditProfileScreen - Save Payload:', JSON.stringify(payload));
      const url = `${API_BASE_URL}/api/users/edit/${userId}`;
      console.log('EditProfileScreen - Save URL:', url);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log('EditProfileScreen - Save response:', JSON.stringify(result, null, 2));
      if (response.ok) {
        Alert.alert('Success', 'Profile updated successfully');
        navigation.goBack();
      } else {
        Alert.alert('Error', result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('EditProfileScreen - Error updating profile:', error.message);
      Alert.alert('Error', 'An unexpected error occurred: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
//names, location, trips, reviews, bio, years on travel?,  picture?
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
      <Text style={styles.label}>First Name:</Text>
      <TextInput
        style={styles.input}
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Enter first name"
        maxLength={50}
      />
      <Text style={styles.label}>Last Name:</Text>
      <TextInput
        style={styles.input}
        value={lastName}
        onChangeText={setLastName}
        placeholder="Enter last name"
        maxLength={50}
      />
      <Text style={styles.label}>Location:</Text>      
      <View style={styles.autocompleteContainer}>
  <Autocomplete
    data={filteredLocations}
    value={location}
    onChangeText={handleLocationChange}
    placeholder="Type a city name (e.g., Bristol)"
    flatListProps={{
      keyboardShouldPersistTaps: 'always',
      renderItem: ({ item }) => (
        <TouchableOpacity
          style={styles.item}
          onPress={() => handleLocationSelect(item)}
        >
          <Text>{item.display}</Text>
        </TouchableOpacity>
      ),
    }}
    inputContainerStyle={{ borderWidth: 0, padding: 0, margin: 0 }}
    listContainerStyle={styles.listContainer}
  />
</View>
      <Text style={styles.label}>Bio:</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        value={bio}
        onChangeText={setBio}
        placeholder="Enter bio"
        multiline
        returnKeyType="done" 
        onSubmitEditing={() => { Keyboard.dismiss() }} 
      />
      <Button title="Save" onPress={handleSave} disabled={loading} />
      {loading && <ActivityIndicator size="small" color="#0000ff" />}
      </View>
      </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 50 },
  label: { fontSize: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 16 },
  multilineInput: { height: 100, textAlignVertical: 'top' },
  autocompleteContainer: { zIndex: 1, marginBottom: 16 },
  listContainer: { maxHeight: 150, borderWidth: 1, borderColor: '#ccc' },
  item: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
});

export default EditProfileScreen;