import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';

const ControlPanelScreen = () => {
  const navigation = useNavigation();

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
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

      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={styles.bubble}
          onPress={() => navigation.navigate('SavedPosts')}
        >
          <Text style={styles.bubbleText}>💾</Text>
          <Text style={styles.bubbleLabel}>Saved Posts, Trips and itineraries</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bubble, { backgroundColor: '#d9534f' }]}
          onPress={handleLogout}
        >
          <Text style={styles.bubbleText}>🚪</Text>
          <Text style={styles.bubbleLabel}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 24, fontWeight: 'bold', marginBottom: 30 },

  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
  },
  bubble: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  bubbleText: { fontSize: 28, color: '#fff' },
  bubbleLabel: { marginTop: 5, color: '#fff', fontSize: 12, textAlign: 'center' },
});

export default ControlPanelScreen;
