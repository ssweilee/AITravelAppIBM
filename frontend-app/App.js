import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import SignupDetailsScreen from './screens/SignupDetailsScreen';
import ProfileScreen from './screens/ProfileScreen';
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import ChatScreen from './screens/ChatScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import MessagesScreen from './screens/MessagesScreen';
import CreateGroupChatScreen from './screens/CreateGroupChatScreen';
import ChatSettingScreen from './screens/ChatSettingScreen';
import GroupChatMembersScreen from './screens/GroupChatMembersScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainAppTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name='Home' component={HomeScreen} />
      <Tab.Screen name='Search' component={SearchScreen} />
      <Tab.Screen name='Profile' component={ProfileScreen} options={{ headerTitle: ''}} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Signup">
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="SignupDetails" component={SignupDetailsScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen 
          name="Main" 
          component={MainAppTabs} 
          options={({ route }) => ({
            headerShown: false,
            gestureEnabled: false,
            animation: route?.params?.fromMessages ? 'slide_from_left' : 'default',
          })}
        />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={({ route }) => ({
            animation: route?.params?.fromGroupCreation ? 'slide_from_right' : 'default',
          })}
        />
        <Stack.Screen
          name="Messages"
          component={MessagesScreen}
          options={({ route }) => ({
            animation: route?.params?.fromSettings ? 'slide_from_left' : 'default',
          })}
        />
        <Stack.Screen name="Create New Group" component={CreateGroupChatScreen} />
        <Stack.Screen name="Chat Settings" component={ChatSettingScreen} />
        <Stack.Screen name="Members" component={GroupChatMembersScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}