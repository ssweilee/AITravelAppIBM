// AIAssistantScreen.js
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity,
  StyleSheet, 
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config';
import { useNavigation } from '@react-navigation/native';

// Helper: detect if user is asking for an itinerary
function isItineraryRequest(text) {
  return /itinerar(y|ies)|plan.*trip|travel plan|schedule/i.test(text);
}

// Move AIMessageInput outside the main component
const AIMessageInput = React.memo(({ input, setInput, loading, onSend }) => (
  <View style={styles.inputContainer}>
    <TextInput
      style={styles.input}
      value={input}
      onChangeText={setInput}
      placeholder="Ask me anything about travel..."
      multiline={true}
      maxLength={500}
      textAlignVertical="top"
      returnKeyType="default"
      blurOnSubmit={false}
    />
    <TouchableOpacity 
      style={[styles.sendButton, loading && styles.sendButtonDisabled]} 
      onPress={onSend} 
      disabled={loading}
    >
      <Text style={styles.sendButtonText}>Send</Text>
    </TouchableOpacity>
  </View>
));

// Memoize the message component
const MessageBubble = React.memo(({ item }) => (
  <View style={[styles.bubble, item.role === 'user' ? styles.user : styles.assistant]}>
    <Text style={[styles.text, item.role === 'user' && styles.userText]}>{item.content}</Text>
  </View>
));

export default function AIAssistantScreen() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am your travel AI assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastItinerary, setLastItinerary] = useState(null);
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();

  // Memoize the sendMessage function
  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    
    let aiMessages = newMessages;
    let expectingItinerary = false;
    let requestedDays = 1;
    // Try to extract number of days from user input
    const dayMatch = userMessage.match(/(\d+)\s*(day|days)/i);
    if (dayMatch) {
      requestedDays = Math.max(1, parseInt(dayMatch[1], 10));
    }
    if (isItineraryRequest(userMessage)) {
      expectingItinerary = true;
      aiMessages = [
        {
          role: 'system',
          content:
            'If the user asks for an itinerary, respond ONLY with a valid JSON object matching this schema: { "title": string, "description": string (max 500 chars), "destination": string, "days": [ { "notes": string, "activities": [ { "description": string, "location": string } ] } ] }. Do not include any extra text or markdown. If the user asks a normal question, answer normally.'
        },
        ...newMessages
      ];
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/watsonx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt: aiMessages.map(m => m.content).join('\n')
        })
      });
      const data = await res.json();
      let aiReply = data.results?.[0]?.generated_text || 'Sorry, I could not process that.';
      console.log('Watsonx raw response:', data);
      let parsed = null;
      if (expectingItinerary) {
        try {
            // Extract JSON substring if extra text is present before the JSON
            const jsonStart = aiReply.indexOf('{');
            const jsonEnd = aiReply.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            const jsonString = aiReply.substring(jsonStart, jsonEnd + 1);
            parsed = JSON.parse(jsonString);
            } else {
            parsed = JSON.parse(aiReply);
            }
        } catch {}
      }
      // --- Normalization logic for AI itinerary import ---
      function normalizeItinerary(it, requestedDays) {
        if (!it) return null;
        const safeTitle = it.title || 'Trip';
        const safeDesc = it.description || '';
        const safeDest = it.destination || '';
        let days = Array.isArray(it.days) ? it.days.slice(0, requestedDays) : [];
        // If days missing or not enough, create default days
        for (let i = days.length; i < requestedDays; i++) {
          days.push({
            date: `Day ${i + 1}`,
            notes: '',
            activities: [{
              time: '',
              description: `Explore ${safeDest || 'destination'}`,
              location: safeDest
            }]
          });
        }
        // For each day, ensure at least one activity
        days = days.map((d, idx) => {
          let acts = Array.isArray(d.activities) ? d.activities : [];
          if (acts.length === 0) {
            acts = [{
              time: '',
              description: `Explore ${safeDest || 'destination'}`,
              location: safeDest
            }];
          } else {
            // Fill missing location/activity fields
            acts = acts.map(a => ({
              time: a.time || '',
              description: a.description || `Activity in ${safeDest}`,
              location: a.location || safeDest
            }));
          }
          return {
            date: d.date || `Day ${idx + 1}`,
            notes: d.notes || '',
            activities: acts
          };
        });
        return {
          title: safeTitle,
          description: safeDesc,
          destination: safeDest,
          days
        };
      }
      if (parsed && parsed.title && parsed.days) {
        const normalized = normalizeItinerary(parsed, requestedDays);
        setLastItinerary(normalized);
        setMessages(prev => [...newMessages, { role: 'assistant', content: '[AI generated itinerary ready for import!]' }]);
      } else {
        setLastItinerary(null);
        setMessages(prev => [...newMessages, { role: 'assistant', content: aiReply }]);
      }
    } catch (err) {
      setMessages(prev => [...newMessages, { role: 'assistant', content: 'Error contacting AI.' }]);
      setLastItinerary(null);
    }
    setLoading(false);
  }, [input, messages]);

  const handleUseForItinerary = useCallback(() => {
    if (lastItinerary) {
      navigation.navigate('CreateItinerary', { aiItinerary: lastItinerary });
    }
  }, [lastItinerary, navigation]);

  // Memoize renderMessage with proper dependencies
  const renderMessage = useCallback(({ item }) => (
    <MessageBubble item={item} />
  ), []);

  const keyExtractor = useCallback((item, index) => `message-${index}-${item.content.slice(0, 10)}`, []);

  // Memoize the footer component
  const ListFooter = useMemo(() => (
    <View>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#00C7BE" />
        </View>
      )}
      {lastItinerary && (
        <View style={styles.importButtonContainer}>
          <TouchableOpacity style={styles.importButton} onPress={handleUseForItinerary}>
            <Text style={styles.importButtonText}>Import Itinerary</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  ), [loading, lastItinerary, handleUseForItinerary]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.top + 64) : 84}
    >
      <View style={{ flex: 1, flexDirection: 'column' }}>
        <KeyboardAwareFlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 10, paddingBottom: 16, flexGrow: 1 }}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          extraHeight={0}
          enableOnAndroid={true}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          keyboardOpeningTime={0}
          removeClippedSubviews={false}
          windowSize={10}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          ListFooterComponent={ListFooter}
        />
        <View style={{ backgroundColor: '#fff', paddingBottom: insets.bottom }}>
          <AIMessageInput 
            input={input}
            setInput={setInput}
            loading={loading}
            onSend={sendMessage}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: '#00C7BE',
  },
  assistant: {
    alignSelf: 'flex-start',
    backgroundColor: '#eee',
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
  userText: {
    color: '#fff',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  importButtonContainer: {
    marginVertical: 16,
    alignItems: 'center',
  },
  importButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    fontSize: 16,
    backgroundColor: '#fff',
    maxHeight: 120,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#00C7BE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});