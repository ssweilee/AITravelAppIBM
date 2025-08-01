import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TOP_CITIES, formatCityDisplay, searchCities } from '../data/cities';

const { height: screenHeight } = Dimensions.get('window');

const SearchableCityDropdown = ({ 
  selectedCity, 
  onCitySelect, 
  placeholder = "Select destination",
  style 
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCities, setFilteredCities] = useState(TOP_CITIES);
  const inputRef = useRef(null);

  const handleSearch = (text) => {
    setSearchTerm(text);
    const filtered = searchCities(text);
    setFilteredCities(filtered);
  };

  const handleCitySelect = (city) => {
    onCitySelect(city);
    setModalVisible(false);
    setSearchTerm('');
    setFilteredCities(TOP_CITIES);
  };

  const openModal = () => {
    setModalVisible(true);
    setSearchTerm('');
    setFilteredCities(TOP_CITIES);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSearchTerm('');
    setFilteredCities(TOP_CITIES);
  };

  const renderCityItem = ({ item }) => (
    <TouchableOpacity
      style={styles.cityItem}
      onPress={() => handleCitySelect(item)}
    >
      <View style={styles.cityInfo}>
        <Text style={styles.cityName}>{item.city}</Text>
        <Text style={styles.countryName}>{item.country}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#666" />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      {/* Main Input Display */}
      <TouchableOpacity
        style={styles.inputContainer}
        onPress={openModal}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.inputText,
          !selectedCity && styles.placeholderText
        ]}>
          {selectedCity ? formatCityDisplay(selectedCity) : placeholder}
        </Text>
        <Ionicons 
          name="chevron-down" 
          size={20} 
          color="#666" 
          style={styles.chevronIcon}
        />
      </TouchableOpacity>

      {/* Modal with Search and List */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={closeModal}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Destination</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              value={searchTerm}
              onChangeText={handleSearch}
              placeholder="Search cities..."
              autoFocus={true}
              returnKeyType="search"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity
                onPress={() => handleSearch('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          {/* Results Count */}
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {filteredCities.length} {filteredCities.length === 1 ? 'city' : 'cities'} found
            </Text>
          </View>

          {/* Cities List */}
          <FlatList
            data={filteredCities}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCityItem}
            showsVerticalScrollIndicator={true}
            style={styles.citiesList}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="location-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No cities found</Text>
                <Text style={styles.emptySubtext}>Try searching with a different term</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    minHeight: 48,
  },
  inputText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  chevronIcon: {
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f8f9fa',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSpacer: {
    width: 32, // Same width as close button for centering
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  citiesList: {
    flex: 1,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  countryName: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default SearchableCityDropdown;