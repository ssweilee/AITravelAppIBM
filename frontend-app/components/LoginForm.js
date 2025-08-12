import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';

function LoginForm() {
  const navigation = useNavigation();
  const { login } = useAuth();

  const [ email, setEmail ] = useState('');
  const [ password, setPassword ] = useState('');

  const handleLogin = async () => {
    try {
      const reponse = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        },
      body: JSON.stringify({ email, password })
      });

      const data = await reponse.json();
      if (reponse.ok) {
        // Persist tokens first
        await AsyncStorage.setItem('token', data.token);
        if (data.refreshToken) {
          await AsyncStorage.setItem('refreshToken', data.refreshToken);
        }
        // Clear any cached user to avoid stale cross-account residue
        await AsyncStorage.removeItem('userInfoCache');

        // If backend did not send user object, fetch profile explicitly
        let userObj = data.user || null;
        if (!userObj) {
          try {
            const profRes = await fetch(`${API_BASE_URL}/api/users/profile`, { headers: { Authorization: `Bearer ${data.token}` } });
            const profData = await profRes.json();
            if (profRes.ok && profData?.user) {
              userObj = profData.user;
            }
          } catch (e) {
            console.log('[LoginForm] profile fetch fallback failed:', e.message);
          }
        }

        // Delegate caching & state update to AuthContext.login (it will fetch profile again if userObj null)
        await login(data.token, userObj);

        const alreadySelected = await AsyncStorage.getItem('hasSelectedInterests');
        if (alreadySelected === 'true') {
          navigation.navigate('Main', { screen: 'Home' });
        } else {
          navigation.navigate('Interest');
        }
      } else {
        Alert.alert('Login failed: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View>
      <Text style={[styles.header, { fontSize: 24, color: "white" }]}>Login</Text>
      <TextInput placeholder='Email' value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
      <Button title='Login' onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 20, marginBottom: 10, color: "white"},
  input: { width: 200, borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5, borderColor: "white" }
});

export default LoginForm;