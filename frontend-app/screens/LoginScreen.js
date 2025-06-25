import { useNavigation } from "@react-navigation/native";
import { Button, Text, View } from 'react-native';
import LoginForm from "../components/LoginForm";
import { useEffect } from "react";
import GlobalStyles from '../GlobalStyles';
import { LinearGradient } from 'expo-linear-gradient';


function LoginScreen() {
  const navigation = useNavigation();
  
  return (
    <LinearGradient
        colors={[ '#00C7BE','#B2FEFA']}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
    <View style={[GlobalStyles.center, GlobalStyles.container]}>
      <Text style={{ fontSize: 24 , color: "white"}}>Travel App</Text>
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