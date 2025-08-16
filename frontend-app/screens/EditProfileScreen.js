import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, Keyboard, Linking, FlatList } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import Autocomplete from 'react-native-autocomplete-input';
import debounce from 'lodash.debounce';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile } from '../services/userService';
import { getAvatarUrl } from '../utils/getAvatarUrl';


const EditProfileScreen = ({ route, navigation }) => {
  const { userId, currentUserInfo } = route.params;
  const { refreshUser } = useAuth();
  const nav = useNavigation();
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

  const flatListRef = useRef(null);

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
    nav.setOptions({
      headerStyle: { backgroundColor: '#00c7be' },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    });
  }, [nav]);
    
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



    //Update the state with the filtered locations
    setFilteredLocations(locations);
    } catch (error) {
      if (error.message && error.message.includes('Status 429')) {
        console.log(`[API Rate Limit] LocationIQ rate limit exceeded for query: "${query}". This error is hidden from the user.`);
      } else {
        console.log('[Location Fetch Error] An unexpected error occurred:', error.message);
      }
      setFilteredLocations([]);
    }
  }, 750);

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
    console.log('[DEBUG] About to upload:', {
      uri: avatarFile.uri,
      name: avatarFile.name,
      type: avatarFile.type,
      platform: Platform.OS
    });

    const formData = new FormData();
    
    // Create the file object for Android
    const fileToUpload = {
      uri: avatarFile.uri,
      type: avatarFile.type || 'image/jpeg',
      name: avatarFile.name || 'avatar.jpg',
    };
    
    // For Android, sometimes we need to ensure the type is set correctly
    if (Platform.OS === 'android') {
      fileToUpload.type = 'image/jpeg'; // Force JPEG type for Android
    }
    
    formData.append('avatar', fileToUpload);
    
    console.log('[DEBUG] FormData file object:', fileToUpload);

    const uploadResponse = await fetch(`${API_BASE_URL}/api/users/upload-avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // No Content-Type header for multipart
      },
      body: formData,
    });

    console.log('[DEBUG] Upload response status:', uploadResponse.status);
    
    const uploadResult = await uploadResponse.json();
    console.log('[DEBUG] uploadAvatar response:', uploadResult);
    
    if (!uploadResponse.ok) {
      throw new Error(uploadResult.message || 'Failed to upload avatar');
    }
    if (uploadResponse.ok && uploadResult.profilePicture) {
      return uploadResult.profilePicture;
    } else {
      throw new Error(uploadResult.message || 'Failed to upload avatar or server returned invalid data.');
    }
  } catch (err) {
    console.error('[DEBUG] uploadAvatar: Error:', err.message);
    console.error('[DEBUG] uploadAvatar: Full error:', err);
    Alert.alert('Upload Error', err.message);
    return null;
  } finally {
    setUploadingAvatar(false);
  }
};

  const handleBioFocus = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 200); 
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
      //preparing basic payload
      const payload = {
        firstName,
        lastName,
        bio,
      };
  
      //handle location field
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

      payload.location = locationField;

        if (avatarFile) {
          console.log('handleSave: Uploading new avatar...');
          const token = await AsyncStorage.getItem('token'); 
          const newProfilePicturePath = await uploadAvatar(token); 
  
          if (!newProfilePicturePath) {
            setLoading(false);
            return;
          }
          payload.profilePicture = newProfilePicturePath;
          const fullAvatarUrl = getAvatarUrl(newProfilePicturePath);
          setAvatarUri(fullAvatarUrl); 
          await Image.prefetch(fullAvatarUrl);
        } else if (removeAvatar) {
          console.log('handleSave: Removing avatar...');
          payload.profilePicture = null;
        }

    console.log('EditProfileScreen - Save Payload:', JSON.stringify(payload));
      
    await updateUserProfile(payload, { navigation });
    Alert.alert('Success', 'Profile updated successfully');
    await refreshUser(); 
    navigation.navigate('Main', { 
      screen: 'Profile',
      params: { profileUpdated: true }, 
    });

    } catch (error) {
      if (error.message) {
        console.error('EditProfileScreen - Update failed:', error.message);
        Alert.alert('Update Failed', error.message);
      } else {
        console.error('EditProfileScreen - An unknown update error occurred:', error);
        Alert.alert('Update Failed', 'An unexpected error occurred.');
      }
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

    <FlatList 
      ref={flatListRef}
      style={styles.formContainer} 
      contentContainerStyle={styles.scrollContentContainer} 
      keyboardShouldPersistTaps="handled" 
      data={[]} 
      renderItem={null} 
      keyExtractor={(item, index) => index.toString()}
    
      ListHeaderComponent={
        <>
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
    inputContainerStyle={styles.autocompleteInputContainer}
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
        onFocus={handleBioFocus}
      />
      <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
        {loading && <ActivityIndicator size="small" color="#0000ff" />}
          </>
        }
      />
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
  input: { borderWidth: 1, borderColor: '#00c7be', borderRadius: 20, padding: 8, marginBottom: 16 },
  multilineInput: { height: 100, textAlignVertical: 'top' },
  autocompleteContainer: { zIndex: 1, marginBottom: 16 },
  autocompleteInputContainer: { borderWidth: 1, borderColor: '#00c7be', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  listContainer: { maxHeight: 150, borderWidth: 0, borderColor: '#00c7be' },
  item: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  saveButton: { backgroundColor: '#00c7be', paddingVertical: 12, borderRadius: 20, alignItems: 'center', marginTop: 10,},
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold'},
});

export default EditProfileScreen;

