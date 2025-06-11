import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import { useNavigation } from '@react-navigation/native';
import debounce from 'lodash.debounce';

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const navigation = useNavigation();

  const fetchSearchResults = async (searchTerm) => {
    if (!searchTerm) {
      setUserResults([]);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/search?q=${searchTerm}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setUserResults(data.users || []);
      } else {
        console.log('Search failed:', data);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const debouncedSearch = debounce(fetchSearchResults, 300);

  useEffect(() => {
    debouncedSearch(query);
    return () => debouncedSearch.cancel();
  }, [query]);

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => navigation.navigate('UserProfile', { userId: item._id })}
    >
      <Text style={styles.nameText}>
        {item.firstName} {item.lastName}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search for users..."
        value={query}
        onChangeText={setQuery}
        style={styles.searchInput}
      />
      <FlatList
        data={userResults}
        keyExtractor={(item) => item._id}
        renderItem={renderUserItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No users found</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  searchInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#aaa',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  nameText: { fontSize: 18 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16 },
});

export default SearchScreen;