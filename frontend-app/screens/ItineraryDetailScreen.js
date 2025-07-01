import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useRoute } from '@react-navigation/native';

const dummyImage = 'https://via.placeholder.com/600x300.png?text=Trip+Cover';

const ItineraryDetailScreen = () => {
  const route = useRoute();
  const { itinerary } = route.params;

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-UK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: itinerary.coverImage || dummyImage }} style={styles.image} />

      <View style={styles.header}>
        <Text style={styles.title}>{itinerary.title}</Text>
        <Text style={styles.destination}>{itinerary.destination}</Text>
        <Text style={styles.dates}>
          {formatDate(itinerary.startDate)} – {formatDate(itinerary.endDate)}
        </Text>
        {itinerary.description ? <Text style={styles.description}>{itinerary.description}</Text> : null}
      </View>

      {itinerary.days?.map((day, idx) => (
        <View key={idx} style={styles.daySection}>
          <Text style={styles.dayTitle}>Day {idx + 1}: {day.day}</Text>
          {day.activities.map((activity, i) => (
            <View key={i} style={styles.activity}>
              <Text style={styles.activityTime}>{activity.time}</Text>
              <Text style={styles.activityText}>{activity.description}</Text>
              {activity.location ? <Text style={styles.activityLocation}>@ {activity.location}</Text> : null}
            </View>
          ))}
          {day.notes ? <Text style={styles.notes}>Notes: {day.notes}</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', flex: 1 },
  image: { width: '100%', height: 200 },
  header: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 6 },
  destination: { fontSize: 18, color: '#555' },
  dates: { fontSize: 16, color: '#777', marginBottom: 10 },
  description: { fontSize: 16, marginTop: 6 },
  daySection: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderColor: '#eee' },
  dayTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  activity: { marginBottom: 6 },
  activityTime: { fontWeight: 'bold', color: '#007bff' },
  activityText: { fontSize: 16 },
  activityLocation: { fontSize: 14, color: '#555' },
  notes: { marginTop: 8, fontStyle: 'italic', color: '#444' },
});

export default ItineraryDetailScreen;