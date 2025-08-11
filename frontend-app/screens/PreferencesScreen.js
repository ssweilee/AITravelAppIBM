import React, { useState, useEffect } from 'react';
import { View, Text, Button, TextInput, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { PREDEFINED_TAGS } from '../data/tags';
import { getUserProfile, updateUserProfile } from '../services/userService';
import SearchableCityDropdown from '../components/SearchableCityDropdown';
import { TOP_CITIES, formatCityDisplay } from '../data/cities';

const PreferencesScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [travelStyle, setTravelStyle] = useState('');
  const [tags, setTags] = useState([]);
  const [budget, setBudget] = useState('');
  const [selectedDestinations, setSelectedDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(null);

  useEffect(() => {
    // Fetch user profile and populate fields
    getUserProfile(navigation).then(profile => {
      setCurrentProfile({
        travelStyle: profile.travelStyle || '',
        tags: Array.isArray(profile.tags) ? profile.tags : [],
        avgBudget: profile.avgBudget ? String(profile.avgBudget) : '',
        recentDestinations: Array.isArray(profile.recentDestinations) ? profile.recentDestinations : [],
      });
      setTravelStyle(profile.travelStyle || '');
      setTags(Array.isArray(profile.tags) ? profile.tags : []);
      setBudget(profile.avgBudget ? String(profile.avgBudget) : '');
      setSelectedDestinations(Array.isArray(profile.recentDestinations) ? profile.recentDestinations.map(dest => {
        // Try to match to city object, fallback to string
        const cityObj = TOP_CITIES.find(c => formatCityDisplay(c) === dest);
        return cityObj || dest;
      }) : []);
      setLoading(false);
    }).catch((err) => {
      if (err && err.status === 403 && navigation) navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      setLoading(false);
    });
  }, []);

  const toggleTag = (tag) => {
    setTags(tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const tagsObj = {};
      tags.forEach(tag => { if (tag) tagsObj[tag] = 1; });
      const updatedProfile = {
        travelStyle,
        tags: tagsObj,
        avgBudget: Number(budget),
        recentDestinations: selectedDestinations.map(dest => typeof dest === 'string' ? dest : formatCityDisplay(dest)),
      };
      console.log('[PreferencesScreen] Submitting updatedProfile:', updatedProfile);
      await updateUserProfile(updatedProfile, navigation);
      const newProfile = await getUserProfile(navigation);
      console.log('[PreferencesScreen] Re-fetched profile after save:', newProfile);
      setCurrentProfile(newProfile);
      setTravelStyle(newProfile.travelStyle || '');
      setTags(Array.isArray(newProfile.tags) ? newProfile.tags : []);
      setBudget(newProfile.avgBudget ? String(newProfile.avgBudget) : '');
      setSelectedDestinations(Array.isArray(newProfile.recentDestinations) ? newProfile.recentDestinations.map(dest => {
        const cityObj = TOP_CITIES.find(c => formatCityDisplay(c) === dest);
        return cityObj || dest;
      }) : []);
      const refreshTs = Date.now();
      // Optional callback pattern if parent passed one
      if (route.params?.onSaved) {
        try {
          route.params.onSaved({ refreshTs, profile: newProfile });
        } catch (cbErr) {
          console.log('[PreferencesScreen] onSaved callback error:', cbErr);
        }
      }
      // Simply go back; RecommendationScreen refetches on focus
      navigation.goBack();
    } catch (e) {
      console.log('[PreferencesScreen] Save error:', e?.message || e);
      if (e && e.status === 403 && navigation) navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><Text>Loading...</Text></View>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Current Preferences</Text>
      {currentProfile && (
        <View style={{ marginBottom: 16, backgroundColor: '#f2f2f2', borderRadius: 8, padding: 12 }}>
          <Text>Travel Style: {currentProfile.travelStyle || 'None'}</Text>
          <Text>Tags: {Array.isArray(currentProfile.tags) ? currentProfile.tags.join(', ') : 'None'}</Text>
          <Text>Avg Budget: {currentProfile.avgBudget || 'None'}</Text>
          <Text>Destinations: {Array.isArray(currentProfile.recentDestinations) ? currentProfile.recentDestinations.join(', ') : 'None'}</Text>
        </View>
      )}
      <Text style={styles.label}>Travel Style</Text>
      <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginTop: 8, marginBottom: 8 }}>
        <Picker
          selectedValue={travelStyle}
          onValueChange={setTravelStyle}
        >
          <Picker.Item label="Select a style" value="" />
          <Picker.Item label="Budget" value="budget" />
          <Picker.Item label="Luxury" value="luxury" />
          <Picker.Item label="Family" value="family" />
          <Picker.Item label="Adventure" value="adventure" />
        </Picker>
      </View>
      <Text style={styles.label}>Interests/Tags</Text>
      <View style={styles.tagsContainer}>
        {PREDEFINED_TAGS.map(tagObj => {
          const tag = tagObj.tag;
          return (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, tags.includes(tag) && styles.tagSelected]}
              onPress={() => toggleTag(tag)}
            >
              <Text style={tags.includes(tag) ? styles.tagTextSelected : styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.label}>Average Budget (USD)</Text>
      <TextInput
        style={styles.input}
        value={budget}
        onChangeText={setBudget}
        placeholder="e.g. 1500"
        keyboardType="numeric"
      />
      <Text style={styles.label}>Favorite Destinations</Text>
      <SearchableCityDropdown
        selectedCity={null}
        onCitySelect={city => {
          if (!selectedDestinations.some(d => (typeof d === 'object' ? d.id : d) === city.id)) {
            setSelectedDestinations([...selectedDestinations, city]);
          }
        }}
        placeholder="Add a destination"
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 }}>
        {selectedDestinations.map((dest, idx) => (
          <View key={typeof dest === 'object' ? dest.id : dest} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eee', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, margin: 4 }}>
            <Text>{typeof dest === 'object' ? formatCityDisplay(dest) : dest}</Text>
            <TouchableOpacity onPress={() => setSelectedDestinations(selectedDestinations.filter((_, i) => i !== idx))}>
              <Text style={{ marginLeft: 6, color: '#888', fontWeight: 'bold' }}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <Button title={saving ? "Saving..." : "Save Preferences"} onPress={handleSave} disabled={saving} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  label: { fontWeight: 'bold', marginTop: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginTop: 8 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 10 },
  tag: { backgroundColor: '#eee', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, margin: 4 },
  tagSelected: { backgroundColor: '#007AFF' },
  tagText: { color: '#333' },
  tagTextSelected: { color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default PreferencesScreen;