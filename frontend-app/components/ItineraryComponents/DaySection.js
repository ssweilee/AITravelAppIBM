// DaySection.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TimePickerModal from './TimePickerModal';

const DaySection = ({
  day,
  idx,
  isExpanded,
  displayDate,
  handleActivityChange,
  handleRemoveActivity,
  handleAddActivity,
  handleDayChange,
  handleRemoveDay,
  setExpandedDayIndex,
  days,
  styles
}) => {

  const [timePickerInfo, setTimePickerInfo] = useState({ show: false, dayIdx: null, actIdx: null });

  return (
    <TouchableOpacity
      key={idx}
      style={styles.dayBlock}
      onPress={() => setExpandedDayIndex(prev => (prev === idx ? -1 : idx))}
      activeOpacity={0.9}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.dayTitle}>
          {isExpanded ? '▼' : '▶'} Day {idx + 1}: {displayDate}
        </Text>
        {isExpanded && days.length > 1 && (
          <TouchableOpacity onPress={() => handleRemoveDay(idx)}>
            <Ionicons name="trash-outline" size={22} color="#fa3e3e" />
          </TouchableOpacity>
        )}
      </View>

      {isExpanded && (
        <>
          <Text style={styles.activitiesLabel}>Activities</Text>
          {day.activities.map((activity, actIdx) => (
            <View key={actIdx} style={{ marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => setTimePickerInfo({ show: true, dayIdx: idx, actIdx })}
                style={[styles.input, { marginBottom: 6 }]}
              >
                <Text style={{ color: activity.time ? '#000' : '#999' }}>
                  {activity.time || 'Select Time'}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { marginBottom: 6 }]}
                placeholder="Activity Description"
                value={activity.description}
                onChangeText={v => handleActivityChange(idx, actIdx, 'description', v)}
              />
              <TextInput
                style={[styles.input, { marginBottom: 6 }]}
                placeholder="Location"
                value={activity.location}
                onChangeText={v => handleActivityChange(idx, actIdx, 'location', v)}
              />
              {day.activities.length > 1 && (
                <TouchableOpacity onPress={() => handleRemoveActivity(idx, actIdx)}>
                  <Ionicons name="remove-circle" size={22} color="#fa3e3e" />
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addActivityBtn} onPress={() => handleAddActivity(idx)}>
            <Ionicons name="add-circle" size={20} color="#007bff" />
            <Text style={styles.addActivityText}>Add Activity</Text>
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Notes for this day (optional)"
            value={day.notes}
            onChangeText={v => handleDayChange(idx, 'notes', v)}
            multiline
          />
        </>
      )}

      <TimePickerModal
        visible={timePickerInfo.show}
        initialTime={new Date()}
        onClose={() => setTimePickerInfo({ show: false, dayIdx: null, actIdx: null })}
        onConfirm={(selectedTime) => {
          const formattedTime = selectedTime.toLocaleTimeString('en-UK', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });

          handleActivityChange(
            timePickerInfo.dayIdx,
            timePickerInfo.actIdx,
            'time',
            formattedTime
          );

          setTimePickerInfo({ show: false, dayIdx: null, actIdx: null });
        }}
      />
    </TouchableOpacity>
  );
};

export default DaySection;