import React, { useState, useLayoutEffect, useEffect } from "react";
import {
  StyleSheet, View, TouchableOpacity, Platform, StatusBar as RNStatusBar, Text
} from "react-native";
import { useNavigation, route } from "@react-navigation/native";
import SearchMessages from "../components/messageComponents/SearchMessages";
import MessageList from "../components/messageComponents/MessageList";
import { Ionicons } from '@expo/vector-icons';

function MessagesScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigation = useNavigation();

 useLayoutEffect(() => {
  navigation.setOptions({
    headerTitle: () => (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ marginLeft: 16, fontSize: 22, fontWeight: 'bold', color: '#222', letterSpacing: 0.2 }}>Messages</Text>
      </View>
    ),
    headerRight: () => (
      <TouchableOpacity
        onPress={() => navigation.navigate("Create New Group")}
        style={{ marginRight: 4, padding: 0, borderRadius: 50 }}
        activeOpacity={0.7}
      >
        <Ionicons name="add-circle-outline" size={28} color="#222" />
      </TouchableOpacity>
    ),
    headerLeft: () => (
      <TouchableOpacity
        onPress={() => navigation.navigate('Main', { fromMessages: true })}
        style={{ marginLeft:0, padding: 0, borderRadius: 50 }}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={26} color="#222" />
      </TouchableOpacity>
    ),
    headerStyle: {
      backgroundColor: '#fff',
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 0,
    },
  });
}, [navigation]);

  useEffect(() => {
    navigation.addListener('beforeRemove', (e) => {
      if (route?.params?.fromSettings) {
        e.preventDefault();
      }
    });
  }, [navigation, route]);

  return (
    <View style={[styles.container, { paddingTop: 0 }]}> 
      <View style={{ height: 6 }} />
      <SearchMessages
        query={searchQuery}
        onChangeQuery={setSearchQuery}
        placeholder="Search messages..."
      />
      <MessageList searchQuery={searchQuery} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
  },
  headerIcon: {
    marginRight: 15,   // ✅ adds proper space from the right edge
    paddingHorizontal: 8,
  
  },
});

export default MessagesScreen;