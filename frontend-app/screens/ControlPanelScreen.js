import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useNotifications } from '../contexts/NotificationsContext';

const ControlPanelScreen = () => {
  const navigation = useNavigation();
  const { clearUnreadCount } = useNotifications();

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      clearUnreadCount();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (err) {
      Alert.alert('Logout Failed', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Control Panel</Text>
      <Button title="Account Settings" onPress={() => navigation.navigate('AccountSettings')} color="#007AFF" />
      <View style={{ height: 20 }} />
      <Button title="Saved Posts" onPress={() => navigation.navigate('SavedPosts')} color="#007AFF" />
      <View style={{ height: 20 }} />
      <Button title="Logout" onPress={handleLogout} color="#d9534f" />
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
});

export default ControlPanelScreen;
