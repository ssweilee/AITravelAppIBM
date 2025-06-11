import { useRoute } from '@react-navigation/native';
import { View, Text } from 'react-native';
import SignupDetailsForm from '../components/SignupDetailsForm';

function SignupDetailsScreen() {
  const route = useRoute();
  const { email, password } = route.params || {};

  return (
    <View style={{ padding: 20 }}> 
      <Text style={{ fontSize: 24, marginBottom: 10 }}> Personal Details </Text>
      <SignupDetailsForm email={email} password={password} />
    </View>
  )
}

export default SignupDetailsScreen;