// AIAssistantScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { API_BASE_URL } from '../config';
import { useNavigation } from '@react-navigation/native';

// Helper: detect if user is asking for an itinerary
function isItineraryRequest(text) {
  return /itinerar(y|ies)|plan.*trip|travel plan|schedule/i.test(text);
}

export default function AIAssistantScreen() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am your travel AI assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastItinerary, setLastItinerary] = useState(null);
  const navigation = useNavigation();

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    let aiMessages = newMessages;
    let expectingItinerary = false;
    let requestedDays = 1;
    // Try to extract number of days from user input
    const dayMatch = input.match(/(\d+)\s*(day|days)/i);
    if (dayMatch) {
      requestedDays = Math.max(1, parseInt(dayMatch[1], 10));
    }
    if (isItineraryRequest(input)) {
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
      //const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        const res = await fetch(`${API_BASE_URL}/api/ai/watsonx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // body: JSON.stringify({
        //   messages: aiMessages.map(m => ({ role: m.role, content: m.content }))
        // })
        body: JSON.stringify({
            prompt: aiMessages.map(m => m.content).join('\n')
        })
      });
      const data = await res.json();
      //let aiReply = data.choices?.[0]?.message?.content || 'Sorry, I could not process that.';
      let aiReply = data.results?.[0]?.generated_text || 'Sorry, I could not process that.';
      //console.log('AI RAW REPLY:', aiReply); // <-- Debug log
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
      //console.log('AI PARSED JSON:', parsed); // <-- Debug log
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
        setMessages([...newMessages, { role: 'assistant', content: '[AI generated itinerary ready for import!]' }]);
      } else {
        setLastItinerary(null);
        setMessages([...newMessages, { role: 'assistant', content: aiReply }]);
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: 'Error contacting AI.' }]);
      setLastItinerary(null);
    }
    setLoading(false);
  };

  const handleUseForItinerary = () => {
    if (lastItinerary) {
      navigation.navigate('CreateItinerary', { aiItinerary: lastItinerary });
    }
  };

  // Find the last assistant message
  const lastAIReply = messages.length > 0 ? messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content : '';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.chat} contentContainerStyle={{ padding: 16 }}>
        {messages.map((msg, idx) => (
          <View key={idx} style={[styles.bubble, msg.role === 'user' ? styles.user : styles.assistant]}>
            <Text style={styles.text}>{msg.content}</Text>
          </View>
        ))}
        {loading && <ActivityIndicator size="small" color="#00C7BE" style={{ marginTop: 8 }} />}
      </ScrollView>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask me anything about travel..."
        />
        <Button title="Send" onPress={sendMessage} disabled={loading} />
      </View>
      {/* Show import button if a valid itinerary is available */}
      {lastItinerary && (
        <View style={{ padding: 8 }}>
          <Button title="Import Itinerary" onPress={handleUseForItinerary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  chat: { flex: 1 },
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
  text: { fontSize: 16 },
  inputRow: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
});
