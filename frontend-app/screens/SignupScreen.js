import { useNavigation } from '@react-navigation/native';
import { Button, Text, View } from 'react-native';
import SignupFrom from '../components/SignupForm';

function SignUpScreen() {
const navigation = useNavigation();
  
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24 }}>Travel App</Text>
      <SignupFrom/>
      <Text> Already have an account? </Text>
      <Button title='Login' onPress={() => navigation.navigate('Login')} />
    </View>
  );
}
export default SignUpScreen;