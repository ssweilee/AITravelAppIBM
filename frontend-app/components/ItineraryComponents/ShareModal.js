// ShareModal.js
import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ShareModal = ({
  visible,
  onClose,
  onConfirm,
  users,
  selectedFollowers,
  toggleSelectFollower,
  styles
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Share with Followers & Following</Text>
          <FlatList
            data={users}
            keyExtractor={item => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalUserRow}
                onPress={() => toggleSelectFollower(item._id)}
                activeOpacity={0.7}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitials}>{(item.firstName?.[0] || '') + (item.lastName?.[0] || '')}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.modalUserName}>{item.firstName} {item.lastName}</Text>
                </View>
                <View style={styles.checkboxBox}>
                  <View style={[styles.checkbox, selectedFollowers.includes(item._id) && styles.checkboxChecked]}>
                    {selectedFollowers.includes(item._id) && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 10 }}>No followers or followings to share with.</Text>}
          />
          <TouchableOpacity style={styles.modalCloseButton} onPress={onConfirm}>
            <Text style={styles.modalCloseButtonText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalCloseButton, { backgroundColor: '#ccc', marginTop: 8 }]}
            onPress={onClose}
          >
            <Text style={[styles.modalCloseButtonText, { color: '#222' }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ShareModal;