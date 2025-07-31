import React from 'react';
import { View, TextInput, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MessageInput = ({ text, setText, onSend }) => {
  return (
    <View style={styles.inputBarRow}>
      <TouchableOpacity style={styles.iconButton}>
        <Ionicons name="image-outline" size={24} color="#222" />
      </TouchableOpacity>
      <View style={styles.inputWrapper}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          style={styles.textInput}
          placeholderTextColor="#888"
          multiline
          returnKeyType="send"
          blurOnSubmit={false}
        />
      </View>
      <TouchableOpacity
        style={styles.sendButton}
        onPress={onSend}
        disabled={!text.trim()}
        activeOpacity={0.8}
      >
        <Ionicons name="send" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  inputBarRow: {
    flexDirection: 'row',
    alignItems: 'center', // changed from 'flex-end' to 'center' for perfect alignment
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingHorizontal: 10,
    paddingVertical: 8,
    margin: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    borderWidth: 1,
    borderColor: '#eee',
  },
  inputWrapper: {
    flex: 1,
    marginRight: 6,
    borderRadius: 18,
    backgroundColor: '#f7f7f7',
    paddingHorizontal: 10,
    paddingVertical: 2,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 16,
    minHeight: 36,
    maxHeight: 100,
    color: '#222',
    backgroundColor: 'transparent',
    paddingVertical: 6,
    paddingRight: 0,
  },
  iconButton: {
    padding: 6,
    marginRight: 2,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  sendButton: {
    backgroundColor: '#00c7be',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginLeft: 2,
    opacity: 1,
  },
});

export default MessageInput;