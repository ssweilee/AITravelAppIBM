import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../config';

function LoginForm() {
  const navigation = useNavigation();

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
        await AsyncStorage.setItem('token', data.token);
        if (data.refreshToken) {
          await AsyncStorage.setItem('refreshToken', data.refreshToken);
        }
        if (data.user) {
          await AsyncStorage.setItem('userInfoCache', JSON.stringify(data.user));
        }
        
        const alreadySelected = await AsyncStorage.getItem('hasSelectedInterests');
        
        if (alreadySelected === 'true') {
          navigation.navigate('Main', { screen: 'Home' });
        } else {
          navigation.navigate('Interest');
        }
      } else {
        Alert.alert('Login failed: ' + data.message);
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