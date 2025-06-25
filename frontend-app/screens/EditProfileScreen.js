import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, Keyboard, Linking } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import Autocomplete from 'react-native-autocomplete-input';
import debounce from 'lodash.debounce';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
//import * as Linking from 'expo-linking'; 


const EditProfileScreen = ({ route, navigation }) => {
  const { userId, currentUserInfo } = route.params;
  const { refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(currentUserInfo?.firstName || '');
  const [lastName, setLastName] = useState(currentUserInfo?.lastName || '');
  const [location, setLocation] = useState(''); 
  const [bio, setBio] = useState(currentUserInfo?.bio || '');
  const [avatarUri, setAvatarUri] = useState(currentUserInfo?.profilePicture || null);
  
  const [selectedLocationObject, setSelectedLocationObject] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

  const [filteredLocations, setFilteredLocations] = useState([]);
  const isPickingRef = useRef(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [hasShownLimitedAlert, setHasShownLimitedAlert] = useState(false);


  {/*
    const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [location, setLocation] = useState('');
  
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [selectedLocationObject, setSelectedLocationObject] = useState(null);
  const [avatarUri, setAvatarUri] = useState(initialAvatarUri || '');
  const [avatarFile, setAvatarFile] = useState(null); 
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
    */}

    useEffect(() => {
      const checkLimitedAlert = async () => {
        try {
          const value = await AsyncStorage.getItem('hasShownLimitedAccessAlert');
          setHasShownLimitedAlert(value === 'true');
        } catch (e) {
          console.error('Error reading hasShownLimitedAccessAlert from AsyncStorage', e);
        }
      };
      checkLimitedAlert();
    }, []);
  
  

  useEffect(() => {
    if (currentUserInfo?.location && currentUserInfo.location.includes('|')) {
      const [country, city] = currentUserInfo.location.split('|');
      setLocation(`${city}, ${country}`);
      setSelectedLocationObject({ display: `${city}, ${country}`, value: currentUserInfo.location });
    }
  }, [currentUserInfo]);

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
  
  

  const pickImage = useCallback(async () => {
     if (isPickingRef.current) {
      console.log("Picking process is already active. Ignoring.");
      return;
    }
    isPickingRef.current = true;
    setIsPicking(true);

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Access Required",
          "To select photos, please allow photo access in your device Settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() }
          ]
        );
        isPickingRef.current = false;
        setIsPicking(false);
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      console.log("[DEBUG] pickImage: Image picker result:", JSON.stringify(result, null, 2));

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        setAvatarUri(asset.uri);
        setAvatarFile({
          uri: asset.uri,
          name: asset.fileName || asset.uri.split('/').pop(),
          type: asset.type || 'image/jpeg',
        });
        setRemoveAvatar(false);
      }
    } catch (error) {
      console.error("[DEBUG] pickImage: An unexpected error occurred.", error);
      Alert.alert('Error', 'An unexpected error occurred while trying to open the image library.');
    } finally {
      isPickingRef.current = false;
      setIsPicking(false);
    }
  }, []); 



  const uploadAvatar = async (token) => {
    setUploadingAvatar(true);
    try {
      const startTime = Date.now();
      const formData = new FormData();
      formData.append('avatar', {
        uri: avatarFile.uri,
        name: avatarFile.name,
        type: avatarFile.type,
      });
  
      console.log('[DEBUG] uploadAvatar: Sending request to:', `${API_BASE_URL}/api/users/upload-avatar`);

      const uploadResponse = await fetch(`${API_BASE_URL}/api/users/upload-avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
  
      const uploadResult = await uploadResponse.json();
      console.log('[DEBUG] uploadAvatar: Sending request to:', `${API_BASE_URL}/api/users/upload-avatar`);
      if (!uploadResponse.ok) {
        throw new Error(uploadResult.message || 'Failed to upload avatar');
      }
      return `${uploadResult.profilePicture}?t=${Date.now()}`;
    } catch (err) {
      console.error('[DEBUG] uploadAvatar: Error:', err.message);
      Alert.alert('Upload Error', err.message);
      return null;
    } finally {
      setUploadingAvatar(false);
    }
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
      if (!token) {
        Alert.alert('Authentication Error', 'Token not found. Please log in again.');
        setLoading(false);
        return;
      }

      let locationField = '';
      if (selectedLocationObject) {
        locationField = selectedLocationObject.value;
      } else if (location.trim() !== '') {
        const parts = location.split(',').map(p => p.trim());
        if (parts.length >= 2) {
            locationField = `${parts[1]}|${parts[0]}`; 
        } else {
            Alert.alert('Invalid Location', 'Please select a location from the list or use the "City, Country" format.');
            setLoading(false);
            return;
        }
      }

      let finalProfilePictureUrl = currentUserInfo?.profilePicture;
      console.log('handleSave: Uploading new avatar...');
      if (avatarFile) {
      finalProfilePictureUrl = await uploadAvatar(token);
      if (!finalProfilePictureUrl) { 
        setLoading(false);
        return; 
      }
      await Image.prefetch(finalProfilePictureUrl);
    } else if (removeAvatar) {
      console.log('handleSave: Removing avatar...');
      finalProfilePictureUrl = null; 
    }
      const payload = { firstName, lastName, location: locationField, bio };
      if (finalProfilePictureUrl !== currentUserInfo.profilePicture) {
        payload.profilePicture = finalProfilePictureUrl;
      }
      console.log('EditProfileScreen - Save Payload:', JSON.stringify(payload));
      const url = `${API_BASE_URL}/api/users/edit/${userId}`;
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
        await refreshUser(); 
        navigation.navigate('Profile', { profileUpdated: true });
      } else {
        Alert.alert('Error', result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('EditProfileScreen - Error updating profile:', error.message);
      Alert.alert('Error', error.message);
      // Rollback UI if save fails
      setAvatarUri(originalAvatarUri);
      setAvatarFile(null);
      setRemoveAvatar(false);
    } finally {
      setLoading(false);
    }
  };

//names, location, trips, reviews, bio, years on travel?,  picture?
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.flexContainer} 
    >
      <View style={styles.avatarSection}>
      {uploadingAvatar && (
        <ActivityIndicator
          style={styles.avatarSpinner}
          size="small"
          color="#fff"
        />
      )}
      <TouchableOpacity onPress={(event) => {
    event.stopPropagation(); // Prevent event bubbling
    console.log('[DEBUG] TouchableOpacity pressed');
    pickImage();
  }} activeOpacity={0.7} disabled={isPicking || uploadingAvatar} >
      {isPicking ? (
    <ActivityIndicator size="small" color="#0000ff" />
  ) : avatarUri ? (
    <View style={{ position: 'relative' }}>
      <Image
        source={{ uri: avatarUri }}
        style={styles.avatar}
        cachePolicy="memory-disk"
      />
      <TouchableOpacity
        onPress={() => {
          setAvatarUri('');
          setAvatarFile(null);
          setRemoveAvatar(true);
        }}
        style={styles.removeAvatarButton}
      >
        <Text style={styles.removeAvatarText}>✕</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <View style={styles.avatarPlaceholder}>
      <Text>Select Avatar</Text>
    </View>
  )}
</TouchableOpacity>
</View>

    <ScrollView 
      style={styles.formContainer} 
      contentContainerStyle={styles.scrollContentContainer} 
      keyboardShouldPersistTaps="handled" 
    >

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
      </ScrollView>
      </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  formContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  avatarContainer: { alignItems: 'center', marginBottom: 20, },
  avatar: { width: 120, height: 120, borderRadius: 60, },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center', },
  removeAvatarButton: { position: 'absolute', top: -5, right: -5 ,backgroundColor: 'red', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', zIndex: 2, },
  removeAvatarText: { color: '#fff', fontWeight: 'bold', },
  avatarSpinner: { position: 'absolute', left: '50%', top: '50%', marginLeft: -10, marginTop: -10, zIndex: 1 },  
  label: { fontSize: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 16 },
  multilineInput: { height: 100, textAlignVertical: 'top' },
  autocompleteContainer: { zIndex: 1, marginBottom: 16 },
  listContainer: { maxHeight: 150, borderWidth: 1, borderColor: '#ccc' },
  item: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
});

export default EditProfileScreen;