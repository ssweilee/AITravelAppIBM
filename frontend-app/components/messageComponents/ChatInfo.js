import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

function ChatInfo({ chatName, chatImage }) {
  return (
    <View style={styles.container}>
      <View style={styles.imagePlaceholder}>
        {/* Replace with actual image logic if later add upload functionality */}
        {chatImage ? (
          <Image source={{ uri: chatImage }} style={styles.image} />
        ) : (
          <Text style={styles.imageText}>📷</Text>
        )}
      </View>
      <Text style={styles.name}>{chatName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 30,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  imageText: {
    fontSize: 30,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
});

export default ChatInfo;