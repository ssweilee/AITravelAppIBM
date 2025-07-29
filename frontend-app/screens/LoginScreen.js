import { useNavigation } from "@react-navigation/native";
import { Button, Text, View } from 'react-native';
import LoginForm from "../components/LoginForm";
import GlobalStyles from '../GlobalStyles';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

function LoginScreen({ route }) {
  const navigation = useNavigation();
  const message = route?.params?.message;

  return (
    <LinearGradient
        colors={['#00C7BE', '#B2FEFA']}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
    <View style={[GlobalStyles.center, GlobalStyles.container]}>
      <Text style={{ fontSize: 24 , color: "white"}}>Travel App</Text>
      {message && <Text style={{ color: 'yellow', marginBottom: 10 }}>{message}</Text>}
      <LoginForm />
      <Text style={{ color: "white"}}> Forget your password? </Text>
      <Button title="Set a new password" onPress={() => navigation.navigate('')} />
      <Text style={{ color: "white"}}> Don't have an account? </Text>
      <Button title="Sign up for Travel" onPress={() => navigation.navigate('Signup')} />
    </View>
    </LinearGradient>
  )
}

export default LoginScreen;