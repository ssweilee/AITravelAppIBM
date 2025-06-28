import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GlobalStyles from '../GlobalStyles';
import { API_BASE_URL } from '../config';

const INTEREST_OPTIONS = [
    'Beach',
    'Mountains',
    'City Life',
    'Culture',
    'Food',
    'History',
    'Adventure',
    'Relaxation',
    'Nightlife',
    'Nature',
  ];
  
function InterestScreen() {
  const navigation = useNavigation();

  const [interests, setInterests] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/interests`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setInterests(data);
        } else if (Array.isArray(data.interests)) {
          setInterests(data.interests);
        } else {
          console.warn('Unexpected format:', data);
          setInterests([]);
        }
      } catch (error) {
        console.error('Failed to load interests:', error);
        setInterests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInterests();
  }, []);

  const toggleInterest = (interest) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleContinue = async () => {
    await AsyncStorage.setItem('hasSelectedInterests', 'true');
    navigation.navigate('Main', { screen: 'Home' });
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('hasSelectedInterests', 'true');
    navigation.navigate('Main', { screen: 'Home' });
  };

  return (
    <ScrollView contentContainerStyle={[GlobalStyles.center, styles.container]}>
      <Text style={styles.header}>What are you interested in?</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#00C7BE" />
      ) : (
        <View style={styles.grid}>
          {INTEREST_OPTIONS.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => toggleInterest(item)}
              style={[
                styles.option,
                selectedInterests.includes(item) && styles.optionSelected
              ]}
            >
              <Text style={styles.optionText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!loading && (
        <>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    justifyContent: 'flex-start',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 16,
    color: '#00C7BE',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  option: {
    borderWidth: 1,
    borderColor: '#00C7BE',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    margin: 6,
    backgroundColor: '#fff',
  },
  optionSelected: {
    backgroundColor: '#00C7BE',
  },
  optionText: {
    color: '#333',
    fontSize: 16,
  },
  continueButton: {
    backgroundColor: '#00C7BE',
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  continueText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  skipText: {
    marginTop: 10,
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    textDecorationLine: 'underline',
  }
});

export default InterestScreen;
