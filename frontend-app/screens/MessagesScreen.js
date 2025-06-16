import React, { useState, useLayoutEffect, useEffect } from "react";
import {
  StyleSheet, SafeAreaView, TouchableOpacity
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
    headerRight: () => (
      <TouchableOpacity
        onPress={() => navigation.navigate("Create New Group")}
        style={styles.headerIcon}
      >
        <Ionicons name="add" size={28} color="#007AFF" />
      </TouchableOpacity>
      ),
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Main', { fromMessages: true })}
          style={{ marginLeft: 15 }}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
      ),
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
    <SafeAreaView style={styles.container}>
      <SearchMessages
        query={searchQuery}
        onChangeQuery={setSearchQuery}
        placeholder="Search messages..."
      />
      <MessageList searchQuery={searchQuery} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#fff",
  },
  headerIcon: {
    marginRight: 15,   // ✅ adds proper space from the right edge
    paddingHorizontal: 8,
  
  },
});

export default MessagesScreen;