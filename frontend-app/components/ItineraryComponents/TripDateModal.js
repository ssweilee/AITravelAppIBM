// TripDateModal.js
import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const TripDateModal = ({
  visible,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  onClose,
  styles
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { alignItems: 'center' }]}>
          <Text style={styles.modalTitle}>When does your trip start?</Text>
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              if (date) setStartDate(date);
            }}
            style={{ width: '100%' }}
          />
          <TouchableOpacity
            style={[styles.modalCloseButton, { marginTop: 24 }]}
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