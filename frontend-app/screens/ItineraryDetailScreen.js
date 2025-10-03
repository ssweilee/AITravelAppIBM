// ItineraryDetailScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, StatusBar } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const dummyImage = 'https://via.placeholder.com/1200x600/1F2A37/FFFFFF?text=Itinerary+Cover';

const ItineraryDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { itinerary } = route.params;

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const weekdayByOffset = (start, offset) => {
    const d = new Date(start);
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString('en-GB', { weekday: 'long' });
  };

  const handleCopyAndEdit = () => {
    navigation.navigate('CreateItinerary', {
      cloneItinerary: itinerary, // pass the full itinerary to prefill
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <View style={styles.heroWrap}>
        <Image
          source={{ uri: itinerary.coverImage || dummyImage }}
          style={styles.image}
        />
        <View style={styles.heroOverlay} />

        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 8 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>

        <View style={styles.heroTextBlock}>
          <Text style={styles.title} numberOfLines={2}>{itinerary.title}</Text>
          <View style={styles.heroChips}>
            <View style={[styles.chip, styles.chipPrimary]}>
              <Ionicons name="location-outline" size={14} color="#0A4D47" />
              <Text style={[styles.chipText, { color: '#0A4D47' }]} numberOfLines={1}>
                {itinerary.destination}
              </Text>
            </View>
            <View style={styles.chip}>
              <Ionicons name="calendar-outline" size={14} color="#187E77" />
              <Text style={styles.chipText} numberOfLines={1}>
                {formatDate(itinerary.startDate)} – {formatDate(itinerary.endDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Copy & Edit button on hero */}
        <TouchableOpacity style={[styles.copyFab, { top: insets.top + 8 }]} onPress={handleCopyAndEdit}>
          <Ionicons name="copy-outline" size={16} color="#0A4D47" />
          <Text style={styles.copyFabText}>Copy & Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {itinerary.description ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Overview</Text>
            <Text style={styles.description}>{itinerary.description}</Text>
          </View>
        ) : null}

        {Array.isArray(itinerary.days) && itinerary.days.map((day, idx) => (
          <View key={idx} style={styles.card}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayPill}>
                {`Day ${idx + 1} • ${weekdayByOffset(itinerary.startDate, idx)}`}
              </Text>
            </View>

            <View style={styles.timeline}>
              {Array.isArray(day.activities) && day.activities.map((activity, i) => (
                <View key={i} style={styles.timelineRow}>
                  <View style={styles.timelineCol}>
                    <View style={styles.dot} />
                    {i !== day.activities.length - 1 && <View style={styles.line} />}
                  </View>
                  <View style={styles.activityCard}>
                    <View style={styles.activityTopRow}>
                      <View style={styles.timePill}>
                        <Ionicons name="time-outline" size={12} color="#0D3B66" />
                        <Text style={styles.timeText}>{activity.time || '—'}</Text>
                      </View>
                      {activity.location ? (
                        <View style={styles.locPill}>
                          <Ionicons name="location-outline" size={12} color="#0A4D47" />
                          <Text style={styles.locText} numberOfLines={1}>{activity.location}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.activityText}>{activity.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            {day.notes ? (
              <View style={styles.notesWrap}>
                <Ionicons name="information-circle-outline" size={16} color="#187E77" />
                <Text style={styles.notesText}>{day.notes}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6FBFB' },

  // Hero
  heroWrap: { position: 'relative', backgroundColor: '#1F2A37' },
  image: { width: '100%', height: 240, backgroundColor: '#1F2A37' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backBtn: {
    position: 'absolute',
    left: 10,
  },

  //floating copy button
  copyFab: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D7F4F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderColor: '#BAE7E4',
    borderWidth: 1,
  },
  copyFabText: { color: '#0A4D47', fontWeight: '700', fontSize: 12 },

  heroTextBlock: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#E6F2F1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipPrimary: {
    backgroundColor: '#D7F4F2',
    borderWidth: 1,
    borderColor: '#BAE7E4',
  },
  chipText: { color: '#187E77', fontSize: 12, fontWeight: '600' },

  // Content
  container: { flex: 1 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E6F2F1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#187E77',
    marginBottom: 6,
  },
  description: { fontSize: 15, color: '#222' },

  // Day section
  dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dayPill: {
    backgroundColor: '#E0F7FA',
    color: '#0A4D47',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    fontWeight: '700',
    fontSize: 12,
  },

  // Timeline
  timeline: { marginTop: 6 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  timelineCol: { width: 18, alignItems: 'center' },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#00C7BE', marginTop: 6,
  },
  line: {
    width: 2, flex: 1, backgroundColor: '#DCEBFF', marginTop: 4,
  },
  activityCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  activityTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  timePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E7F0FF',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    marginRight: 8,
  },
  timeText: { fontSize: 12, color: '#0D3B66', fontWeight: '700' },
  locPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E6F2F1',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
  },
  locText: { fontSize: 12, color: '#0A4D47', fontWeight: '700' },
  activityText: { fontSize: 15, color: '#222' },

  notesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#F2FFFD',
    borderWidth: 1,
    borderColor: '#D9F7F3',
    padding: 10,
    borderRadius: 12,
  },
  notesText: { color: '#187E77', fontSize: 14 },
});

export default ItineraryDetailScreen;