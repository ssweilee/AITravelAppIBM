import { useNavigation } from "@react-navigation/native";
import { Button, Text, View } from 'react-native';
import LoginForm from "../components/LoginForm";
import { useEffect } from "react";
import GlobalStyles from '../GlobalStyles';
import { LinearGradient } from 'expo-linear-gradient';
//import LinearGradient from 'react-native-linear-gradient';


function LoginScreen() {
  const navigation = useNavigation();
  
  return (
    <LinearGradient
        colors={['#69D1C5', '#00C7BE']}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
    <View style={[GlobalStyles.center, GlobalStyles.container]}>
      <Text style={{ fontSize: 24 , color: "white"}}>Travel App</Text>
      <LoginForm />
      <Text style={{ color: "white"}}> Don't have an account? </Text>
      <Button title="Sign up for Travel" onPress={() => navigation.navigate('Signup')} />
    </View>
    </LinearGradient>
  )
}

export default LoginScreen;