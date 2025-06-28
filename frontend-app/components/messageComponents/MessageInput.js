import React from 'react';
import { View, TextInput, Button, StyleSheet, Platform } from 'react-native';

const MessageInput = ({ text, setText, onSend }) => {
  return (
    <View style={styles.inputContainer}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Type your message..."
        style={styles.textInput}    
      
      />
      <Button title="Send" onPress={onSend} />
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 10 : 0,
    paddingHorizontal: 8,
    marginBottom: 40
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginRight: 10,
    borderRadius: 5
  }
});

export default MessageInput;