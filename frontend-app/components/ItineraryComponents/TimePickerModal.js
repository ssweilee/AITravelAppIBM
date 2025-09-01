import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, Text, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const TimePickerModal = ({ visible, onClose, onConfirm, initialTime }) => {
  const [tempTime, setTempTime] = useState(initialTime || new Date());

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        activeOpacity={1}
        onPressOut={onClose}
      >
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 20,
            width: '80%',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>Select Time</Text>

          {Platform.OS === 'ios' ? (
            <>
              <DateTimePicker
                mode="time"
                value={tempTime}
                is24Hour={false}
                display="spinner"
                themeVariant="light" // ensures visible text on white modal
                onChange={(event, selectedTime) => {
                  if (selectedTime) {
                    setTempTime(selectedTime);
                  }
                }}
              />
              <TouchableOpacity
                onPress={() => {
                  onConfirm(tempTime);
                  onClose();
                }}
                style={{ marginTop: 12 }}
              >
                <Text style={{ color: '#007bff', fontWeight: 'bold' }}>Done</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <DateTimePicker
                mode="time"
                value={tempTime}
                is24Hour={false}
                display="default"
                onChange={(event, selectedTime) => {
                  if (event.type === 'set' && selectedTime) {
                    onConfirm(selectedTime);
                  }
                  onClose(); // close whether confirmed or canceled
                }}
              />
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default TimePickerModal;