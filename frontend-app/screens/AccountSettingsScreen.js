import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import { Ionicons } from '@expo/vector-icons';

const AccountSettingsScreen = ({ navigation }) => {
  const [currentEmail, setCurrentEmail] = useState('');
  const [showEmailEdit, setShowEmailEdit] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const fetchEmail = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.user && data.user.email) {
          setCurrentEmail(data.user.email);
        }
      } catch {}
    };
    fetchEmail();
  }, []);

  const handleChangeEmail = async () => {
    if (!newEmail || !confirmEmail) return Alert.alert('Please fill both email fields.');
    if (newEmail !== confirmEmail) return Alert.alert('Emails do not match.');
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/users/change-email`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Email updated successfully.');
        setCurrentEmail(newEmail);
        setNewEmail('');
        setConfirmEmail('');
        setShowEmailEdit(false);
      } else {
        Alert.alert('Error', data.message || 'Failed to update email.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!password || !newPassword) return Alert.alert('Please enter current and new password.');
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/users/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Password updated successfully.');
        setPassword('');
        setNewPassword('');
      } else {
        Alert.alert('Error', data.message || 'Failed to update password.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Account Settings</Text>
      <Text style={styles.label}>Email</Text>
      <View style={styles.emailRow}>
        <Text style={styles.emailText}>{currentEmail}</Text>
        <TouchableOpacity onPress={() => setShowEmailEdit(v => !v)}>
          <Ionicons name={showEmailEdit ? 'chevron-up' : 'chevron-down'} size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      {showEmailEdit && (
        <View style={styles.emailEditBox}>
          <TextInput
            style={styles.input}
            placeholder="New Email Address"
            value={newEmail}
            onChangeText={setNewEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm New Email Address"
            value={confirmEmail}
            onChangeText={setConfirmEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Button title="Change Email" onPress={handleChangeEmail} disabled={loading} />
        </View>
      )}
      <View style={{ height: 30 }} />
      <Text style={styles.label}>Change Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Current Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />
      <Button title="Change Password" onPress={handleChangePassword} disabled={loading} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 10 },
  emailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  emailText: { fontSize: 16, flex: 1 },
  emailEditBox: { marginBottom: 10 },
});

export default AccountSettingsScreen;
