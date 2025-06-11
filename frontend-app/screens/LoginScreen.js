import { useNavigation } from "@react-navigation/native";
import { Button, Text, View } from 'react-native';
import LoginForm from "../components/LoginForm";
import { useEffect } from "react";

function LoginScreen() {
  const navigation = useNavigation();
  
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24 }}>Travel App</Text>
      <LoginForm />
      <Text> New To Travel App? </Text>
      <Button title="Sign Up" onPress={() => navigation.navigate('Signup')} />
    </View>
  )
}

export default LoginScreen;