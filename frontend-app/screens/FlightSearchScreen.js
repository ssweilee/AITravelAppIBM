import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { CalendarList } from 'react-native-calendars';

const SUGGESTED_AIRPORTS = [
  { name: 'London Heathrow (LHR)', desc: 'London, UK', icon: 'airplane-outline' },
  { name: 'Paris Charles de Gaulle (CDG)', desc: 'Paris, France', icon: 'airplane-outline' },
  { name: 'Manchester (MAN)', desc: 'Manchester, UK', icon: 'airplane-outline' },
  { name: 'Barcelona El Prat (BCN)', desc: 'Barcelona, Spain', icon: 'airplane-outline' },
  { name: 'New York JFK (JFK)', desc: 'New York, USA', icon: 'airplane-outline' },
];

const FlightSearchScreen = () => {
  const [step, setStep] = useState(0); // 0: From/To, 1: When, 2: Who
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [when, setWhen] = useState(null); // Could be a date range
  const [passengers, setPassengers] = useState({ adults: 1, children: 0, infants: 0 });
  const [selectedDates, setSelectedDates] = useState({}); // { 'YYYY-MM-DD': {selected: true, ...} }

  // UI for step 0: From/To
  const renderFromTo = () => (
    <View style={styles.sectionBox}>
      <Text style={styles.sectionTitle}>From?</Text>
      <TextInput
        style={styles.input}
        placeholder="Departure airport/city"
        value={from}
        onChangeText={setFrom}
      />
      <Text style={styles.sectionTitle}>To?</Text>
      <TextInput
        style={styles.input}
        placeholder="Arrival airport/city"
        value={to}
        onChangeText={setTo}
      />
      <Text style={styles.suggestedTitle}>Suggested airports</Text>
      <FlatList
        data={SUGGESTED_AIRPORTS}
        keyExtractor={item => item.name}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.suggestedRow} onPress={() => setTo(item.name)}>
            <Ionicons name={item.icon} size={24} color="#888" style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.suggestedName}>{item.name}</Text>
              <Text style={styles.suggestedDesc}>{item.desc}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(1)}>
        <Text style={styles.nextBtnText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  // UI for step 1: When
  const renderWhen = () => {
    const selectedDateList = Object.keys(selectedDates).sort();
    return (
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>When?</Text>
        {selectedDateList.length > 0 && (
          <View style={styles.selectedDatesRow}>
            {selectedDateList.map(date => (
              <View key={date} style={styles.selectedDatePill}>
                <Text style={styles.selectedDateText}>{date}</Text>
                <TouchableOpacity onPress={() => setSelectedDates(prev => { const copy = { ...prev }; delete copy[date]; return copy; })}>
                  <Ionicons name="close-circle" size={16} color="#fff" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <View style={styles.calendarCard}>
          <CalendarList
            horizontal
            pagingEnabled
            pastScrollRange={0}
            futureScrollRange={12}
            monthFormat={'MMMM yyyy'}
            style={styles.calendarList}
            calendarWidth={320}
            hideExtraDays={false}
            showScrollIndicator={true}
            onDayPress={day => {
              setSelectedDates(prev => {
                const key = day.dateString;
                if (prev[key]) {
                  const copy = { ...prev };
                  delete copy[key];
                  return copy;
                } else {
                  return {
                    ...prev,
                    [key]: {
                      selected: true,
                      marked: true,
                      selectedColor: '#00C7BE',
                      customStyles: {
                        container: { transform: [{ scale: 1.1 }], backgroundColor: '#00C7BE', borderRadius: 8 },
                        text: { color: '#fff', fontWeight: 'bold' }
                      }
                    }
                  };
                }
              });
            }}
            markedDates={selectedDates}
            markingType={'custom'}
            theme={{
              backgroundColor: '#fff',
              calendarBackground: '#fff',
              textSectionTitleColor: '#222',
              selectedDayBackgroundColor: '#00C7BE',
              selectedDayTextColor: '#fff',
              todayTextColor: '#00C7BE',
              dayTextColor: '#222',
              textDisabledColor: '#ccc',
              dotColor: '#00C7BE',
              selectedDotColor: '#fff',
              arrowColor: '#00C7BE',
              monthTextColor: '#222',
              textMonthFontWeight: 'bold',
              textMonthFontSize: 20,
              textDayFontWeight: '600',
              textDayFontSize: 18,
              textDayHeaderFontWeight: 'bold',
              textDayHeaderFontSize: 14,
              'stylesheet.calendar.header': {
                header: { marginTop: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, marginBottom: 8 },
                monthText: { fontSize: 20, fontWeight: 'bold', color: '#222' },
                week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2, marginBottom: 6 },
              },
            }}
          />
        </View>
        <TouchableOpacity style={styles.nextBtnModern} onPress={() => setStep(2)}>
          <Text style={styles.nextBtnTextModern}>Next</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // UI for step 2: Who
  const renderWho = () => (
    <View style={styles.sectionBox}>
      <Text style={styles.sectionTitle}>Passengers</Text>
      {['adults', 'children', 'infants'].map(type => (
        <View key={type} style={styles.guestRow}>
          <Text style={styles.guestLabel}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
          <View style={styles.guestCounter}>
            <TouchableOpacity onPress={() => setPassengers(g => ({ ...g, [type]: Math.max(0, g[type] - 1) }))}>
              <Ionicons name="remove-circle-outline" size={28} color="#888" />
            </TouchableOpacity>
            <Text style={styles.guestCount}>{passengers[type]}</Text>
            <TouchableOpacity onPress={() => setPassengers(g => ({ ...g, [type]: g[type] + 1 }))}>
              <Ionicons name="add-circle-outline" size={28} color="#007bff" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <TouchableOpacity style={styles.nextBtn} onPress={() => {/* Search action */}}>
        <Text style={styles.nextBtnText}>Search</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabHeader}>
        <TouchableOpacity style={[styles.tab, step === 0 && styles.tabActive]} onPress={() => setStep(0)}>
          <MaterialIcons name="flight" size={24} color={step === 0 ? '#007bff' : '#888'} />
          <Text style={[styles.tabText, step === 0 && styles.tabTextActive]}>From/To</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, step === 1 && styles.tabActive]} onPress={() => setStep(1)}>
          <Ionicons name="calendar-outline" size={24} color={step === 1 ? '#007bff' : '#888'} />
          <Text style={[styles.tabText, step === 1 && styles.tabTextActive]}>When</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, step === 2 && styles.tabActive]} onPress={() => setStep(2)}>
          <Ionicons name="person-outline" size={24} color={step === 2 ? '#007bff' : '#888'} />
          <Text style={[styles.tabText, step === 2 && styles.tabTextActive]}>Who</Text>
        </TouchableOpacity>
      </View>
      {step === 0 && renderFromTo()}
      {step === 1 && renderWhen()}
      {step === 2 && renderWho()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  tabHeader: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, backgroundColor: '#f8f8f8' },
  tab: { alignItems: 'center', flex: 1, paddingVertical: 6 },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#007bff' },
  tabText: { color: '#888', fontSize: 15, marginTop: 2 },
  tabTextActive: { color: '#007bff', fontWeight: 'bold' },
  sectionBox: { backgroundColor: '#fff', borderRadius: 12, margin: 16, padding: 18, elevation: 2 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 },
  suggestedTitle: { fontWeight: 'bold', marginTop: 10, marginBottom: 6, color: '#555' },
  suggestedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  suggestedName: { fontWeight: 'bold', fontSize: 16 },
  suggestedDesc: { color: '#888', fontSize: 13 },
  nextBtn: { backgroundColor: '#007bff', borderRadius: 8, marginTop: 18, alignItems: 'center', paddingVertical: 12 },
  nextBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 18,
    padding: 6,
    alignSelf: 'center',
    maxWidth: 440, // Increased width for larger calendar
    width: '99%',
  },
  calendarList: {
    height: 380,
    minHeight: 340,
    maxHeight: 380,
    width: 400, // Increased width of the calendar grid
    alignSelf: 'center',
  },
  selectedDatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 8,
  },
  selectedDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C7BE',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
    elevation: 1,
  },
  selectedDateText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 2,
  },
  nextBtnModern: {
    backgroundColor: '#00C7BE',
    borderRadius: 24,
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 14,
    shadowColor: '#00C7BE',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  nextBtnTextModern: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  guestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10 },
  guestLabel: { fontSize: 16, color: '#222' },
  guestCounter: { flexDirection: 'row', alignItems: 'center' },
  guestCount: { fontSize: 18, marginHorizontal: 16, minWidth: 24, textAlign: 'center' },
});

export default FlightSearchScreen;
