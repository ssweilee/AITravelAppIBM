import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const EditProfileScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

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
      console.log('EditProfileScreen - Save Payload:', JSON.stringify({ firstName, lastName }));
      const url = `${API_BASE_URL}/api/users/edit/${userId}`;
      console.log('EditProfileScreen - Save URL:', url);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ firstName, lastName }),
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
      {/* make it scroll down selection, not input */}
      <TextInput
        style={styles.input}
        value={location}
        onChangeText={setLocation}
        placeholder="Enter last name"
        maxLength={50}
      />
      <Button title="Save" onPress={handleSave} disabled={loading} />
      {loading && <ActivityIndicator size="small" color="#0000ff" />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  label: { fontSize: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 16 },
});

export default EditProfileScreen;