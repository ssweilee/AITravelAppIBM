import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const TripDateModal = ({
  visible,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  onClose,
  styles,
}) => {
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // keep endDate >= startDate
  useEffect(() => {
    if (startDate > endDate) {
      setEndDate(new Date(startDate));
    }
  }, [startDate]);

  const handleStartChange = (event, date) => {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (event.type === 'dismissed') return;
    if (date) {
      setStartDate(date);
    }
  };

  const handleEndChange = (event, date) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (event.type === 'dismissed') return;
    if (date) {
      if (date < startDate) {
        setEndDate(new Date(startDate));
      } else {
        setEndDate(date);
      }
    }
  };

  const format = (d) => {
    if (!d) return '';
    return d.toLocaleDateString('en-UK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { alignItems: 'stretch' }]}>
          <Text style={styles.modalTitle}>Trip Dates</Text>

          {/* Start date */}
          <View style={{ marginTop: 12, marginBottom: 8 }}>
            <Text style={{ fontWeight: '600', marginBottom: 4 }}>Start</Text>
            <TouchableOpacity
              style={{
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#ccc',
                backgroundColor: '#f9f9f9',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onPress={() => {
                setShowStartPicker((v) => !v);
                setShowEndPicker(false);
              }}
            >
              <Text>{format(startDate)}</Text>
              <Text>▼</Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={handleStartChange}
                maximumDate={new Date(2100, 0, 1)}
              />
            )}
          </View>

          {/* End date */}
          <View style={{ marginTop: 4, marginBottom: 12 }}>
            <Text style={{ fontWeight: '600', marginBottom: 4 }}>End</Text>
            <TouchableOpacity
              style={{
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#ccc',
                backgroundColor: '#f9f9f9',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onPress={() => {
                setShowEndPicker((v) => !v);
                setShowStartPicker(false);
              }}
            >
              <Text>{format(endDate)}</Text>
              <Text>▼</Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                onChange={handleEndChange}
                minimumDate={startDate}
                maximumDate={new Date(2100, 0, 1)}
              />
            )}
          </View>

          <TouchableOpacity
            style={[styles.modalCloseButton, { marginTop: 12 }]}
            onPress={onClose}
          >
            <Text style={styles.modalCloseButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default TripDateModal;