import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

function SignupForm() {

  const [ email, setEmail ] = useState('');
  const [ password, setPassword ] = useState('');
  const navigation = useNavigation();

  const handleNext = () => {
    if (!email || !password) {
      Alert.alert('Please Enter both email and password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter valid email address.');
      return;
    }
    
    navigation.navigate('SignupDetails', { email, password });
  };
  
  return (
    <View>
      <Text style={[styles.header, { fontSize: 24, color: "white" }]}>Sign Up</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
      <Button title="Sign Up" onPress={handleNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 20, marginBottom: 10, color: "white" },
  input: { width: 200, borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5, borderColor: "white" }
});

export default SignupForm;