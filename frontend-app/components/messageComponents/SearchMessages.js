import React from "react";
import { View, TextInput, StyleSheet } from "react-native";

const SearchMessages = ({ query, onChangeQuery, placeholder }) => {
  return (
    <View style={styles.searchContainer}>
      <TextInput
        value={query}
        onChangeText={onChangeQuery}
        placeholder={placeholder}
        style={styles.searchInput}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    marginBottom: 10,
  },
  searchInput: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
});

export default SearchMessages;