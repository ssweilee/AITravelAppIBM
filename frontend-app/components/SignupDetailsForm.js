import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { API_BASE_URL } from '../config';

function SignupDetailsForm({ email, password }) {
  const navigation = useNavigation();

  const [ firstName, setFirstName ] = useState('');
  const [ lastName, setLastName ] = useState('');
  const [ dob, setDob ] = useState('');
  const [ country, setCountry ] = useState('');
  const [ travelStyle, setTravelStyle ] = useState('');

  const handleSubmit = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json'},
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
        dob,
        country,
        travelStyle
        })
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Signup complete!');
        navigation.navigate('Login');
      } else {
        Alert.alert('Error: ', data.message);
      }
    } catch (error) {
      Alert.alert('Network Error', error.message);
    }
  };

  return (
    <View>
      <Text style={styles.header}>Tell Us About Yourself</Text>
      <TextInput placeholder='First Name' value={firstName} onChangeText={setFirstName} style={styles.input} />
      <TextInput placeholder='Last Name' value={lastName} onChangeText={setLastName} style={styles.input} />
      <TextInput placeholder='Date of Birth (YYYY-MM-DD)' value={dob} onChangeText={setDob} style={styles.input} />
      <TextInput placeholder='Country of Residence' value={country} onChangeText={setCountry} style={styles.input} />
      
      <Text style={{ marginBottom: 5 }}>Preferred Travel Style</Text>
      <Picker selectedValue={travelStyle} onValueChange={(itemValue) => setTravelStyle(itemValue)} style={styles.picker}>
        <Picker.Item label="Select a style" value="" />
        <Picker.Item label="Budget" value="budget" />
        <Picker.Item label="Luxury" value="luxury" />
        <Picker.Item label="Family" value="family" />
        <Picker.Item label="Adventure" value="adventure" />
      </Picker>

      <Button title="Next" onPress={handleSubmit} />
    </View>
  )
}

const styles = StyleSheet.create({
  header: { fontSize: 20, marginBottom: 10 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
  picker: { borderWidth: 1, borderColor: '#ccc', marginBottom: 10 }
});

export default SignupDetailsForm;