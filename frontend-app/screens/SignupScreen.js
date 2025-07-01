import { useNavigation } from '@react-navigation/native';
import { Button, Text, View } from 'react-native';
import SignupFrom from '../components/SignupForm';
import GlobalStyles from '../GlobalStyles';
import { LinearGradient } from 'expo-linear-gradient';

function SignUpScreen() {
const navigation = useNavigation();
  
  return (
    <LinearGradient
        colors={[ '#00C7BE','#B2FEFA']}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
    <View style={[GlobalStyles.center, GlobalStyles.container]}>
      <Text style={{ fontSize: 24 , color: "white"}}>Travel App</Text>
      <SignupFrom/>
      <Text style={{ color: "white"}}> Already have an account? </Text>
      <Button title="Login" onPress={() => navigation.navigate('Login')} />
    </View>
    </LinearGradient>
  );
}
export default SignUpScreen;